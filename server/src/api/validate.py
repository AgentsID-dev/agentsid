"""Token validation routes — used by MCP middleware.

SECURITY FIXES APPLIED:
- C1: Both endpoints now require project API key authentication
- C4: Token's project claim must match the authenticated project
- H6: All validation attempts are logged regardless of tool presence
- M5: Error messages are generic to prevent format leakage
"""

import logging

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.auth_dep import get_project
from src.core.database import get_db
from src.core.security import validate_agent_token
from src.models.models import Delegation, Project
from src.services.audit import AuditService
from src.services.identity import IdentityService
from src.services.notifications import notify_approaching_limit
from src.services.usage import check_usage_limits

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(tags=["auth"])

# Sensitive param keys to redact from audit logs (M4)
SENSITIVE_KEYS = {"password", "secret", "token", "api_key", "credential", "key"}


def _redact_params(params: dict | None) -> dict | None:
    if not params:
        return params
    return {
        k: "***REDACTED***" if k.lower() in SENSITIVE_KEYS else v
        for k, v in params.items()
    }


class ValidateRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=5000)
    tool: str | None = Field(None, min_length=1, max_length=255, pattern=r'^[a-zA-Z0-9_.*-]+$')
    params: dict | None = None


class ValidateResponse(BaseModel):
    valid: bool
    reason: str | None = None
    agent_id: str | None = None
    project_id: str | None = None
    delegated_by: str | None = None
    expires_at: int | None = None
    permission: dict | None = None


@router.post("/validate", response_model=ValidateResponse)
@limiter.limit("200/minute")
async def validate_token(
    request: Request,
    data: ValidateRequest,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Validate an agent token. Optionally check permission for a specific tool.

    Requires project API key. Token must belong to the authenticated project.
    """
    audit = AuditService(db)

    # Step 1: Validate signature + expiry (no DB call)
    try:
        claims = validate_agent_token(data.token)
    except (ValueError, TypeError, AttributeError) as e:
        logger.warning(f"Token validation failed: {e}")
        await audit.log(
            project_id=project.id,
            agent_id="unknown",
            tool=data.tool or "token_validation",
            action="deny",
            result="error",
            error_message="Token validation failed",
        )
        await db.commit()
        return {"valid": False, "reason": "Token validation failed"}

    # Step 2: Verify token belongs to this project (C4 fix)
    if claims.prj != project.id:
        await audit.log(
            project_id=project.id,
            agent_id=claims.sub,
            tool=data.tool or "token_validation",
            action="deny",
            result="blocked",
            error_message="Token does not belong to this project",
        )
        await db.commit()
        return {"valid": False, "reason": "Token validation failed"}

    # Step 3: Check revocation (DB call)
    svc = IdentityService(db)
    if await svc.is_token_revoked(claims.jti):
        await audit.log(
            project_id=claims.prj,
            agent_id=claims.sub,
            tool=data.tool or "token_validation",
            action="deny",
            result="blocked",
            delegated_by=claims.dby,
            error_message="Token revoked",
        )
        await db.commit()
        return {"valid": False, "reason": "Token validation failed"}

    # Step 3.5: Check usage limits
    usage_check = await check_usage_limits(db, claims.prj, project.plan)
    if not usage_check["allowed"]:
        await audit.log(
            project_id=claims.prj,
            agent_id=claims.sub,
            tool=data.tool or "usage_limit",
            action="deny",
            result="blocked",
            error_message=usage_check["reason"],
        )
        await db.commit()
        return {"valid": False, "reason": usage_check["reason"]}

    # Trigger notifications for approaching/reached limits
    if usage_check.get("approaching_limit") and project.owner_email:
        await notify_approaching_limit(
            project.id, project.owner_email, usage_check["usage"],
        )

    result = {
        "valid": True,
        "agent_id": claims.sub,
        "project_id": claims.prj,
        "delegated_by": claims.dby,
        "expires_at": claims.exp,
    }

    # Step 4: Optionally check permission for a specific tool
    if data.tool:
        from src.services.permission import PermissionService
        perm_svc = PermissionService(db)
        check = await perm_svc.check(claims.sub, data.tool, data.params, project_id=project.id)
        result["permission"] = check

        if check.get("pending_approval"):
            from src.services.approval import ApprovalService
            approval_svc = ApprovalService(db)
            pending = await approval_svc.create_pending(
                claims.prj, claims.sub, data.tool, data.params
            )
            result["approval_id"] = pending["id"]

    # Always log (H6 fix)
    # NOTE: Audit write is synchronous to maintain hash chain integrity.
    # Future optimization: use a background queue with single-writer guarantee.
    await audit.log(
        project_id=claims.prj,
        agent_id=claims.sub,
        tool=data.tool or "token_validation",
        action="allow" if result.get("permission", {}).get("allowed", True) else "deny",
        result="success" if result.get("permission", {}).get("allowed", True) else "blocked",
        delegated_by=claims.dby,
        params=_redact_params(data.params),
        delegation_chain=[
            {"type": "user", "id": claims.dby},
            {"type": "agent", "id": claims.sub},
        ],
    )
    await db.commit()

    return result


@router.post("/introspect")
@limiter.limit("60/minute")
async def introspect_token(
    request: Request,
    data: ValidateRequest,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    """Full token introspection. Requires project API key. Token must belong to project."""
    try:
        claims = validate_agent_token(data.token)
    except (ValueError, TypeError, AttributeError):
        return {"active": False, "reason": "Token validation failed"}

    # Verify project ownership (C4 fix)
    if claims.prj != project.id:
        return {"active": False, "reason": "Token validation failed"}

    svc = IdentityService(db)
    if await svc.is_token_revoked(claims.jti):
        return {"active": False, "reason": "Token validation failed"}

    agent = await svc.get_agent(claims.prj, claims.sub)

    from src.services.permission import PermissionService
    perm_svc = PermissionService(db)
    rules = await perm_svc.get_rules(claims.sub)

    del_result = await db.execute(
        select(Delegation).where(Delegation.agent_id == claims.sub)
    )
    delegation = del_result.scalar_one_or_none()

    return {
        "active": True,
        "agent": agent,
        "claims": {
            "sub": claims.sub,
            "prj": claims.prj,
            "dby": claims.dby,
            "iat": claims.iat,
            "exp": claims.exp,
            "jti": claims.jti,
        },
        "permissions": rules,
        "delegation_chain": delegation.chain if delegation else None,
    }
