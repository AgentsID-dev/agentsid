"""Unit tests for subagent profile resolution + /agents/derive endpoint."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from src.services.subagent_profiles import (
    ProfileBook,
    SubagentProfile,
    load_profile_book,
    merge_overrides,
    narrow_to_parent,
)


# ---------------------------------------------------------------------------
# Profile resolution
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_load_builtin_profile_book_has_expected_profiles():
    book = load_profile_book()
    assert "code-reviewer" in book.profiles
    assert "explorer" in book.profiles
    assert "build-error-resolver" in book.profiles
    assert "general-purpose" in book.profiles
    # Defaults must be safe — read-only tools only.
    assert set(book.defaults.tools) <= {"Read", "Grep", "Glob"}
    assert book.defaults.inherit_from_parent is False


@pytest.mark.unit
def test_resolve_unknown_type_falls_back_to_defaults():
    book = load_profile_book()
    resolved = book.resolve("some-custom-subagent")
    assert resolved == book.defaults


@pytest.mark.unit
def test_resolve_known_type_returns_profile():
    book = load_profile_book()
    resolved = book.resolve("code-reviewer")
    assert "Bash" in resolved.tools
    assert resolved.bash_allowlist  # non-empty


@pytest.mark.unit
def test_merge_overrides_adds_new_profile():
    base = load_profile_book()
    merged = merge_overrides(base, {
        "profiles": {
            "custom-reviewer": {"tools": ["Read", "Grep"], "max_depth": 0}
        }
    })
    assert "custom-reviewer" in merged.profiles
    assert merged.profiles["custom-reviewer"].tools == ("Read", "Grep")
    assert merged.profiles["custom-reviewer"].max_depth == 0


@pytest.mark.unit
def test_merge_overrides_shadows_builtin():
    base = load_profile_book()
    merged = merge_overrides(base, {
        "profiles": {
            "code-reviewer": {"tools": ["Read"]}  # drop Bash
        }
    })
    assert merged.profiles["code-reviewer"].tools == ("Read",)
    # Other profiles untouched
    assert merged.profiles["explorer"] == base.profiles["explorer"]


@pytest.mark.unit
def test_merge_overrides_none_returns_base():
    base = load_profile_book()
    assert merge_overrides(base, None) is base


@pytest.mark.unit
def test_narrow_to_parent_intersects_tools():
    profile = SubagentProfile(tools=("Read", "Grep", "Bash"))
    narrowed = narrow_to_parent(profile, frozenset({"Read", "Grep"}))
    assert set(narrowed.tools) == {"Read", "Grep"}


@pytest.mark.unit
def test_narrow_to_parent_inherits_when_flag_set():
    profile = SubagentProfile(inherit_from_parent=True, tools=("Read",))
    narrowed = narrow_to_parent(profile, frozenset({"Edit", "Bash", "Read"}))
    assert set(narrowed.tools) == {"Edit", "Bash", "Read"}


@pytest.mark.unit
def test_narrow_to_parent_handles_wildcard_parent_patterns():
    profile = SubagentProfile(tools=("search_foo", "save_memory"))
    narrowed = narrow_to_parent(profile, frozenset({"search_*", "save_memory"}))
    assert set(narrowed.tools) == {"search_foo", "save_memory"}


# ---------------------------------------------------------------------------
# /agents/derive endpoint
# ---------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.asyncio
async def test_derive_happy_path(client: AsyncClient, agent: dict, auth_headers: dict):
    """Parent with search_* and save_memory spawns an explorer subagent."""
    resp = await client.post(
        "/api/v1/agents/derive",
        headers=auth_headers,
        json={
            "parent_agent_id": agent["agent"]["id"],
            "parent_token": agent["token"],
            "agent_type": "explorer",
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["agent"]["agent_type"] == "explorer"
    assert body["agent"]["parent_agent_id"] == agent["agent"]["id"]
    assert body["token"]  # new child token issued


@pytest.mark.integration
@pytest.mark.asyncio
async def test_derive_unknown_type_uses_defaults(
    client: AsyncClient, agent: dict, auth_headers: dict
):
    """Unknown subagent type falls back to safe default profile.

    Parent has search_* + save_memory. Default profile tools are Read/Grep/Glob,
    none of which intersect — so the derive should fail with zero-tool error.
    """
    resp = await client.post(
        "/api/v1/agents/derive",
        headers=auth_headers,
        json={
            "parent_agent_id": agent["agent"]["id"],
            "parent_token": agent["token"],
            "agent_type": "never-heard-of-this-one",
        },
    )
    # Default tools (Read/Grep/Glob) don't intersect parent's (search_*, save_memory)
    # so derivation should deny with a clear reason.
    assert resp.status_code == 403
    assert "zero tools" in resp.json()["detail"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_derive_override_expands_known_profile(
    client: AsyncClient, client_with_broad_agent_tools
):
    """Caller-supplied override narrows an explorer profile further."""
    agent, auth_headers, c = client_with_broad_agent_tools
    resp = await c.post(
        "/api/v1/agents/derive",
        headers=auth_headers,
        json={
            "parent_agent_id": agent["agent"]["id"],
            "parent_token": agent["token"],
            "agent_type": "explorer",
            "override": {
                "profiles": {"explorer": {"tools": ["Read"]}}
            },
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    # Only Read made it through
    assert body["agent"]["metadata"]["profile"]["tools"] == ["Read"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_derive_rejects_invalid_parent_token(
    client: AsyncClient, agent: dict, auth_headers: dict
):
    resp = await client.post(
        "/api/v1/agents/derive",
        headers=auth_headers,
        json={
            "parent_agent_id": agent["agent"]["id"],
            "parent_token": "tok_not_a_real_token",
            "agent_type": "explorer",
        },
    )
    assert resp.status_code == 403


@pytest.mark.integration
@pytest.mark.asyncio
async def test_derive_rejects_wrong_project_token(
    client: AsyncClient,
    agent: dict,
    second_auth_headers: dict,
):
    """Token from project A cannot derive under project B's API key."""
    resp = await client.post(
        "/api/v1/agents/derive",
        headers=second_auth_headers,
        json={
            "parent_agent_id": agent["agent"]["id"],
            "parent_token": agent["token"],
            "agent_type": "explorer",
        },
    )
    assert resp.status_code in (403, 404)


# ---------------------------------------------------------------------------
# Helper fixture: parent agent with broad enough permissions for explorer
# ---------------------------------------------------------------------------


import pytest_asyncio


@pytest_asyncio.fixture
async def client_with_broad_agent_tools(client: AsyncClient, auth_headers: dict):
    """Register an agent with Read/Grep/Glob/WebFetch so explorer derivation works."""
    resp = await client.post(
        "/api/v1/agents/",
        json={
            "name": "parent-with-explorer-tools",
            "on_behalf_of": "user_test",
            "permissions": ["Read", "Grep", "Glob", "WebFetch"],
            "ttl_hours": 1,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json(), auth_headers, client
