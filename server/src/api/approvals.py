"""Approval workflow routes."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.auth_dep import get_project
from src.core.database import get_db
from src.models.models import Project
from src.services.approval import ApprovalService

router = APIRouter(prefix="/approvals", tags=["approvals"])
limiter = Limiter(key_func=get_remote_address)


class ApprovalDecision(BaseModel):
    decided_by: str = Field(..., min_length=1, max_length=255)
    reason: str | None = None


@router.get("/")
@limiter.limit("60/minute")
async def list_pending(
    request: Request,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    svc = ApprovalService(db)
    return await svc.list_pending(project.id)


@router.post("/{approval_id}/approve")
@limiter.limit("20/minute")
async def approve(
    request: Request,
    approval_id: int,
    data: ApprovalDecision,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    svc = ApprovalService(db)
    result = await svc.approve(project.id, approval_id, data.decided_by)
    if result is None:
        raise HTTPException(status_code=404, detail="Pending approval not found")
    await db.commit()
    return result


@router.post("/{approval_id}/reject")
@limiter.limit("20/minute")
async def reject(
    request: Request,
    approval_id: int,
    data: ApprovalDecision,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    svc = ApprovalService(db)
    result = await svc.reject(project.id, approval_id, data.decided_by, data.reason)
    if result is None:
        raise HTTPException(status_code=404, detail="Pending approval not found")
    await db.commit()
    return result


@router.get("/count")
@limiter.limit("60/minute")
async def pending_count(
    request: Request,
    project: Project = Depends(get_project),
    db: AsyncSession = Depends(get_db),
):
    svc = ApprovalService(db)
    count = await svc.get_count(project.id)
    return {"pending_count": count}
