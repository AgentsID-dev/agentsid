"""Agent identity routes — register, list, revoke."""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.auth_dep import get_project
from src.core.database import get_db
from src.models.models import Project
from src.services.identity import IdentityService
from src.services.usage import check_agent_limit

router = APIRouter(prefix="/agents", tags=["agents"])
limiter = Limiter(key_func=get_remote_address)


class AgentResponse(BaseModel):
    id: str
    name: str
    project_id: str
    created_by: str
    status: str
    expires_at: str | None
    metadata: dict | None
    created_at: str
    revoked_at: str | None
    agent_type: str | None = None
    parent_agent_id: str | None = None


class RegisterResponse(BaseModel):
    agent: AgentResponse
    token: str
    token_id: str
    expires_at: str


class TokenRefreshResponse(BaseModel):
    agent_id: str
    token: str
    token_id: str
    expires_at: str


class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    on_behalf_of: str = Field(..., min_length=1, max_length=255)
    permissions: list[str] | None = Field(None, max_length=100)
    ttl_hours: int | None = Field(None, ge=1, le=720)
    metadata: dict | None = None

    @field_validator("metadata")
    @classmethod
    def metadata_size_limit(cls, v):
        if v is not None and len(json.dumps(v)) > 10_000:
            raise ValueError("Metadata must be under 10KB")
        return v


@router.post("/", status_code=201, response_model=RegisterResponse)
@limiter.limit("20/minute")
async def register_agent(
    request: Request,
    data: AgentCreate,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Register a new agent identity and issue a token."""
    limit_check = await check_agent_limit(db, project.id, project.plan)
    if not limit_check["allowed"]:
        raise HTTPException(status_code=403, detail=limit_check["reason"])

    svc = IdentityService(db)
    return await svc.register_agent(
        project_id=project.id,
        name=data.name,
        created_by=data.on_behalf_of,
        permissions=data.permissions,
        ttl_hours=data.ttl_hours,
        metadata=data.metadata,
    )


@router.get("/", response_model=list[AgentResponse])
@limiter.limit("60/minute")
async def list_agents(
    request: Request,
    status: str | None = Query(None, description="Filter by status: active, revoked, expired"),
    limit: int = Query(50, ge=1, le=200),
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """List all agents in the project."""
    svc = IdentityService(db)
    return await svc.list_agents(project.id, status, limit)


@router.get("/{agent_id}", response_model=AgentResponse)
@limiter.limit("60/minute")
async def get_agent(
    request: Request,
    agent_id: str,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Get agent details."""
    svc = IdentityService(db)
    result = await svc.get_agent(project.id, agent_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return result


class TokenRefresh(BaseModel):
    ttl_hours: int | None = Field(None, ge=1, le=720)


@router.post("/{agent_id}/refresh", response_model=TokenRefreshResponse)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    agent_id: str,
    data: TokenRefresh | None = None,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Issue a new token for an existing agent. Old tokens remain valid until they expire."""
    svc = IdentityService(db)
    result = await svc.refresh_token(project.id, agent_id, data.ttl_hours if data else None)
    if result is None:
        raise HTTPException(status_code=404, detail="Agent not found or revoked")
    return result


class AgentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    metadata: dict | None = None

    @field_validator("metadata")
    @classmethod
    def metadata_size_limit(cls, v):
        if v is not None and len(json.dumps(v)) > 10_000:
            raise ValueError("Metadata must be under 10KB")
        return v


@router.patch("/{agent_id}", response_model=AgentResponse)
@limiter.limit("20/minute")
async def update_agent(
    request: Request,
    agent_id: str,
    data: AgentUpdate,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Update agent name or metadata."""
    svc = IdentityService(db)
    result = await svc.update_agent(project.id, agent_id, data.model_dump(exclude_unset=True))
    if result is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return result


class DelegateRequest(BaseModel):
    parent_agent_id: str
    parent_token: str
    child_name: str = Field(..., min_length=1, max_length=255)
    child_permissions: list[str]
    ttl_hours: int | None = Field(None, ge=1, le=720)


@router.post("/delegate", status_code=201, response_model=RegisterResponse)
@limiter.limit("20/minute")
async def delegate_agent(
    request: Request,
    data: DelegateRequest,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Create a child agent with narrowed permissions from a parent agent."""
    svc = IdentityService(db)
    try:
        result = await svc.delegate_to_agent(
            project.id,
            data.parent_agent_id,
            data.parent_token,
            data.child_name,
            data.child_permissions,
            data.ttl_hours,
        )
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Parent agent not found or not active")
    return result


class DeriveSubagentRequest(BaseModel):
    parent_agent_id: str
    parent_token: str
    agent_type: str = Field(..., min_length=1, max_length=64)
    child_name: str | None = Field(None, max_length=255)
    ttl_hours: int | None = Field(None, ge=1, le=720)
    task_hash: str | None = Field(None, max_length=128)
    override: dict | None = None

    @field_validator("override")
    @classmethod
    def override_size_limit(cls, v):
        if v is not None and len(json.dumps(v)) > 20_000:
            raise ValueError("Override must be under 20KB")
        return v


@router.post("/derive", status_code=201, response_model=RegisterResponse)
@limiter.limit("60/minute")
async def derive_subagent(
    request: Request,
    data: DeriveSubagentRequest,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Derive a scoped child identity for a spawned Claude Code subagent.

    Resolves the subagent profile for `agent_type`, narrows tools against the
    parent's permissions, and issues a child token. Use this from a PreToolUse
    hook when intercepting the `Agent` tool call.
    """
    svc = IdentityService(db)
    try:
        result = await svc.derive_subagent(
            project_id=project.id,
            parent_agent_id=data.parent_agent_id,
            parent_token=data.parent_token,
            agent_type=data.agent_type,
            child_name=data.child_name,
            ttl_hours=data.ttl_hours,
            task_hash=data.task_hash,
            override=data.override,
        )
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))
    if result is None:
        raise HTTPException(status_code=404, detail="Parent agent not found or not active")
    return result


@router.delete("/{agent_id}", status_code=204)
@limiter.limit("20/minute")
async def revoke_agent(
    request: Request,
    agent_id: str,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an agent — all tokens immediately invalidated."""
    svc = IdentityService(db)
    if not await svc.revoke_agent(project.id, agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")


class LineageNode(BaseModel):
    id: str
    name: str
    agent_type: str | None
    parent_agent_id: str | None
    status: str
    created_at: str
    children: list["LineageNode"] = []


LineageNode.model_rebuild()


@router.get("/{agent_id}/lineage", response_model=LineageNode)
@limiter.limit("60/minute")
async def get_agent_lineage(
    request: Request,
    agent_id: str,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Return this agent and its full descendant tree via parent_agent_id chain.

    Used by the dashboard to render the parent→child subagent tree for a session.
    """
    from sqlalchemy import select

    from src.models.models import Agent

    root = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.project_id == project.id)
    )
    root_agent = root.scalar_one_or_none()
    if root_agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Pull all project agents once, build parent→children index in memory.
    result = await db.execute(select(Agent).where(Agent.project_id == project.id))
    all_agents = list(result.scalars().all())
    children_of: dict[str, list[Agent]] = {}
    for a in all_agents:
        if a.parent_agent_id:
            children_of.setdefault(a.parent_agent_id, []).append(a)

    def build(node: "Agent") -> dict:
        return {
            "id": node.id,
            "name": node.name,
            "agent_type": node.agent_type,
            "parent_agent_id": node.parent_agent_id,
            "status": node.status,
            "created_at": str(node.created_at),
            "children": [build(c) for c in children_of.get(node.id, [])],
        }

    return build(root_agent)
