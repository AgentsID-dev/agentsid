"""Permission engine — per-tool authorization with wildcards and conditions.

Evaluation order:
1. Explicit DENY rules (deny always wins)
2. Explicit ALLOW rules
3. Default DENY (if nothing matches, block it)

Advanced features:
- Resource-level scoping via `conditions` (all condition key-values must match params)
- Time-based permissions via `schedule` (rule only applies during specified hours/days)
- Rate-based permissions via `rate_limit` (in-memory sliding window counter)
- Data classification via `data_level` (restricts which data levels a tool call can access)
- Approval-required via `requires_approval` (flags actions needing human approval)
"""

import fnmatch
import ipaddress
import time
import zoneinfo
from collections import defaultdict
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import PermissionRule
from src.services.classifier import classify as classify_call
from src.services.classifier import matches_any as _tags_match

# Simple TTL cache for permission rules
_permission_cache: dict[str, tuple[list, float]] = {}
_CACHE_TTL = 10.0  # 10 second TTL — balance between performance and revocation latency

# In-memory rate limit counters: key = "agent_id:tool" -> list of timestamps
_rate_counters: dict[str, list[float]] = defaultdict(list)

_RATE_WINDOWS = {
    "second": 1,
    "minute": 60,
    "hour": 3600,
    "day": 86400,
}

# In-memory budget trackers: key = "agent_id:tool" -> list of (timestamp, cost)
_budget_counters: dict[str, list[tuple[float, float]]] = defaultdict(list)

# In-memory cooldown trackers: key = "agent_id:tool" -> last denial timestamp
_cooldown_tracker: dict[str, float] = {}

# In-memory sequence trackers: key = agent_id -> list of (timestamp, tool_name)
_sequence_tracker: dict[str, list[tuple[float, str]]] = defaultdict(list)

# In-memory session trackers: key = agent_id -> {start: float, last_active: float, call_count: int}
_session_tracker: dict[str, dict[str, float | int]] = {}

# Anomaly detection baselines: key = agent_id -> {avg_calls_per_hour, tool_distribution, active_hours, last_updated}
_anomaly_baselines: dict[str, dict] = {}

# Anomaly detection call history: key = agent_id -> list of (timestamp, tool_name)
_anomaly_history: dict[str, list[tuple[float, str]]] = defaultdict(list)

_ANOMALY_SENSITIVITY = {"low": 3.0, "medium": 2.0, "high": 1.5}  # std dev multipliers

_MAX_CACHE_SIZE = 10_000


def _prune_cache(cache: dict, max_size: int = _MAX_CACHE_SIZE) -> None:
    """Remove oldest entries if cache exceeds max size."""
    if len(cache) > max_size:
        # Remove oldest 20%
        to_remove = len(cache) - int(max_size * 0.8)
        for key in list(cache.keys())[:to_remove]:
            del cache[key]


