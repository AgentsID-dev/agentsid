"""Permission management + check routes.

SECURITY FIXES APPLIED:
- C2: All endpoints verify agent belongs to authenticated project before operating
- C3: /check endpoint verifies agent ownership
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.auth_dep import get_project
from src.core.database import get_db
from src.models.models import Project
from src.services.identity import IdentityService
from src.services.permission import PermissionService

router = APIRouter(tags=["permissions"])
limiter = Limiter(key_func=get_remote_address)


class ScheduleInput(BaseModel):
    hours_start: int | None = Field(None, ge=0, le=23)
    hours_end: int | None = Field(None, ge=0, le=24)
    timezone: str = Field("UTC", max_length=50)
    days: list[str] | None = Field(
        None,
        description="Days of week: mon, tue, wed, thu, fri, sat, sun",
    )


class RateLimitInput(BaseModel):
    max: int = Field(100, ge=1, le=100_000)
    per: str = Field("hour", pattern="^(second|minute|hour|day)$")


class IpAllowlistInput(BaseModel):
    cidrs: list[str] | None = Field(None, description="CIDR ranges, e.g. ['10.0.0.0/8']")
    ips: list[str] | None = Field(None, description="Exact IPs, e.g. ['1.2.3.4']")


class BudgetInput(BaseModel):
    max: float = Field(..., gt=0, description="Maximum budget amount")
    unit: str = Field("usd", max_length=20)
    per: str = Field("day", pattern="^(second|minute|hour|day)$")


class CooldownInput(BaseModel):
    seconds: int = Field(..., ge=1, le=86400, description="Cooldown period in seconds after denial")


class SequenceRequirementsInput(BaseModel):
    requires_prior: list[str] = Field(..., min_length=1, description="Tool patterns that must have been called first")
    within_seconds: int = Field(300, ge=1, le=86400, description="Time window for prior calls")


class SessionLimitsInput(BaseModel):
    max_duration_minutes: int | None = Field(None, ge=1, le=1440)
    max_idle_minutes: int | None = Field(None, ge=1, le=1440)
    max_calls: int | None = Field(None, ge=1, le=1_000_000)


class PermissionRuleInput(BaseModel):
    tool_pattern: str = Field(..., min_length=1, max_length=255, description="Tool name or pattern (supports * wildcards)")
    action: str = Field("allow", pattern="^(allow|deny)$")
    conditions: dict | None = Field(None, description="Parameter constraints / resource-level scoping. All key-values must match the tool call params.")
    priority: int = Field(0, ge=0, le=1000)
    schedule: ScheduleInput | None = Field(None, description="Time-based restriction. Rule only applies during specified hours/days.")
    rate_limit: RateLimitInput | None = Field(None, description="Rate limit. Applies to ALLOW rules only.")
    data_level: list[str] | None = Field(None, description="Allowed data classification levels, e.g. ['public', 'internal'].")
    requires_approval: bool = Field(False, description="If true, matching calls return pending_approval instead of allowed.")
    ip_allowlist: IpAllowlistInput | None = Field(None, description="Restrict to specific IPs or CIDR ranges.")
    max_chain_depth: int | None = Field(None, ge=1, le=100, description="Max delegation chain hops allowed.")
    budget: BudgetInput | None = Field(None, description="Cost/resource budget cap.")
    cooldown: CooldownInput | None = Field(None, description="Cooldown period after denial.")
    sequence_requirements: SequenceRequirementsInput | None = Field(None, description="Must execute prerequisite tools first.")
    session_limits: SessionLimitsInput | None = Field(None, description="Per-session constraints.")
    risk_score_threshold: int | None = Field(None, ge=1, le=100, description="Max risk score allowed for tool calls.")
    anomaly_detection: dict | None = Field(None, description="Anomaly detection: {sensitivity: low|medium|high, action: flag|block}")


class PermissionCheck(BaseModel):
    agent_id: str = Field(..., min_length=1, max_length=50)
    tool: str = Field(..., min_length=1, max_length=255)
    params: dict | None = None


async def _verify_agent_ownership(
    project: Project, agent_id: str, db: AsyncSession
) -> None:
    """Verify agent belongs to the authenticated project. Raises 404 if not."""
    svc = IdentityService(db)
    agent = await svc.get_agent(project.id, agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")


@router.put("/agents/{agent_id}/permissions")
@limiter.limit("20/minute")
async def set_permissions(
    request: Request,
    agent_id: str,
    rules: list[PermissionRuleInput],
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Set permission rules for an agent. Replaces all existing rules."""
    await _verify_agent_ownership(project, agent_id, db)
    svc = PermissionService(db)
    result = await svc.set_rules(agent_id, [r.model_dump() for r in rules])
    await db.commit()
    return {"agent_id": agent_id, "rules": result}


@router.get("/agents/{agent_id}/permissions")
@limiter.limit("60/minute")
async def get_permissions(
    request: Request,
    agent_id: str,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Get permission rules for an agent."""
    await _verify_agent_ownership(project, agent_id, db)
    svc = PermissionService(db)
    rules = await svc.get_rules(agent_id)
    return {"agent_id": agent_id, "rules": rules}


@router.post("/check")
@limiter.limit("100/minute")
async def check_permission(
    request: Request,
    data: PermissionCheck,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Check if an agent is allowed to call a specific tool."""
    await _verify_agent_ownership(project, data.agent_id, db)
    svc = PermissionService(db)
    return await svc.check(data.agent_id, data.tool, data.params)
