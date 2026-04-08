"""Team management routes.

Team operations authenticate via project API key (same as all other endpoints).
The user's identity is derived from project.owner_email.
"""

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.auth_dep import get_project
from src.core.database import get_db
from src.models.models import Project, Team, TeamMember

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/teams", tags=["teams"])

VALID_ROLES = {"owner", "admin", "member", "viewer"}


def _gen_team_id() -> str:
    return "team_" + secrets.token_urlsafe(12)


# --- Request/Response Models ---


class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class MemberInvite(BaseModel):
    email: str = Field(..., min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    role: str = Field(default="member")


class MemberRoleUpdate(BaseModel):
    role: str = Field(..., min_length=1)


class MemberResponse(BaseModel):
    email: str
    role: str
    invited_at: str
    joined_at: str | None


class TeamResponse(BaseModel):
    id: str
    name: str
    owner_email: str
    created_at: str
    members: list[MemberResponse]


class TeamListResponse(BaseModel):
    id: str
    name: str
    owner_email: str
    created_at: str
    member_count: int


# --- Helpers ---


async def _require_team_role(
    team_id: str, email: str, required_roles: set[str], db: AsyncSession
) -> Team:
    """Verify user is a member of the team with one of the required roles."""
    result = await db.execute(
        select(Team).where(Team.id == team_id).options(selectinload(Team.members))
    )
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")

    member = next((m for m in team.members if m.email == email), None)
    if member is None or member.role not in required_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    return team


# --- Endpoints ---


@router.post("/", response_model=TeamResponse, status_code=201)
@limiter.limit("10/minute")
async def create_team(
    request: Request,
    data: TeamCreate,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Create a new team. The project owner becomes the team owner."""
    email = project.owner_email or ""

    team = Team(
        id=_gen_team_id(),
        name=data.name,
        owner_email=email,
    )
    db.add(team)

    owner_member = TeamMember(
        team_id=team.id,
        email=email,
        role="owner",
    )
    db.add(owner_member)

    await db.commit()
    await db.refresh(team)

    return TeamResponse(
        id=team.id,
        name=team.name,
        owner_email=team.owner_email,
        created_at=str(team.created_at),
        members=[MemberResponse(
            email=email,
            role="owner",
            invited_at=str(owner_member.invited_at),
            joined_at=str(owner_member.invited_at),
        )],
    )


@router.get("/", response_model=list[TeamListResponse])
@limiter.limit("30/minute")
async def list_teams(
    request: Request,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """List all teams the user belongs to."""
    email = project.owner_email or ""

    result = await db.execute(
        select(Team)
        .join(TeamMember, TeamMember.team_id == Team.id)
        .where(TeamMember.email == email)
        .options(selectinload(Team.members))
    )
    teams = result.scalars().unique().all()

    return [
        TeamListResponse(
            id=t.id,
            name=t.name,
            owner_email=t.owner_email,
            created_at=str(t.created_at),
            member_count=len(t.members),
        )
        for t in teams
    ]


@router.get("/{team_id}", response_model=TeamResponse)
@limiter.limit("30/minute")
async def get_team(
    request: Request,
    team_id: str,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Get team details including members. Requires team membership."""
    email = project.owner_email or ""
    team = await _require_team_role(team_id, email, VALID_ROLES, db)

    return TeamResponse(
        id=team.id,
        name=team.name,
        owner_email=team.owner_email,
        created_at=str(team.created_at),
        members=[
            MemberResponse(
                email=m.email,
                role=m.role,
                invited_at=str(m.invited_at),
                joined_at=str(m.joined_at) if m.joined_at else None,
            )
            for m in team.members
        ],
    )


@router.post("/{team_id}/members", response_model=MemberResponse, status_code=201)
@limiter.limit("20/minute")
async def invite_member(
    request: Request,
    team_id: str,
    data: MemberInvite,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Invite a member to the team. Requires owner or admin role."""
    email = project.owner_email or ""

    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(sorted(VALID_ROLES))}")

    if data.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot invite as owner. Transfer ownership instead.")

    team = await _require_team_role(team_id, email, {"owner", "admin"}, db)

    # Check if already a member
    existing = next((m for m in team.members if m.email == data.email), None)
    if existing:
        raise HTTPException(status_code=409, detail="User is already a team member")

    member = TeamMember(
        team_id=team_id,
        email=data.email,
        role=data.role,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return MemberResponse(
        email=member.email,
        role=member.role,
        invited_at=str(member.invited_at),
        joined_at=str(member.joined_at) if member.joined_at else None,
    )


@router.put("/{team_id}/members/{member_email}/role", response_model=MemberResponse)
@limiter.limit("20/minute")
async def update_member_role(
    request: Request,
    team_id: str,
    member_email: str,
    data: MemberRoleUpdate,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Change a member's role. Requires owner or admin role."""
    email = project.owner_email or ""

    if data.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {', '.join(sorted(VALID_ROLES))}")

    if data.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot assign owner role directly. Transfer ownership instead.")

    team = await _require_team_role(team_id, email, {"owner", "admin"}, db)

    # Only the owner can assign admin role
    if data.role == "admin" and email != team.owner_email:
        raise HTTPException(status_code=403, detail="Only the owner can assign admin role")

    member = next((m for m in team.members if m.email == member_email), None)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot change owner's role")

    # Admins can't change other admins
    if member.role == "admin" and email != team.owner_email:
        raise HTTPException(status_code=403, detail="Only the owner can change admin roles")

    member.role = data.role
    await db.commit()
    await db.refresh(member)

    return MemberResponse(
        email=member.email,
        role=member.role,
        invited_at=str(member.invited_at),
        joined_at=str(member.joined_at) if member.joined_at else None,
    )


@router.delete("/{team_id}/members/{member_email}", status_code=204)
@limiter.limit("20/minute")
async def remove_member(
    request: Request,
    team_id: str,
    member_email: str,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Remove a member from the team. Requires owner or admin role."""
    email = project.owner_email or ""
    team = await _require_team_role(team_id, email, {"owner", "admin"}, db)

    member = next((m for m in team.members if m.email == member_email), None)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the team owner")

    # Admins can't remove other admins
    if member.role == "admin" and email != team.owner_email:
        raise HTTPException(status_code=403, detail="Only the owner can remove admins")

    await db.delete(member)
    await db.commit()


@router.post("/{team_id}/projects/{project_id}", status_code=200)
@limiter.limit("20/minute")
async def link_project_to_team(
    request: Request,
    team_id: str,
    project_id: str,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Link an existing project to a team. Requires owner or admin on team and project ownership."""
    email = project.owner_email or ""
    await _require_team_role(team_id, email, {"owner", "admin"}, db)

    target = await db.execute(select(Project).where(Project.id == project_id))
    target_project = target.scalar_one_or_none()
    if target_project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if target_project.owner_email != email:
        raise HTTPException(status_code=403, detail="Only the project owner can link it to a team")

    target_project.team_id = team_id
    await db.commit()

    return {"status": "linked", "project_id": project_id, "team_id": team_id}