class PermissionService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def set_rules(self, agent_id: str, rules: list[dict]) -> list[dict]:
        """Replace all permission rules for an agent."""
        _permission_cache.pop(agent_id, None)  # invalidate cache
        # Delete existing rules
        existing = await self._db.execute(
            select(PermissionRule).where(PermissionRule.agent_id == agent_id)
        )
        for rule in existing.scalars().all():
            await self._db.delete(rule)

        # Insert new rules
        created = []
        for i, rule in enumerate(rules):
            pr = PermissionRule(
                agent_id=agent_id,
                tool_pattern=rule["tool_pattern"],
                action=rule.get("action", "allow"),
                conditions=rule.get("conditions"),
                priority=rule.get("priority", i),
                schedule=rule.get("schedule"),
                rate_limit=rule.get("rate_limit"),
                data_level=rule.get("data_level"),
                requires_approval=rule.get("requires_approval", False),
                ip_allowlist=rule.get("ip_allowlist"),
                max_chain_depth=rule.get("max_chain_depth"),
                budget=rule.get("budget"),
                cooldown=rule.get("cooldown"),
                sequence_requirements=rule.get("sequence_requirements"),
                session_limits=rule.get("session_limits"),
                risk_score_threshold=rule.get("risk_score_threshold"),
                anomaly_detection=rule.get("anomaly_detection"),
            )
            self._db.add(pr)
            created.append(_rule_to_dict(pr))

        await self._db.flush()
        return created

    async def get_rules(self, agent_id: str) -> list[dict]:
        result = await self._db.execute(
            select(PermissionRule)
            .where(PermissionRule.agent_id == agent_id)
            .order_by(PermissionRule.priority.desc())
        )
        return [_rule_to_dict(r) for r in result.scalars().all()]

    async def check(
        self, agent_id: str, tool: str, params: dict | None = None,
        project_id: str | None = None,
    ) -> dict:
        """Check if an agent is allowed to call a specific tool.

        Returns: { allowed: bool, reason: str, matched_rule: dict | None }
        May also return: { pending_approval: true } when approval is required.
        """
        # If project_id provided, verify agent belongs to project
        if project_id:
            from src.models.models import Agent

            result = await self._db.execute(
                select(Agent).where(Agent.id == agent_id, Agent.project_id == project_id)
            )
            if not result.scalar_one_or_none():
                return {
                    "allowed": False,
                    "reason": "Agent not found in project",
                    "matched_rule": None,
                }

        now = time.time()
        cached = _permission_cache.get(agent_id)
        if cached and (now - cached[1]) < _CACHE_TTL:
            all_rules = cached[0]
        else:
            rules = await self._db.execute(
                select(PermissionRule)
                .where(PermissionRule.agent_id == agent_id)
                .order_by(PermissionRule.priority.desc())
            )
            all_rules = list(rules.scalars().all())
            _permission_cache[agent_id] = (all_rules, now)
            _prune_cache(_permission_cache)

        # Classify the call once up-front. `tags` is the full set of semantic
        # labels this (tool, params) call matches — always includes the raw
        # tool name so exact-name rules keep working, plus any taxonomic
        # labels (shell.admin.sudo, file.read[.env], …) derived by the
        # classifier. Rule-matching below checks the stored pattern against
        # the entire tag list rather than just the raw tool string.
        tags = classify_call(tool, params)

        # Phase 1: Check DENY rules first
        for rule in all_rules:
            if rule.action != "deny":
                continue
            if not _tags_match(rule.tool_pattern, tags):
                continue
            if not _matches_schedule(rule.schedule):
                continue  # schedule doesn't match = rule doesn't apply
            if not _matches_conditions(rule.conditions, params):
                continue
            if not _matches_data_level(rule.data_level, params):
                continue
            if not _matches_ip(rule.ip_allowlist, params):
                continue
            if not _matches_chain_depth(rule.max_chain_depth, params):
                continue
            if not _matches_risk_score(rule.risk_score_threshold, params):
                continue
            result = {
                "allowed": False,
                "reason": f"Denied by rule: {rule.tool_pattern}",
                "matched_rule": {
                    "tool_pattern": rule.tool_pattern,
                    "action": "deny",
                },
            }
            # Record denial for cooldown tracking
            if rule.cooldown:
                _cooldown_tracker[f"{agent_id}:{tool}"] = time.time()
                _prune_cache(_cooldown_tracker)
            return result

        # Phase 2: Check ALLOW rules
        for rule in all_rules:
            if rule.action != "allow":
                continue
            if not _tags_match(rule.tool_pattern, tags):
                continue
            if not _matches_schedule(rule.schedule):
                continue  # schedule doesn't match = rule doesn't apply
            if not _matches_conditions(rule.conditions, params):
                continue
            if not _matches_data_level(rule.data_level, params):
                continue
            if not _matches_ip(rule.ip_allowlist, params):
                continue
            if not _matches_chain_depth(rule.max_chain_depth, params):
                continue
            if not _matches_risk_score(rule.risk_score_threshold, params):
                continue

            # Check cooldown (blocked after recent denial)
            if not _check_cooldown(agent_id, tool, rule.cooldown):
                return {
                    "allowed": False,
                    "reason": f"Cooldown active for rule: {rule.tool_pattern}",
                    "matched_rule": {
                        "tool_pattern": rule.tool_pattern,
                        "action": "allow",
                    },
                }

            # Check sequence requirements
            if not _matches_sequence(agent_id, rule.sequence_requirements):
                return {
                    "allowed": False,
                    "reason": f"Sequence requirements not met for rule: {rule.tool_pattern}",
                    "matched_rule": {
                        "tool_pattern": rule.tool_pattern,
                        "action": "allow",
                    },
                }

            # Check session limits
            if not _check_session_limits(agent_id, rule.session_limits):
                return {
                    "allowed": False,
                    "reason": f"Session limit exceeded for rule: {rule.tool_pattern}",
                    "matched_rule": {
                        "tool_pattern": rule.tool_pattern,
                        "action": "allow",
                    },
                }

            # Check requires_approval before rate limit
            if rule.requires_approval:
                return {
                    "allowed": False,
                    "pending_approval": True,
                    "reason": "This action requires human approval",
                    "matched_rule": {
                        "tool_pattern": rule.tool_pattern,
                        "action": "allow",
                        "requires_approval": True,
                    },
                }

            # Check rate limit
            if not _check_rate_limit(agent_id, tool, rule.rate_limit):
                return {
                    "allowed": False,
                    "reason": f"Rate limit exceeded for rule: {rule.tool_pattern}",
                    "matched_rule": {
                        "tool_pattern": rule.tool_pattern,
                        "action": "allow",
                    },
                }

            # Check budget
            if not _check_budget(agent_id, tool, rule.budget, params):
                return {
                    "allowed": False,
                    "reason": f"Budget exceeded for rule: {rule.tool_pattern}",
                    "matched_rule": {
                        "tool_pattern": rule.tool_pattern,
                        "action": "allow",
                    },
                }

            # Anomaly detection — check behavioral baseline
            anomaly = _check_anomaly(agent_id, tool, rule.anomaly_detection)
            if anomaly and anomaly["action"] == "block":
                return {
                    "allowed": False,
                    "reason": f"Anomaly detected: {anomaly['detail']}",
                    "anomaly": anomaly,
                    "matched_rule": {
                        "tool_pattern": rule.tool_pattern,
                        "action": "allow",
                    },
                }

            # Track tool call for sequence requirements
            _sequence_tracker[agent_id].append((time.time(), tool))
            _prune_cache(_sequence_tracker)

            result = {
                "allowed": True,
                "reason": f"Allowed by rule: {rule.tool_pattern}",
                "matched_rule": {
                    "tool_pattern": rule.tool_pattern,
                    "action": "allow",
                },
            }
            # Attach anomaly warning (flagged but not blocked)
            if anomaly and anomaly["action"] == "flag":
                result["anomaly_warning"] = anomaly
            return result

        # Phase 3: Default deny
        return {
            "allowed": False,
            "reason": "No matching rule — default deny",
            "matched_rule": None,
        }


