"""Subagent profile resolution.

Computes the effective permissions for a spawned subagent based on:
  - its `agent_type` (e.g. "code-reviewer", "explorer")
  - the parent agent's permissions
  - built-in defaults shipped with the server

Precedence (highest wins): caller-supplied override → built-in profile → defaults.

The resolver returns a dict shaped like:
    {
        "tools": list[str],           # allowed tool names (exact, no wildcards)
        "bash_allowlist": list[str],  # optional shell command patterns
        "max_depth": int,
        "max_duration_sec": int,
        "inherit_from_parent": bool,
    }

Callers translate `tools` + `bash_allowlist` into the existing PermissionRule
format before persisting via PermissionService.set_rules.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

_BUILTIN_PATH = Path(__file__).resolve().parent.parent / "config" / "subagent_profiles.yaml"


@dataclass(frozen=True)
class SubagentProfile:
    tools: tuple[str, ...] = ()
    bash_allowlist: tuple[str, ...] = ()
    max_depth: int = 2
    max_duration_sec: int = 600
    inherit_from_parent: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "tools": list(self.tools),
            "bash_allowlist": list(self.bash_allowlist),
            "max_depth": self.max_depth,
            "max_duration_sec": self.max_duration_sec,
            "inherit_from_parent": self.inherit_from_parent,
        }


@dataclass(frozen=True)
class ProfileBook:
    defaults: SubagentProfile
    profiles: dict[str, SubagentProfile] = field(default_factory=dict)

    def resolve(self, agent_type: str | None) -> SubagentProfile:
        if agent_type and agent_type in self.profiles:
            return self.profiles[agent_type]
        return self.defaults


def _coerce(raw: dict[str, Any], base: SubagentProfile) -> SubagentProfile:
    """Build a SubagentProfile from a YAML dict, filling unspecified fields from `base`."""
    return replace(
        base,
        tools=tuple(raw.get("tools", base.tools)),
        bash_allowlist=tuple(raw.get("bash_allowlist", base.bash_allowlist)),
        max_depth=int(raw.get("max_depth", base.max_depth)),
        max_duration_sec=int(raw.get("max_duration_sec", base.max_duration_sec)),
        inherit_from_parent=bool(raw.get("inherit_from_parent", base.inherit_from_parent)),
    )


def load_profile_book(path: Path = _BUILTIN_PATH) -> ProfileBook:
    """Load the built-in profile book from YAML.

    Raises FileNotFoundError if the file is missing — this is a hard failure
    because the server can't make safe subagent decisions without defaults.
    """
    with path.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    defaults_raw = raw.get("defaults", {})
    defaults = _coerce(defaults_raw, SubagentProfile())

    profiles = {
        name: _coerce(cfg or {}, defaults)
        for name, cfg in (raw.get("profiles") or {}).items()
    }
    return ProfileBook(defaults=defaults, profiles=profiles)


def merge_overrides(base: ProfileBook, override: dict[str, Any] | None) -> ProfileBook:
    """Layer a user-supplied override dict over a base ProfileBook.

    Override shape matches the YAML file: {"defaults": {...}, "profiles": {...}}.
    Unspecified fields fall through to base.
    """
    if not override:
        return base

    new_defaults = (
        _coerce(override["defaults"], base.defaults)
        if "defaults" in override
        else base.defaults
    )
    new_profiles = dict(base.profiles)
    for name, cfg in (override.get("profiles") or {}).items():
        fallback = base.profiles.get(name, new_defaults)
        new_profiles[name] = _coerce(cfg or {}, fallback)

    return ProfileBook(defaults=new_defaults, profiles=new_profiles)


def narrow_to_parent(
    profile: SubagentProfile, parent_tools: frozenset[str]
) -> SubagentProfile:
    """Intersect profile tools with parent's allowed tool patterns.

    Child permissions can only *narrow* parent permissions, never expand.
    If `inherit_from_parent` is True, return the parent's tools verbatim.
    """
    if profile.inherit_from_parent:
        return replace(profile, tools=tuple(sorted(parent_tools)))

    import fnmatch

    narrowed = tuple(
        t for t in profile.tools
        if any(fnmatch.fnmatch(t, pat) for pat in parent_tools)
    )
    return replace(profile, tools=narrowed)
