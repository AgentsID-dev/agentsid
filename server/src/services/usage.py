"""Usage tracking and plan enforcement."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import Agent, AuditEntry

# Plan limits
PLAN_LIMITS = {
    "free": {"events_per_month": 10000, "max_agents": 25},  # Launch promo: 10K events, 25 agents
    "pro": {"events_per_month": 25000, "max_agents": 50},
    "enterprise": {"events_per_month": -1, "max_agents": -1},  # unlimited
}


async def check_usage_limits(db: AsyncSession, project_id: str, plan: str) -> dict:
    """Check if project is within plan limits. Returns {allowed, reason, usage}."""
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    # Count events this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    event_count = (await db.execute(
        select(func.count()).where(
            AuditEntry.project_id == project_id,
            AuditEntry.created_at >= month_start,
        )
    )).scalar() or 0

    # Count active agents
    agent_count = (await db.execute(
        select(func.count()).where(
            Agent.project_id == project_id,
            Agent.status == "active",
        )
    )).scalar() or 0

    usage = {
        "events_this_month": event_count,
        "events_limit": limits["events_per_month"],
        "agents_active": agent_count,
        "agents_limit": limits["max_agents"],
        "plan": plan,
    }

    # Check limits (-1 means unlimited)
    if limits["events_per_month"] != -1 and event_count >= limits["events_per_month"]:
        return {
            "allowed": False,
            "reason": f"Monthly event limit reached ({limits['events_per_month']}). Upgrade to Pro for more.",
            "usage": usage,
        }

    # Approaching limit warning (80%)
    approaching = False
    if limits["events_per_month"] != -1 and event_count >= limits["events_per_month"] * 0.8:
        approaching = True

    return {"allowed": True, "approaching_limit": approaching, "usage": usage}


async def check_agent_limit(db: AsyncSession, project_id: str, plan: str) -> dict:
    """Check if project can create more agents."""
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])

    agent_count = (await db.execute(
        select(func.count()).where(
            Agent.project_id == project_id,
            Agent.status == "active",
        )
    )).scalar() or 0

    if limits["max_agents"] != -1 and agent_count >= limits["max_agents"]:
        return {
            "allowed": False,
            "reason": f"Agent limit reached ({limits['max_agents']}). Upgrade to Pro for more.",
        }

    return {"allowed": True}