def _rule_to_dict(rule: PermissionRule) -> dict:
    """Convert a PermissionRule to a serializable dict."""
    result = {
        "tool_pattern": rule.tool_pattern,
        "action": rule.action,
        "conditions": rule.conditions,
        "priority": rule.priority,
    }
    if rule.schedule is not None:
        result["schedule"] = rule.schedule
    if rule.rate_limit is not None:
        result["rate_limit"] = rule.rate_limit
    if rule.data_level is not None:
        result["data_level"] = rule.data_level
    if rule.requires_approval:
        result["requires_approval"] = rule.requires_approval
    if rule.ip_allowlist is not None:
        result["ip_allowlist"] = rule.ip_allowlist
    if rule.max_chain_depth is not None:
        result["max_chain_depth"] = rule.max_chain_depth
    if rule.budget is not None:
        result["budget"] = rule.budget
    if rule.cooldown is not None:
        result["cooldown"] = rule.cooldown
    if rule.sequence_requirements is not None:
        result["sequence_requirements"] = rule.sequence_requirements
    if rule.session_limits is not None:
        result["session_limits"] = rule.session_limits
    if rule.risk_score_threshold is not None:
        result["risk_score_threshold"] = rule.risk_score_threshold
    if rule.anomaly_detection is not None:
        result["anomaly_detection"] = rule.anomaly_detection
    return result


