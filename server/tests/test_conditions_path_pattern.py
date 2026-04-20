"""Tests for the path_pattern special-case in _matches_conditions.

Preset authors write file-read rules as:

    tool_pattern: file.read[.env]
    conditions: {path_pattern: ".env"}

and expect the rule to fire on any Read call whose file_path basename matches
the `.env` glob. The default `_matches_conditions` implementation treats
`path_pattern` as a required param key (params['path_pattern']), which no
client sends — so the rule silently skipped. This module tests the explicit
glob-against-file_path fallback.
"""

from __future__ import annotations

from src.services.permission import _matches_conditions, _matches_path_pattern


# ── Direct _matches_path_pattern helper ──────────────────────────────────────


def test_path_pattern_exact_basename():
    # `.env` matches only the literal basename `.env`
    assert _matches_path_pattern(".env", {"file_path": "/Users/me/project/.env"})
    assert _matches_path_pattern(".env", {"file_path": ".env"})
    assert _matches_path_pattern(".env", {"file_path": "./.env"})
    # Not a match — basename is `.env.local` not `.env`
    assert not _matches_path_pattern(".env", {"file_path": "/app/.env.local"})


def test_path_pattern_wildcard_suffix():
    assert _matches_path_pattern("*.pem", {"file_path": "/certs/server.pem"})
    assert _matches_path_pattern("*.pem", {"file_path": "server.pem"})
    assert _matches_path_pattern("*.key", {"file_path": "/secrets/api.key"})
    assert not _matches_path_pattern("*.pem", {"file_path": "/certs/server.key"})


def test_path_pattern_list_of_alternatives():
    # List-of-allowed-patterns matches if any pattern hits
    assert _matches_path_pattern([".env", "*.pem"], {"file_path": "/certs/x.pem"})
    assert _matches_path_pattern([".env", "*.pem"], {"file_path": "/.env"})
    assert not _matches_path_pattern([".env", "*.pem"], {"file_path": "/app/main.py"})


def test_path_pattern_missing_file_path_fails_closed():
    # No file_path = conditions unmet = fail-closed
    assert not _matches_path_pattern(".env", {})
    assert not _matches_path_pattern(".env", {"command": "ls"})
    assert not _matches_path_pattern(".env", {"file_path": ""})


def test_path_pattern_non_string_pattern_ignored():
    # Defensive: if someone stores a non-string in allowed values, skip it
    # rather than raise. No match = fail-closed.
    assert not _matches_path_pattern(123, {"file_path": "/.env"})  # type: ignore[arg-type]
    assert not _matches_path_pattern([None, 42], {"file_path": "/.env"})  # type: ignore[list-item]


# ── Full _matches_conditions integration ─────────────────────────────────────


def test_conditions_with_path_pattern_env_hit():
    """This is the exact preset-stored shape that was failing in prod."""
    conditions = {"path_pattern": ".env"}
    params = {"file_path": "/Users/steven/agentsid/server/.env"}
    assert _matches_conditions(conditions, params) is True


def test_conditions_with_path_pattern_env_miss():
    conditions = {"path_pattern": ".env"}
    params = {"file_path": "/Users/steven/agentsid/server/main.py"}
    assert _matches_conditions(conditions, params) is False


def test_conditions_with_path_pattern_pem_hit():
    conditions = {"path_pattern": "*.pem"}
    params = {"file_path": "/etc/ssl/server.pem"}
    assert _matches_conditions(conditions, params) is True


def test_conditions_with_path_pattern_and_other_keys():
    """Multiple conditions — all must match (AND)."""
    conditions = {"path_pattern": ".env", "customer_id": "cust_42"}
    # path_pattern matches but customer_id missing → fail
    assert not _matches_conditions(
        conditions, {"file_path": "/.env"}
    )
    # Both match → pass
    assert _matches_conditions(
        conditions, {"file_path": "/.env", "customer_id": "cust_42"}
    )
    # path_pattern misses → fail
    assert not _matches_conditions(
        conditions, {"file_path": "/main.py", "customer_id": "cust_42"}
    )


def test_conditions_without_path_pattern_still_works():
    """Unrelated conditions don't trigger the path_pattern path."""
    assert _matches_conditions({"region": "us-east-1"}, {"region": "us-east-1"}) is True
    assert _matches_conditions({"region": "us-east-1"}, {"region": "eu-west-2"}) is False
    assert _matches_conditions({"region": "us-east-1"}, {}) is False


def test_conditions_empty_is_no_op():
    assert _matches_conditions(None, None) is True
    assert _matches_conditions({}, {"file_path": "/.env"}) is True
