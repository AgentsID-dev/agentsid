"""Agent identity service — registration, token issuance, revocation."""

import fnmatch
import secrets
import time
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.security import generate_agent_token, hash_key, validate_agent_token
from src.models.models import Agent, AgentToken, Delegation

# Simple TTL cache for revocation checks
_revocation_cache: dict[str, tuple[bool, float]] = {}
_CACHE_TTL = 10.0  # 10 second TTL — balance between performance and revocation latency

_MAX_CACHE_SIZE = 10_000


def _prune_cache(cache: dict, max_size: int = _MAX_CACHE_SIZE) -> None:
    """Remove oldest entries if cache exceeds max size."""
    if len(cache) > max_size:
        # Remove oldest 20%
        to_remove = len(cache) - int(max_size * 0.8)
        for key in list(cache.keys())[:to_remove]:
            del cache[key]


def _gen_agent_id() -> str:
    return "agt_" + secrets.token_urlsafe(16)


class IdentityService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def register_agent(
        self,
        project_id: str,
        name: str,
        created_by: str,
        permissions: list[str] | None = None,
        ttl_hours: int | None = None,
        metadata: dict | None = None,
        agent_type: str | None = None,
        parent_agent_id: str | None = None,
    ) -> dict:
        """Register a new agent and issue its first token."""
        agent_id = _gen_agent_id()
        ttl = min(ttl_hours or settings.default_token_ttl_hours, settings.max_token_ttl_hours)
        ttl_seconds = ttl * 3600

        # Compute expiry
        now = datetime.now(timezone.utc)
        expires_at = datetime.fromtimestamp(now.timestamp() + ttl_seconds, tz=timezone.utc)

        # Create agent
        agent = Agent(
            id=agent_id,
            project_id=project_id,
            name=name,
            created_by=created_by,
            expires_at=expires_at,
            metadata_=metadata,
            agent_type=agent_type,
            parent_agent_id=parent_agent_id,
        )
        self._db.add(agent)

        # Generate token
        raw_token, token_id, claims = generate_agent_token(
            agent_id=agent_id,
            project_id=project_id,
            delegated_by=created_by,
            ttl_seconds=ttl_seconds,
        )

        # Store token reference (for revocation)
        token_record = AgentToken(
            id=token_id,
            agent_id=agent_id,
            token_hash=hash_key(raw_token),
            expires_at=expires_at,
        )
        self._db.add(token_record)

        # Create delegation record
        delegation = Delegation(
            agent_id=agent_id,
            delegated_by_type="user",
            delegated_by_id=created_by,
            permissions_granted=permissions,
            chain=[
                {"type": "user", "id": created_by, "granted": permissions or ["*"]},
                {"type": "agent", "id": agent_id, "received": permissions or ["*"]},
            ],
            expires_at=expires_at,
        )
        self._db.add(delegation)

        # Set permission rules if provided
        if permissions:
            from src.services.permission import PermissionService
            perm_svc = PermissionService(self._db)
            await perm_svc.set_rules(agent_id, [
                {"tool_pattern": p, "action": "allow"} for p in permissions
            ])

        await self._db.commit()
        await self._db.refresh(agent)

        return {
            "agent": {
                "id": agent_id,
                "project_id": project_id,
                "name": name,
                "status": "active",
                "created_by": created_by,
                "expires_at": str(expires_at),
                "created_at": str(agent.created_at),
                "metadata": metadata,
                "revoked_at": None,
                "agent_type": agent_type,
                "parent_agent_id": parent_agent_id,
            },
            "token": raw_token,
            "token_id": token_id,
            "expires_at": str(expires_at),
        }

    async def get_agent(self, project_id: str, agent_id: str) -> dict | None:
        result = await self._db.execute(
            select(Agent).where(Agent.id == agent_id, Agent.project_id == project_id)
        )
        agent = result.scalar_one_or_none()
        if agent is None:
            return None
        return self._to_dict(agent)

    async def list_agents(
        self, project_id: str, status: str | None = None, limit: int = 50
    ) -> list[dict]:
        filters = [Agent.project_id == project_id]
        if status:
            filters.append(Agent.status == status)
        result = await self._db.execute(
            select(Agent).where(*filters).order_by(Agent.created_at.desc()).limit(limit)
        )
        return [self._to_dict(a) for a in result.scalars().all()]

    async def revoke_agent(self, project_id: str, agent_id: str) -> bool:
        result = await self._db.execute(
            select(Agent).where(Agent.id == agent_id, Agent.project_id == project_id)
        )
        agent = result.scalar_one_or_none()
        if agent is None:
            return False

        now = datetime.now(timezone.utc)

        # Cascade: revoke this agent and all downstream delegated children
        agents_to_revoke = [agent_id]
        visited: set[str] = set()

        while agents_to_revoke:
            current_id = agents_to_revoke.pop(0)
            if current_id in visited:
                continue
            visited.add(current_id)

            # Revoke the agent
            agent_result = await self._db.execute(
                select(Agent).where(
                    Agent.id == current_id,
                    Agent.project_id == project_id,
                    Agent.status == "active",
                )
            )
            current_agent = agent_result.scalar_one_or_none()
            if current_agent:
                current_agent.status = "revoked"
                current_agent.revoked_at = now

            # Revoke all active tokens for this agent
            tokens = await self._db.execute(
                select(AgentToken).where(
                    AgentToken.agent_id == current_id,
                    AgentToken.revoked_at.is_(None),
                )
            )
            for token in tokens.scalars().all():
                token.revoked_at = now

            # Invalidate revocation cache for this agent
            for cache_key in list(_revocation_cache.keys()):
                if cache_key.startswith(current_id + ":") or cache_key == current_id:
                    _revocation_cache.pop(cache_key, None)

            # Find all children delegated by this agent
            children = await self._db.execute(
                select(Delegation.agent_id).where(
                    Delegation.delegated_by_id == current_id,
                )
            )
            for (child_id,) in children.all():
                if child_id not in visited:
                    agents_to_revoke.append(child_id)

        await self._db.commit()
        return True

    async def refresh_token(
        self, project_id: str, agent_id: str, ttl_hours: int | None = None
    ) -> dict | None:
        """Issue a new token for an existing active agent."""
        result = await self._db.execute(
            select(Agent).where(
                Agent.id == agent_id,
                Agent.project_id == project_id,
                Agent.status == "active",
            )
        )
        agent = result.scalar_one_or_none()
        if agent is None:
            return None

        ttl = min(ttl_hours or settings.default_token_ttl_hours, settings.max_token_ttl_hours)
        ttl_seconds = ttl * 3600
        now = datetime.now(timezone.utc)
        expires_at = datetime.fromtimestamp(now.timestamp() + ttl_seconds, tz=timezone.utc)

        # H2 fix: Revoke all existing tokens before issuing new one
        existing_tokens = await self._db.execute(
            select(AgentToken).where(
                AgentToken.agent_id == agent_id,
                AgentToken.revoked_at.is_(None),
            )
        )
        for t in existing_tokens.scalars().all():
            t.revoked_at = now

        raw_token, token_id, claims = generate_agent_token(
            agent_id=agent_id,
            project_id=project_id,
            delegated_by=agent.created_by,
            ttl_seconds=ttl_seconds,
        )

        token_record = AgentToken(
            id=token_id,
            agent_id=agent_id,
            token_hash=hash_key(raw_token),
            expires_at=expires_at,
        )
        self._db.add(token_record)
        await self._db.commit()

        return {
            "agent_id": agent_id,
            "token": raw_token,
            "token_id": token_id,
            "expires_at": str(expires_at),
        }

    async def update_agent(
        self, project_id: str, agent_id: str, updates: dict
    ) -> dict | None:
        """Update agent metadata or name."""
        result = await self._db.execute(
            select(Agent).where(Agent.id == agent_id, Agent.project_id == project_id)
        )
        agent = result.scalar_one_or_none()
        if agent is None:
            return None

        if "name" in updates:
            agent.name = updates["name"]
        if "metadata" in updates:
            agent.metadata_ = updates["metadata"]

        await self._db.commit()
        await self._db.refresh(agent)
        return self._to_dict(agent)

    async def is_token_revoked(self, token_id: str) -> bool:
        # Check cache first
        now = time.time()
        cached = _revocation_cache.get(token_id)
        if cached and (now - cached[1]) < _CACHE_TTL:
            return cached[0]

        # Cache miss — query DB
        result = await self._db.execute(
            select(AgentToken.revoked_at).where(AgentToken.id == token_id)
        )
        row = result.first()
        is_revoked = row is None or row[0] is not None

        # Cache the result
        _revocation_cache[token_id] = (is_revoked, now)
        _prune_cache(_revocation_cache)
        return is_revoked

    async def delegate_to_agent(
        self,
        project_id: str,
        parent_agent_id: str,
        parent_token: str,
        child_name: str,
        child_permissions: list[str],
        ttl_hours: int | None = None,
    ) -> dict | None:
        """Create a child agent that inherits narrowed permissions from a parent agent."""
        # Validate parent token
        try:
            claims = validate_agent_token(parent_token)
        except ValueError:
            raise ValueError("Invalid parent token")

        if claims.sub != parent_agent_id:
            raise ValueError("Token does not belong to the specified parent agent")

        if claims.prj != project_id:
            raise ValueError("Token does not belong to this project")

        # Check revocation
        if await self.is_token_revoked(claims.jti):
            raise ValueError("Parent token has been revoked")

        # Verify parent exists and is active
        parent = await self.get_agent(project_id, parent_agent_id)
        if parent is None or parent["status"] != "active":
            return None

        # Get parent's permissions
        from src.services.permission import PermissionService

        perm_svc = PermissionService(self._db)
        parent_rules = await perm_svc.get_rules(parent_agent_id)
        parent_patterns = {r["tool_pattern"] for r in parent_rules if r["action"] == "allow"}

        # Verify child permissions are a strict subset of parent permissions.
        # Child permissions must be exact strings (no wildcards) and each must
        # be explicitly covered by at least one parent pattern.
        for child_perm in child_permissions:
            # Child permissions during delegation cannot contain wildcards
            if "*" in child_perm or "?" in child_perm:
                raise ValueError(
                    f"Delegated permissions cannot use wildcards: '{child_perm}'. "
                    "Use exact tool names only. Child permissions can only narrow, never expand."
                )
            # Check if any parent pattern would allow this exact tool
            matched = any(
                fnmatch.fnmatch(child_perm, parent_pat)
                for parent_pat in parent_patterns
            )
            if not matched:
                raise ValueError(
                    f"Permission '{child_perm}' not in parent's scope. "
                    "Child permissions can only narrow, never expand."
                )

        # Create the child agent
        result = await self.register_agent(
            project_id=project_id,
            name=child_name,
            created_by=parent_agent_id,
            permissions=child_permissions,
            ttl_hours=ttl_hours,
        )

        # Update delegation chain to include parent
        parent_del = await self._db.execute(
            select(Delegation).where(Delegation.agent_id == parent_agent_id)
        )
        parent_delegation = parent_del.scalar_one_or_none()
        parent_chain = parent_delegation.chain if parent_delegation else []

        child_del = await self._db.execute(
            select(Delegation).where(Delegation.agent_id == result["agent"]["id"])
        )
        child_delegation = child_del.scalar_one_or_none()
        if child_delegation:
            child_delegation.chain = parent_chain + [
                {"type": "agent", "id": parent_agent_id, "granted": child_permissions},
                {"type": "agent", "id": result["agent"]["id"], "received": child_permissions},
            ]
            await self._db.commit()

        return result

    async def derive_subagent(
        self,
        project_id: str,
        parent_agent_id: str,
        parent_token: str,
        agent_type: str,
        child_name: str | None = None,
        ttl_hours: int | None = None,
        task_hash: str | None = None,
        override: dict | None = None,
    ) -> dict | None:
        """Derive a scoped child identity for a spawned Claude Code subagent.

        Resolves the profile for `agent_type` from the built-in profile book
        (optionally merged with caller-supplied overrides), narrows the tool set
        against the parent's actual permissions, and creates a child agent via
        the normal delegation path.

        Raises ValueError with human-readable reason for deny paths.
        """
        from src.services.permission import PermissionService
        from src.services.subagent_profiles import (
            load_profile_book,
            merge_overrides,
            narrow_to_parent,
        )

        # Validate parent token — mirrors delegate_to_agent.
        try:
            claims = validate_agent_token(parent_token)
        except ValueError:
            raise ValueError("Invalid parent token")
        if claims.sub != parent_agent_id:
            raise ValueError("Token does not belong to the specified parent agent")
        if claims.prj != project_id:
            raise ValueError("Token does not belong to this project")
        if await self.is_token_revoked(claims.jti):
            raise ValueError("Parent token has been revoked")

        parent = await self.get_agent(project_id, parent_agent_id)
        if parent is None or parent["status"] != "active":
            return None

        # Depth check — prevent runaway spawning chains.
        depth = await self._compute_depth(parent_agent_id)

        # Resolve profile.
        book = load_profile_book()
        book = merge_overrides(book, override)
        profile = book.resolve(agent_type)

        if depth >= profile.max_depth:
            raise ValueError(
                f"Max subagent depth ({profile.max_depth}) exceeded for type '{agent_type}'"
            )

        # Narrow against parent's allow rules.
        perm_svc = PermissionService(self._db)
        parent_rules = await perm_svc.get_rules(parent_agent_id)
        parent_patterns = frozenset(
            r["tool_pattern"] for r in parent_rules if r["action"] == "allow"
        )
        narrowed = narrow_to_parent(profile, parent_patterns)

        if not narrowed.tools and not narrowed.inherit_from_parent:
            raise ValueError(
                f"Subagent '{agent_type}' would have zero tools after narrowing against parent"
            )

        name = child_name or f"{agent_type}@{parent_agent_id}"
        child_permissions = list(narrowed.tools)

        # Delegate via existing path. register_agent enforces perm narrowing via
        # delegate_to_agent-style chain; here we already narrowed ourselves.
        result = await self.register_agent(
            project_id=project_id,
            name=name,
            created_by=parent_agent_id,
            permissions=child_permissions,
            ttl_hours=ttl_hours,
            metadata={
                "subagent": True,
                "task_hash": task_hash,
                "profile": narrowed.to_dict(),
            },
            agent_type=agent_type,
            parent_agent_id=parent_agent_id,
        )

        # Patch delegation chain to reflect parent lineage (mirrors delegate_to_agent).
        parent_del = await self._db.execute(
            select(Delegation).where(Delegation.agent_id == parent_agent_id)
        )
        parent_delegation = parent_del.scalar_one_or_none()
        parent_chain = parent_delegation.chain if parent_delegation else []

        child_del = await self._db.execute(
            select(Delegation).where(Delegation.agent_id == result["agent"]["id"])
        )
        child_delegation = child_del.scalar_one_or_none()
        if child_delegation:
            child_delegation.chain = parent_chain + [
                {"type": "agent", "id": parent_agent_id, "granted": child_permissions},
                {
                    "type": "subagent",
                    "id": result["agent"]["id"],
                    "agent_type": agent_type,
                    "received": child_permissions,
                },
            ]
            await self._db.commit()

        return result

    async def _compute_depth(self, agent_id: str) -> int:
        """Count ancestors of this agent by walking parent_agent_id chain."""
        depth = 0
        current: str | None = agent_id
        visited: set[str] = set()
        while current and current not in visited:
            visited.add(current)
            row = await self._db.execute(
                select(Agent.parent_agent_id).where(Agent.id == current)
            )
            parent_id = row.scalar_one_or_none()
            if parent_id is None:
                break
            depth += 1
            current = parent_id
        return depth

    @staticmethod
    def _to_dict(agent: Agent) -> dict:
        return {
            "id": agent.id,
            "name": agent.name,
            "project_id": agent.project_id,
            "created_by": agent.created_by,
            "status": agent.status,
            "expires_at": str(agent.expires_at) if agent.expires_at else None,
            "metadata": agent.metadata_,
            "created_at": str(agent.created_at),
            "revoked_at": str(agent.revoked_at) if agent.revoked_at else None,
            "agent_type": agent.agent_type,
            "parent_agent_id": agent.parent_agent_id,
        }