def _matches_pattern(pattern: str, tool: str) -> bool:
    """Match a tool name against a permission pattern.

    Supports: exact ("save_memory"), wildcard ("save_*", "*_memory", "*")
    """
    if pattern == "*":
        return True
    return fnmatch.fnmatch(tool, pattern)


def _matches_conditions(conditions: dict | None, params: dict | None) -> bool:
    """Check if tool call params match rule conditions. All conditions must match (AND).

    H4 SECURITY FIX: Missing params = no match (fail-closed).
    If a rule has conditions, the params MUST be present and match.

    NOTE: This function also serves as the resource-level scoping mechanism.
    Use conditions to restrict rules to specific resource values, e.g.:
        {"customer_id": "cust_123"} — rule only applies when customer_id matches.
    """
    if not conditions:
        return True
    if not params:
        return False  # conditions exist but no params = fail-closed

    for key, allowed_values in conditions.items():
        param_value = params.get(key)
        if param_value is None:
            return False  # required condition param missing = no match
        # Only allow scalar comparisons
        if isinstance(param_value, (dict, list)):
            return False
        if isinstance(allowed_values, list):
            if param_value not in allowed_values:
                return False
        elif param_value != allowed_values:
            return False

    return True


def _matches_schedule(schedule: dict | None) -> bool:
    """Check if the current time falls within a rule's schedule window.

    If schedule is None, the rule always applies (no time restriction).
    If schedule is set but current time is outside the window, the rule is skipped.

    Schedule format:
        {
            "hours_start": 9,        # inclusive
            "hours_end": 17,         # exclusive
            "timezone": "US/Pacific",
            "days": ["mon", "tue", "wed", "thu", "fri"]
        }
    """
    if not schedule:
        return True

    tz = zoneinfo.ZoneInfo(schedule.get("timezone", "UTC"))
    now = datetime.now(tz)

    # Check day of week
    days = schedule.get("days")
    if days:
        day_name = now.strftime("%a").lower()
        if day_name not in days:
            return False

    # Check hour window
    hours_start = schedule.get("hours_start")
    hours_end = schedule.get("hours_end")
    if hours_start is not None and hours_end is not None:
        if not (hours_start <= now.hour < hours_end):
            return False

    return True


def _check_rate_limit(
    agent_id: str, tool: str, rate_limit: dict | None
) -> bool:
    """Sliding-window rate limiter using in-memory counters.

    Returns True if the call is within limits, False if rate limit exceeded.

    Rate limit format:
        {"max": 100, "per": "hour"}
    Supported windows: second, minute, hour, day.
    """
    if not rate_limit:
        return True

    key = f"{agent_id}:{tool}"
    max_calls = rate_limit.get("max", 100)
    per = rate_limit.get("per", "hour")
    window = _RATE_WINDOWS.get(per, 3600)
    now = time.time()

    # Prune expired entries (immutable replacement)
    _rate_counters[key] = [t for t in _rate_counters[key] if now - t < window]

    if len(_rate_counters[key]) >= max_calls:
        return False

    _rate_counters[key].append(now)
    _prune_cache(_rate_counters)
    return True


def _matches_data_level(
    rule_levels: list[str] | None, params: dict | None
) -> bool:
    """Check if the tool call's data_level is permitted by the rule.

    If the rule has no data_level restriction, all calls are allowed.
    If the call params don't specify a data_level, it's allowed (no classification = unrestricted).
    If both are present, the call's data_level must be in the rule's allowed list.
    """
    if not rule_levels:
        return True
    if not params:
        return True
    param_level = params.get("data_level")
    if param_level is None:
        return True
    return param_level in rule_levels


def _matches_ip(ip_allowlist: dict | None, params: dict | None) -> bool:
    """Check if the client IP is in the allowed list.

    If no ip_allowlist is set, all IPs are allowed.
    If ip_allowlist is set but params has no client_ip, fail-closed (no match).
    """
    if not ip_allowlist:
        return True
    if not params:
        return False
    client_ip = params.get("client_ip")
    if client_ip is None:
        return False

    try:
        addr = ipaddress.ip_address(client_ip)
    except ValueError:
        return False

    # Check exact IPs
    allowed_ips = ip_allowlist.get("ips", [])
    if client_ip in allowed_ips:
        return True

    # Check CIDR ranges
    cidrs = ip_allowlist.get("cidrs", [])
    for cidr in cidrs:
        try:
            if addr in ipaddress.ip_network(cidr, strict=False):
                return True
        except ValueError:
            continue

    return False


