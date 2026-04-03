"""FastAPI dependency — authenticate project via API key."""

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import PROJECT_KEY_PREFIX, hash_key
from src.models.models import Project

security = HTTPBearer()


async def get_project(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Authenticate via project API key. Returns the Project."""
    token = credentials.credentials

    if not token.startswith(PROJECT_KEY_PREFIX):
        raise HTTPException(status_code=401, detail="Invalid API key format. Expected aid_proj_...")

    key_hash = hash_key(token)
    result = await db.execute(
        select(Project).where(Project.api_key_hash == key_hash)
    )
    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(status_code=401, detail="Invalid API key")

    return project
