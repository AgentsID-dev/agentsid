"""Audit log service — append-only event recording with integrity chain.

Each entry is hashed (SHA-256) and linked to the previous entry's hash,
forming a tamper-evident chain. Modifying any entry breaks the chain.
"""

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import AuditEntry


def _compute_entry_hash(
    project_id: str, agent_id: str, tool: str, action: str,
    result: str, prev_hash: str, delegated_by: str | None = None,
    params: dict | None = None, error_message: str | None = None,
) -> str:
    """Compute SHA-256 hash of an audit entry's content + previous hash."""
    data = json.dumps({
        "project_id": project_id,
        "agent_id": agent_id,
        "tool": tool,
        "action": action,
        "result": result,
        "delegated_by": delegated_by,
        "params": params,
        "error_message": error_message,
        "prev_hash": prev_hash,
    }, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(data.encode()).hexdigest()


class AuditService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def log(
        self,
        project_id: str,
        agent_id: str,
        tool: str,
        action: str,
        result: str = "success",
        delegated_by: str | None = None,
        params: dict | None = None,
        delegation_chain: list | None = None,
        error_message: str | None = None,
    ) -> None:
        """Record an audit event with integrity hash chain. Non-blocking — never raises."""
        try:
            tool = tool[:255] if tool else "unknown"

            # Use FOR UPDATE to serialize access to the last audit entry
            prev_result = await self._db.execute(
                select(AuditEntry.entry_hash)
                .where(AuditEntry.project_id == project_id)
                .order_by(AuditEntry.id.desc())
                .limit(1)
                .with_for_update()
            )
            prev_row = prev_result.first()
            prev_hash = prev_row[0] if prev_row and prev_row[0] else "genesis"

            # Compute this entry's hash
            entry_hash = _compute_entry_hash(
                project_id, agent_id, tool, action, result,
                prev_hash, delegated_by, params, error_message,
            )

            entry = AuditEntry(
                project_id=project_id,
                agent_id=agent_id,
                delegated_by=delegated_by,
                tool=tool,
                action=action,
                params=params,
                result=result,
                delegation_chain=delegation_chain,
                error_message=error_message,
                entry_hash=entry_hash,
                prev_hash=prev_hash,
            )
            self._db.add(entry)
            await self._db.flush()
        except Exception as e:
            logging.error(
                f"AUDIT FAILURE — event lost: project={project_id} agent={agent_id} "
                f"tool={tool} action={action} error={e}"
            )

    async def verify_chain(self, project_id: str) -> dict:
        """Verify integrity of audit chain using batched reads."""
        expected_prev = "genesis"
        entries_checked = 0
        batch_size = 500
        last_id = 0

        while True:
            stmt = (
                select(AuditEntry)
                .where(
                    AuditEntry.project_id == project_id,
                    AuditEntry.id > last_id,
                )
                .order_by(AuditEntry.id.asc())
                .limit(batch_size)
            )
            result = await self._db.execute(stmt)
            batch = list(result.scalars().all())

            if not batch:
                break

            for entry in batch:
                entries_checked += 1
                last_id = entry.id

                if entry.entry_hash is None:
                    expected_prev = "genesis"
                    continue

                if entry.prev_hash != expected_prev:
                    return {
                        "verified": False,
                        "entries_checked": entries_checked,
                        "broken_at_id": entry.id,
                        "message": f"Integrity chain broken at entry {entry.id}",
                    }

                recomputed = _compute_entry_hash(
                    entry.project_id, entry.agent_id, entry.tool, entry.action,
                    entry.result, entry.prev_hash, entry.delegated_by,
                    entry.params, entry.error_message,
                )
                if recomputed != entry.entry_hash:
                    return {
                        "verified": False,
                        "entries_checked": entries_checked,
                        "broken_at_id": entry.id,
                        "message": f"Hash mismatch at entry {entry.id}",
                    }

                expected_prev = entry.entry_hash

            # Clear SQLAlchemy identity map between batches
            self._db.expire_all()

        return {
            "verified": True,
            "entries_checked": entries_checked,
            "message": "All entries verified — chain intact",
        }

    async def query(
        self,
        project_id: str,
        agent_id: str | None = None,
        tool: str | None = None,
        action: str | None = None,
        since: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> dict:
        """Query the audit log with filters."""
        filters = [AuditEntry.project_id == project_id]

        if agent_id:
            filters.append(AuditEntry.agent_id == agent_id)
        if tool:
            filters.append(AuditEntry.tool == tool)
        if action:
            filters.append(AuditEntry.action == action)
        if since:
            try:
                since_dt = datetime.fromisoformat(since)
                filters.append(AuditEntry.created_at >= since_dt)
            except ValueError:
                pass

        # Count
        count_stmt = select(func.count()).select_from(
            select(AuditEntry.id).where(*filters).subquery()
        )
        total = (await self._db.execute(count_stmt)).scalar() or 0

        # Query
        stmt = (
            select(AuditEntry)
            .where(*filters)
            .order_by(AuditEntry.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self._db.execute(stmt)

        entries = [
            {
                "id": e.id,
                "agent_id": e.agent_id,
                "delegated_by": e.delegated_by,
                "tool": e.tool,
                "action": e.action,
                "params": e.params,
                "result": e.result,
                "delegation_chain": e.delegation_chain,
                "error_message": e.error_message,
                "created_at": str(e.created_at),
            }
            for e in result.scalars().all()
        ]

        return {"entries": entries, "total": total, "limit": limit, "offset": offset}

    async def stats(self, project_id: str, days: int = 30) -> dict:
        """Aggregate audit stats."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        filters = [AuditEntry.project_id == project_id, AuditEntry.created_at >= cutoff]

        # Total events
        total = (await self._db.execute(
            select(func.count()).where(*filters)
        )).scalar() or 0

        # By action
        action_stmt = (
            select(AuditEntry.action, func.count())
            .where(*filters)
            .group_by(AuditEntry.action)
        )
        action_result = await self._db.execute(action_stmt)
        by_action = {row[0]: row[1] for row in action_result.all()}

        # By tool (top 10)
        tool_stmt = (
            select(AuditEntry.tool, func.count())
            .where(*filters)
            .group_by(AuditEntry.tool)
            .order_by(func.count().desc())
            .limit(10)
        )
        tool_result = await self._db.execute(tool_stmt)
        by_tool = {row[0]: row[1] for row in tool_result.all()}

        # By agent (top 10)
        agent_stmt = (
            select(AuditEntry.agent_id, func.count())
            .where(*filters)
            .group_by(AuditEntry.agent_id)
            .order_by(func.count().desc())
            .limit(10)
        )
        agent_result = await self._db.execute(agent_stmt)
        by_agent = {row[0]: row[1] for row in agent_result.all()}

        # Deny rate
        denied = by_action.get("deny", 0)
        deny_rate = round(denied / max(total, 1) * 100, 1)

        return {
            "period_days": days,
            "total_events": total,
            "by_action": by_action,
            "by_tool": by_tool,
            "by_agent": by_agent,
            "deny_rate_pct": deny_rate,
        }