def _matches_chain_depth(max_depth: int | None, params: dict | None) -> bool:
    """Check if the delegation chain depth is within the allowed maximum.

    If no max_chain_depth is set, all depths are allowed.
    If max_chain_depth is set but params has no chain_depth, the call is allowed
    (assumes depth 0 = direct call).
    """
    if max_depth is None:
        return True
    if not params:
        return True
    chain_depth = params.get("chain_depth")
    if chain_depth is None:
        return True
    return chain_depth <= max_depth


def _matches_risk_score(threshold: int | None, params: dict | None) -> bool:
    """Check if the tool call's risk score is below the threshold.

    If no threshold is set, all risk scores are allowed.
    If threshold is set but params has no risk_score, the call is allowed
    (assumes risk score 0 = no risk).
    """
    if threshold is None:
        return True
    if not params:
        return True
    risk_score = params.get("risk_score")
    if risk_score is None:
        return True
    return risk_score <= threshold


def _check_budget(
    agent_id: str, tool: str, budget: dict | None, params: dict | None
) -> bool:
    """Sliding-window budget limiter using in-memory counters.

    Returns True if the call is within budget, False if budget exceeded.

    Budget format:
        {"max": 100.0, "unit": "usd", "per": "day"}
    """
    if not budget:
        return True

    cost = 0.0
    if params:
        cost = params.get("cost", 0.0)

    key = f"{agent_id}:{tool}"
    max_budget = budget.get("max", 100.0)
    per = budget.get("per", "day")
    window = _RATE_WINDOWS.get(per, 86400)
    now = time.time()

    # Prune expired entries
    _budget_counters[key] = [
        (t, c) for t, c in _budget_counters[key] if now - t < window
    ]

    current_spend = sum(c for _, c in _budget_counters[key])
    if current_spend + cost > max_budget:
        return False

    _budget_counters[key].append((now, cost))
    _prune_cache(_budget_counters)
    return True


def _check_cooldown(
    agent_id: str, tool: str, cooldown: dict | None
) -> bool:
    """Check if the agent is in a cooldown period after a recent denial.

    Returns True if no cooldown is active, False if still in cooldown.

    Cooldown format:
        {"seconds": 30}
    """
    if not cooldown:
        return True

    key = f"{agent_id}:{tool}"
    last_denial = _cooldown_tracker.get(key)
    if last_denial is None:
        return True

    cooldown_seconds = cooldown.get("seconds", 0)
    elapsed = time.time() - last_denial
    return elapsed >= cooldown_seconds


def _matches_sequence(
    agent_id: str, sequence_req: dict | None
) -> bool:
    """Check if the agent has called prerequisite tools recently.

    Returns True if all required prior tools have been called within the time window.

    Sequence format:
        {"requires_prior": ["search_*"], "within_seconds": 300}
    """
    if not sequence_req:
        return True

    requires_prior = sequence_req.get("requires_prior", [])
    within_seconds = sequence_req.get("within_seconds", 300)
    now = time.time()

    # Get recent tool calls within the time window
    recent_calls = [
        tool_name
        for ts, tool_name in _sequence_tracker.get(agent_id, [])
        if now - ts < within_seconds
    ]

    # Each required pattern must match at least one recent call
    for pattern in requires_prior:
        found = any(fnmatch.fnmatch(call, pattern) for call in recent_calls)
        if not found:
            return False

    return True


