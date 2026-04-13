"""SQLAlchemy models — all tables for AgentsID."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Team(Base):
    """A team that owns projects. Multiple members with roles."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # team_<random>
    name: Mapped[str] = mapped_column(String(255))
    owner_email: Mapped[str] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    members: Mapped[list["TeamMember"]] = relationship(back_populates="team", cascade="all, delete")
    projects: Mapped[list["Project"]] = relationship(back_populates="team")


class TeamMember(Base):
    """A member of a team with a specific role."""

    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(primary_key=True)
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    role: Mapped[str] = mapped_column(String(20))  # owner, admin, member, viewer
    invited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    team: Mapped["Team"] = relationship(back_populates="members")

    __table_args__ = (
        Index("ix_team_member_unique", "team_id", "email", unique=True),
    )


class Project(Base):
    """A customer project. One project = one API key = one namespace."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # proj_<random>
    name: Mapped[str] = mapped_column(String(255))
    api_key_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_email: Mapped[str | None] = mapped_column(String(255))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), index=True)
    plan: Mapped[str] = mapped_column(String(50), server_default="free")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    team: Mapped["Team | None"] = relationship(back_populates="projects")
    agents: Mapped[list["Agent"]] = relationship(back_populates="project", cascade="all, delete")


class Agent(Base):
    """An AI agent identity. Unique per agent instance."""

    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # agt_<random>
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    created_by: Mapped[str] = mapped_column(String(255))  # user ID or identifier
    status: Mapped[str] = mapped_column(String(50), server_default="active")  # active, revoked, expired
    agent_type: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    parent_agent_id: Mapped[str | None] = mapped_column(
        ForeignKey("agents.id"), nullable=True, index=True
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    project: Mapped["Project"] = relationship(back_populates="agents")
    tokens: Mapped[list["AgentToken"]] = relationship(back_populates="agent", cascade="all, delete")
    permission_rules: Mapped[list["PermissionRule"]] = relationship(
        back_populates="agent", cascade="all, delete"
    )


class AgentToken(Base):
    """A short-lived, revocable token for an agent."""

    __tablename__ = "agent_tokens"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)  # tok_<random>
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    agent: Mapped["Agent"] = relationship(back_populates="tokens")


class PermissionRule(Base):
    """A single permission rule for an agent. Multiple rules per agent."""

    __tablename__ = "permission_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), index=True)
    tool_pattern: Mapped[str] = mapped_column(String(255))  # exact, prefix*, *suffix, *
    action: Mapped[str] = mapped_column(String(10))  # allow, deny
    conditions: Mapped[dict | None] = mapped_column(JSONB)  # parameter constraints (also used for resource-level scoping)
    priority: Mapped[int] = mapped_column(Integer, server_default="0")  # higher = evaluated first
    schedule: Mapped[dict | None] = mapped_column(JSONB)  # time-based: {hours_start, hours_end, timezone, days}
    rate_limit: Mapped[dict | None] = mapped_column(JSONB)  # rate-based: {max, per}
    data_level: Mapped[list[str] | None] = mapped_column(ARRAY(String))  # e.g. ["public", "internal"]
    requires_approval: Mapped[bool] = mapped_column(Boolean, server_default="false")
    ip_allowlist: Mapped[dict | None] = mapped_column(JSONB)
    max_chain_depth: Mapped[int | None] = mapped_column(Integer)
    budget: Mapped[dict | None] = mapped_column(JSONB)
    cooldown: Mapped[dict | None] = mapped_column(JSONB)
    sequence_requirements: Mapped[dict | None] = mapped_column(JSONB)
    session_limits: Mapped[dict | None] = mapped_column(JSONB)
    risk_score_threshold: Mapped[int | None] = mapped_column(Integer)
    anomaly_detection: Mapped[dict | None] = mapped_column(JSONB)  # {"sensitivity": "low|medium|high", "action": "flag|block"}
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    agent: Mapped["Agent"] = relationship(back_populates="permission_rules")

    __table_args__ = (
        Index("ix_perm_agent_tool", "agent_id", "tool_pattern"),
    )


class Delegation(Base):
    """A delegation record — tracks who authorized whom."""

    __tablename__ = "delegations"

    id: Mapped[int] = mapped_column(primary_key=True)
    agent_id: Mapped[str] = mapped_column(ForeignKey("agents.id"), index=True)
    delegated_by_type: Mapped[str] = mapped_column(String(20))  # user, agent
    delegated_by_id: Mapped[str] = mapped_column(String(255))
    permissions_granted: Mapped[list | None] = mapped_column(JSONB)  # snapshot of what was granted
    chain: Mapped[list | None] = mapped_column(JSONB)  # full delegation chain
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class PendingApproval(Base):
    """A tool call awaiting human approval."""

    __tablename__ = "pending_approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(String(50), index=True)
    agent_id: Mapped[str] = mapped_column(String(50), index=True)
    tool: Mapped[str] = mapped_column(String(255))
    params: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), server_default="pending")  # pending, approved, rejected
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_by: Mapped[str | None] = mapped_column(String(255))
    reason: Mapped[str | None] = mapped_column(Text)


class AuditEntry(Base):
    """Immutable audit log entry. Append-only with chained integrity hashes.

    Each entry includes:
    - entry_hash: SHA-256 of this entry's content
    - prev_hash: hash of the previous entry in this project's audit chain

    Tampering with any entry breaks the hash chain, making modification detectable.
    """

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(String(50), index=True)
    agent_id: Mapped[str] = mapped_column(String(50), index=True)
    delegated_by: Mapped[str | None] = mapped_column(String(255))
    tool: Mapped[str] = mapped_column(String(255), index=True)
    action: Mapped[str] = mapped_column(String(10))  # allow, deny
    params: Mapped[dict | None] = mapped_column(JSONB)
    result: Mapped[str] = mapped_column(String(20))  # success, error, blocked
    delegation_chain: Mapped[list | None] = mapped_column(JSONB)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    # Integrity chain
    entry_hash: Mapped[str | None] = mapped_column(String(64))  # SHA-256 of this entry
    prev_hash: Mapped[str | None] = mapped_column(String(64))   # hash of previous entry

    __table_args__ = (
        Index("ix_audit_project_time", "project_id", "created_at"),
        Index("ix_audit_agent_time", "agent_id", "created_at"),
    )


class Webhook(Base):
    """Webhook configuration for a project."""

    __tablename__ = "webhooks"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    url: Mapped[str] = mapped_column(String(2000))
    events: Mapped[list[str]] = mapped_column(ARRAY(String))  # ["agent.denied", "limit.approaching", "agent.revoked"]
    active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    secret: Mapped[str | None] = mapped_column(String(255))  # for HMAC signature verification
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
