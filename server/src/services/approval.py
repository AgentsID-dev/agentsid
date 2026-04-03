"""Approval workflow — queue, approve, reject pending tool calls."""

from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import PendingApproval


class ApprovalService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_pending(
        self, project_id: str, agent_id: str, tool: str, params: dict | None
    ) -> dict:
        pending = PendingApproval(
            project_id=project_id,
            agent_id=agent_id,
            tool=tool,
            params=params,
        )
        self._db.add(pending)
        await self._db.flush()
        return {"id": pending.id, "status": "pending", "tool": tool}

    async def list_pending(self, project_id: str) -> list[dict]:
        result = await self._db.execute(
            select(PendingApproval)
            .where(
                PendingApproval.project_id == project_id,
                PendingApproval.status == "pending",
            )
            .order_by(PendingApproval.requested_at.desc())
        )
        return [self._to_dict(p) for p in result.scalars().all()]

    async def approve(
        self, project_id: str, approval_id: int, decided_by: str
    ) -> dict | None:
        result = await self._db.execute(
            select(PendingApproval).where(
                PendingApproval.id == approval_id,
                PendingApproval.project_id == project_id,
                PendingApproval.status == "pending",
            )
        )
        pending = result.scalar_one_or_none()
        if pending is None:
            return None
        updated = PendingApproval(
            id=pending.id,
            project_id=pending.project_id,
            agent_id=pending.agent_id,
            tool=pending.tool,
            params=pending.params,
            status="approved",
            requested_at=pending.requested_at,
            decided_at=datetime.now(timezone.utc),
            decided_by=decided_by,
            reason=pending.reason,
        )
        await self._db.merge(updated)
        await self._db.flush()
        return self._to_dict(updated)

    async def reject(
        self,
        project_id: str,
        approval_id: int,
        decided_by: str,
        reason: str | None = None,
    ) -> dict | None:
        result = await self._db.execute(
            select(PendingApproval).where(
                PendingApproval.id == approval_id,
                PendingApproval.project_id == project_id,
                PendingApproval.status == "pending",
            )
        )
        pending = result.scalar_one_or_none()
        if pending is None:
            return None
        updated = PendingApproval(
            id=pending.id,
            project_id=pending.project_id,
            agent_id=pending.agent_id,
            tool=pending.tool,
            params=pending.params,
            status="rejected",
            requested_at=pending.requested_at,
            decided_at=datetime.now(timezone.utc),
            decided_by=decided_by,
            reason=reason,
        )
        await self._db.merge(updated)
        await self._db.flush()
        return self._to_dict(updated)

    async def get_count(self, project_id: str) -> int:
        result = await self._db.execute(
            select(func.count()).where(
                PendingApproval.project_id == project_id,
                PendingApproval.status == "pending",
            )
        )
        return result.scalar() or 0

    @staticmethod
    def _to_dict(p: PendingApproval) -> dict:
        return {
            "id": p.id,
            "agent_id": p.agent_id,
            "tool": p.tool,
            "params": p.params,
            "status": p.status,
            "requested_at": str(p.requested_at),
            "decided_at": str(p.decided_at) if p.decided_at else None,
            "decided_by": p.decided_by,
            "reason": p.reason,
        }