def _check_session_limits(
    agent_id: str, session_limits: dict | None
) -> bool:
    """Check per-session constraints for an agent.

    Returns True if within limits, False if any limit is exceeded.

    Session limits format:
        {"max_duration_minutes": 60, "max_idle_minutes": 10, "max_calls": 500}
    """
    if not session_limits:
        return True

    now = time.time()
    session = _session_tracker.get(agent_id)

    if session is None:
        # Initialize session
        _session_tracker[agent_id] = {
            "start": now,
            "last_active": now,
            "call_count": 1,
        }
        _prune_cache(_session_tracker)
        return True

    # Check max duration
    max_duration = session_limits.get("max_duration_minutes")
    if max_duration is not None:
        elapsed_minutes = (now - session["start"]) / 60
        if elapsed_minutes > max_duration:
            return False

    # Check max idle
    max_idle = session_limits.get("max_idle_minutes")
    if max_idle is not None:
        idle_minutes = (now - session["last_active"]) / 60
        if idle_minutes > max_idle:
            return False

    # Check max calls
    max_calls = session_limits.get("max_calls")
    if max_calls is not None:
        if session["call_count"] >= max_calls:
            return False

    # Update session state (new dict to avoid mutation of the check logic)
    _session_tracker[agent_id] = {
        "start": session["start"],
        "last_active": now,
        "call_count": session["call_count"] + 1,
    }
    return True


def _check_anomaly(
    agent_id: str, tool: str, anomaly_config: dict | None
) -> dict | None:
    """Statistical anomaly detection based on agent behavioral baseline.

    Tracks call volume and tool distribution per agent. Builds a rolling baseline
    over time, then flags deviations beyond the configured sensitivity threshold.

    Returns None if no anomaly, or a dict with anomaly details if detected.
    Config format: {"sensitivity": "low|medium|high", "action": "flag|block"}
    """
    if not anomaly_config:
        return None

    sensitivity = anomaly_config.get("sensitivity", "medium")
    action = anomaly_config.get("action", "flag")
    threshold = _ANOMALY_SENSITIVITY.get(sensitivity, 2.0)

    now = time.time()
    one_hour_ago = now - 3600
    one_day_ago = now - 86400

    # Record this call
    _anomaly_history[agent_id].append((now, tool))
    _prune_cache(_anomaly_history)

    # Prune history older than 24h
    _anomaly_history[agent_id] = [
        (t, tn) for t, tn in _anomaly_history[agent_id] if t > one_day_ago
    ]

    history = _anomaly_history[agent_id]

    # Need at least 20 calls to build a baseline
    if len(history) < 20:
        return None

    # --- Volume anomaly: calls in the last hour vs average ---
    recent_calls = sum(1 for t, _ in history if t > one_hour_ago)
    hours_of_data = min((now - history[0][0]) / 3600, 24)
    if hours_of_data < 0.5:
        return None

    avg_calls_per_hour = len(history) / max(hours_of_data, 1)
    # Simple variance estimate
    volume_ratio = recent_calls / max(avg_calls_per_hour, 1)

    if volume_ratio > (1 + threshold):
        anomaly = {
            "type": "volume_spike",
            "detail": f"Call volume {volume_ratio:.1f}x above average ({recent_calls} calls/hour vs {avg_calls_per_hour:.0f} avg)",
            "severity": sensitivity,
            "action": action,
        }
        return anomaly

    # --- Tool distribution anomaly: unusual tool being called ---
    tool_counts: dict[str, int] = defaultdict(int)
    for _, tn in history:
        tool_counts[tn] += 1

    total = len(history)
    tool_frequency = tool_counts.get(tool, 0) / total

    # If this tool is <5% of historical calls but being called now, it's unusual
    if tool_frequency < 0.05 and tool_counts.get(tool, 0) > 0:
        # Only flag if they've called it before (first-ever calls aren't anomalous)
        pass  # Allow new tool exploration
    elif tool_frequency < 0.02 and total > 50:
        anomaly = {
            "type": "unusual_tool",
            "detail": f"Tool '{tool}' is rarely used ({tool_frequency:.0%} of history)",
            "severity": sensitivity,
            "action": action,
        }
        return anomaly

    # --- Velocity anomaly: calls too fast ---
    if len(history) >= 3:
        last_3_times = [t for t, _ in history[-3:]]
        interval = last_3_times[-1] - last_3_times[0]
        if interval < 0.1:  # 3 calls in under 100ms
            anomaly = {
                "type": "velocity",
                "detail": f"3 calls in {interval*1000:.0f}ms — possible automated abuse",
                "severity": sensitivity,
                "action": action,
            }
            return anomaly

    return None
