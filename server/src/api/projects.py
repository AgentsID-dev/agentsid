"""Project management routes.

Project creation requires Supabase Auth — users must be signed in.
"""

import secrets

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer()

from src.core.config import settings
from src.core.database import get_db
from src.core.security import generate_project_key, hash_key, encrypt_api_key, decrypt_api_key
from src.models.models import Project

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ProjectResponse(BaseModel):
    id: str
    name: str
    plan: str
    created_at: str


class ProjectCreated(BaseModel):
    project: ProjectResponse
    api_key: str  # shown once


def _gen_project_id() -> str:
    return "proj_" + secrets.token_urlsafe(12)


async def _verify_supabase_user(token: str) -> dict:
    """Verify a Supabase JWT and return user info."""
    if not settings.supabase_url or not settings.supabase_anon_key:
        if not settings.debug_mode:
            raise HTTPException(status_code=503, detail="Authentication service not configured")
        return {"email": "dev@local", "id": "dev_user"}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_anon_key,
            },
        )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in.")

    return response.json()


@router.post("/", response_model=ProjectCreated, status_code=201)
@limiter.limit("5/minute")
async def create_project(
    request: Request,
    data: ProjectCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project, or return existing one for this user."""
    # Verify the user is signed in
    user = await _verify_supabase_user(credentials.credentials)
    email = user.get("email", "")

    # Check if user already has a project — return it with a fresh key
    existing = await db.execute(
        select(Project).where(Project.owner_email == email).limit(1)
    )
    existing_project = existing.scalar_one_or_none()

    if existing_project:
        # Project exists — return the same stable key (decrypted from storage).
        raw_key = ""
        if existing_project.api_key_encrypted:
            try:
                raw_key = decrypt_api_key(existing_project.api_key_encrypted)
            except Exception:
                pass
        # If no encrypted key stored (legacy), rotate and store it
        if not raw_key:
            raw_key, key_hash = generate_project_key()
            existing_project.api_key_hash = key_hash
            existing_project.api_key_encrypted = encrypt_api_key(raw_key)
            await db.commit()
            await db.refresh(existing_project)
        return ProjectCreated(
            project=ProjectResponse(
                id=existing_project.id,
                name=existing_project.name,
                plan=existing_project.plan,
                created_at=str(existing_project.created_at),
            ),
            api_key=raw_key,
        )

    # No existing project — create a new one
    project_id = _gen_project_id()
    raw_key, key_hash = generate_project_key()

    project = Project(
        id=project_id,
        name=data.name,
        api_key_hash=key_hash,
        api_key_encrypted=encrypt_api_key(raw_key),
        owner_email=email,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return ProjectCreated(
        project=ProjectResponse(
            id=project.id,
            name=project.name,
            plan=project.plan,
            created_at=str(project.created_at),
        ),
        api_key=raw_key,
    )
