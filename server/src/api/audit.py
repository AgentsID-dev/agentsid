"""Audit log query routes."""

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.auth_dep import get_project
from src.core.database import get_db
from src.models.models import Project
from src.services.audit import AuditService
from src.services.usage import check_usage_limits

router = APIRouter(prefix="/audit", tags=["audit"])
limiter = Limiter(key_func=get_remote_address)


class AuditQueryResponse(BaseModel):
    entries: list[dict]
    total: int
    limit: int
    offset: int


class AuditStatsResponse(BaseModel):
    period_days: int
    total_events: int
    by_action: dict
    by_tool: dict
    by_agent: dict
    deny_rate_pct: float


class ChainVerifyResponse(BaseModel):
    verified: bool
    entries_checked: int
    broken_at_id: int | None = None
    message: str


@router.get("/", response_model=AuditQueryResponse)
@limiter.limit("60/minute")
async def query_audit_log(
    request: Request,
    agent_id: str | None = Query(None),
    tool: str | None = Query(None),
    action: str | None = Query(None),
    since: str | None = Query(None, description="ISO 8601 datetime"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Query the audit log with filters."""
    svc = AuditService(db)
    return await svc.query(
        project_id=project.id,
        agent_id=agent_id,
        tool=tool,
        action=action,
        since=since,
        limit=limit,
        offset=offset,
    )


@router.get("/stats", response_model=AuditStatsResponse)
@limiter.limit("60/minute")
async def audit_stats(
    request: Request,
    days: int = Query(30, ge=1, le=365),
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate audit stats."""
    svc = AuditService(db)
    return await svc.stats(project.id, days)


@router.get("/verify", response_model=ChainVerifyResponse)
@limiter.limit("20/minute")
async def verify_audit_chain(
    request: Request,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Verify the integrity of the audit log hash chain.
    Detects if any entries have been tampered with."""
    svc = AuditService(db)
    return await svc.verify_chain(project.id)


class UsageResponse(BaseModel):
    events_this_month: int
    events_limit: int
    agents_active: int
    agents_limit: int
    plan: str


@router.get("/usage", response_model=UsageResponse)
@limiter.limit("60/minute")
async def get_usage(
    request: Request,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Get current usage stats and plan limits."""
    result = await check_usage_limits(db, project.id, project.plan)
    return result["usage"]
