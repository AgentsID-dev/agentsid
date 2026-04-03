"""Tests for the /validate and /introspect endpoints — the hot path."""

import time

import pytest
from httpx import AsyncClient

from src.core.security import AGENT_TOKEN_PREFIX, generate_agent_token


@pytest.mark.asyncio
async def test_validate_allowed_tool(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """search_memories matches search_* — should be allowed."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["permission"]["allowed"] is True
    assert data["agent_id"] == agent["agent"]["id"]


@pytest.mark.asyncio
async def test_validate_denied_tool(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """delete_memory has no matching allow rule — default deny."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "delete_memory"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True  # token is valid
    assert data["permission"]["allowed"] is False  # tool is denied


@pytest.mark.asyncio
async def test_validate_wildcard(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """search_anything matches search_* wildcard pattern."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_anything"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["permission"]["allowed"] is True


@pytest.mark.asyncio
async def test_validate_expired_token(
    client: AsyncClient, auth_headers: dict, project: dict
):
    """A token with a past expiry is rejected."""
    # Generate a token that's already expired
    token, _, _ = generate_agent_token(
        agent_id="agt_expired",
        project_id=project["project"]["id"],
        delegated_by="user_test",
        ttl_seconds=-100,
    )

    resp = await client.post(
        "/api/v1/validate",
        json={"token": token, "tool": "search_memories"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False


@pytest.mark.asyncio
async def test_validate_revoked_token(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """A revoked agent's token is rejected."""
    agent_id = agent["agent"]["id"]
    token = agent["token"]

    # Revoke the agent
    revoke_resp = await client.delete(
        f"/api/v1/agents/{agent_id}", headers=auth_headers
    )
    assert revoke_resp.status_code == 204

    resp = await client.post(
        "/api/v1/validate",
        json={"token": token, "tool": "search_memories"},
        headers=auth_headers,
    )

    data = resp.json()
    assert data["valid"] is False


@pytest.mark.asyncio
async def test_validate_wrong_project(
    client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
    agent: dict,
):
    """Token from project A validated with project B's key — rejected (C4 fix)."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=second_auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False


@pytest.mark.asyncio
async def test_validate_no_auth(client: AsyncClient, agent: dict):
    """POST /validate without auth returns 401 (or 403)."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
    )

    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_validate_invalid_token(client: AsyncClient, auth_headers: dict):
    """A garbage token string is rejected."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": "aid_tok_garbage.nonsense", "tool": "search_memories"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False


@pytest.mark.asyncio
async def test_validate_tool_name_sql_injection(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """Tool name with SQL injection characters is rejected by regex validation (422)."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "'; DROP TABLE agents;--"},
        headers=auth_headers,
    )

    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_validate_logs_to_audit(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """After a validation call, an audit entry is created."""
    # Perform a validation
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=auth_headers,
    )

    # Check audit log
    audit_resp = await client.get("/api/v1/audit/", headers=auth_headers)
    assert audit_resp.status_code == 200
    entries = audit_resp.json()["entries"]
    assert len(entries) >= 1

    # At least one entry should reference the agent and tool
    matching = [
        e
        for e in entries
        if e["agent_id"] == agent["agent"]["id"] and e["tool"] == "search_memories"
    ]
    assert len(matching) >= 1


@pytest.mark.asyncio
async def test_introspect(client: AsyncClient, auth_headers: dict, agent: dict):
    """POST /introspect returns full claims, permissions, and delegation chain."""
    resp = await client.post(
        "/api/v1/introspect",
        json={"token": agent["token"]},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["active"] is True
    assert data["claims"]["sub"] == agent["agent"]["id"]
    assert data["claims"]["dby"] == "user_test"
    assert "permissions" in data
    assert "delegation_chain" in data

    # Permissions should include the ones set at registration
    patterns = {r["tool_pattern"] for r in data["permissions"]}
    assert "search_*" in patterns
    assert "save_memory" in patterns
