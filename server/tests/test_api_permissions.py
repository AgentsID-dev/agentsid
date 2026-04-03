"""Tests for the permission engine API — rules, checks, wildcards, conditions."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_set_permissions(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """PUT /agents/{id}/permissions replaces all rules."""
    agent_id = agent["agent"]["id"]
    rules = [
        {"tool_pattern": "read_*", "action": "allow", "priority": 0},
        {"tool_pattern": "write_docs", "action": "allow", "priority": 1},
    ]

    resp = await client.put(
        f"/api/v1/agents/{agent_id}/permissions",
        json=rules,
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_id"] == agent_id
    assert len(data["rules"]) == 2
    patterns = {r["tool_pattern"] for r in data["rules"]}
    assert patterns == {"read_*", "write_docs"}


@pytest.mark.asyncio
async def test_get_permissions(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """GET /agents/{id}/permissions returns current rules."""
    agent_id = agent["agent"]["id"]

    resp = await client.get(
        f"/api/v1/agents/{agent_id}/permissions",
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_id"] == agent_id
    # Agent fixture sets search_* and save_memory
    patterns = {r["tool_pattern"] for r in data["rules"]}
    assert "search_*" in patterns
    assert "save_memory" in patterns


@pytest.mark.asyncio
async def test_check_permission_allowed(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """POST /check with an exact-match tool returns allowed."""
    resp = await client.post(
        "/api/v1/check",
        json={
            "agent_id": agent["agent"]["id"],
            "tool": "save_memory",
        },
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["allowed"] is True


@pytest.mark.asyncio
async def test_check_permission_denied(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """POST /check with an unmatched tool returns denied (default deny)."""
    resp = await client.post(
        "/api/v1/check",
        json={
            "agent_id": agent["agent"]["id"],
            "tool": "delete_everything",
        },
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["allowed"] is False


@pytest.mark.asyncio
async def test_check_permission_wildcard(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """POST /check with a tool matching a wildcard pattern returns allowed."""
    resp = await client.post(
        "/api/v1/check",
        json={
            "agent_id": agent["agent"]["id"],
            "tool": "search_files",
        },
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["allowed"] is True


@pytest.mark.asyncio
async def test_deny_beats_allow(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """When both deny and allow rules match, deny takes precedence."""
    agent_id = agent["agent"]["id"]

    # Set deny + allow for the same pattern
    await client.put(
        f"/api/v1/agents/{agent_id}/permissions",
        json=[
            {"tool_pattern": "dangerous_*", "action": "deny", "priority": 10},
            {"tool_pattern": "dangerous_*", "action": "allow", "priority": 5},
        ],
        headers=auth_headers,
    )

    resp = await client.post(
        "/api/v1/check",
        json={"agent_id": agent_id, "tool": "dangerous_action"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["allowed"] is False


@pytest.mark.asyncio
async def test_conditions_match(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """Allow rule with conditions — allowed when conditions met."""
    agent_id = agent["agent"]["id"]

    await client.put(
        f"/api/v1/agents/{agent_id}/permissions",
        json=[
            {
                "tool_pattern": "file_read",
                "action": "allow",
                "priority": 0,
                "conditions": {"path": ["/tmp", "/home"]},
            },
        ],
        headers=auth_headers,
    )

    resp = await client.post(
        "/api/v1/check",
        json={
            "agent_id": agent_id,
            "tool": "file_read",
            "params": {"path": "/tmp"},
        },
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["allowed"] is True


@pytest.mark.asyncio
async def test_conditions_fail_closed(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """Allow rule with conditions — denied when params missing (H4 fix: fail-closed)."""
    agent_id = agent["agent"]["id"]

    await client.put(
        f"/api/v1/agents/{agent_id}/permissions",
        json=[
            {
                "tool_pattern": "file_read",
                "action": "allow",
                "priority": 0,
                "conditions": {"path": ["/tmp"]},
            },
        ],
        headers=auth_headers,
    )

    # No params at all
    resp = await client.post(
        "/api/v1/check",
        json={"agent_id": agent_id, "tool": "file_read"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["allowed"] is False


@pytest.mark.asyncio
async def test_cross_project_blocked(
    client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
    agent: dict,
):
    """Cannot read or write another project's agent permissions."""
    agent_id = agent["agent"]["id"]

    # Try to GET permissions using the wrong project's key
    resp_get = await client.get(
        f"/api/v1/agents/{agent_id}/permissions",
        headers=second_auth_headers,
    )
    assert resp_get.status_code == 404

    # Try to PUT permissions using the wrong project's key
    resp_put = await client.put(
        f"/api/v1/agents/{agent_id}/permissions",
        json=[{"tool_pattern": "*", "action": "allow"}],
        headers=second_auth_headers,
    )
    assert resp_put.status_code == 404
