"""Tests for the audit log API — query, stats, chain verification."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_audit_log_populated(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """After a validation action, audit entries exist."""
    # Trigger an auditable action
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=auth_headers,
    )

    resp = await client.get("/api/v1/audit/", headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert len(data["entries"]) >= 1


@pytest.mark.asyncio
async def test_audit_query_filters(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """Filter audit entries by agent_id, tool, and action."""
    agent_id = agent["agent"]["id"]

    # Trigger some auditable actions
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "save_memory"},
        headers=auth_headers,
    )

    # Filter by agent_id
    resp = await client.get(
        f"/api/v1/audit/?agent_id={agent_id}", headers=auth_headers
    )
    assert resp.status_code == 200
    entries = resp.json()["entries"]
    assert all(e["agent_id"] == agent_id for e in entries)

    # Filter by tool
    resp = await client.get(
        "/api/v1/audit/?tool=search_memories", headers=auth_headers
    )
    assert resp.status_code == 200
    entries = resp.json()["entries"]
    assert all(e["tool"] == "search_memories" for e in entries)

    # Filter by action
    resp = await client.get(
        "/api/v1/audit/?action=allow", headers=auth_headers
    )
    assert resp.status_code == 200
    entries = resp.json()["entries"]
    assert all(e["action"] == "allow" for e in entries)


@pytest.mark.asyncio
async def test_audit_stats(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """GET /audit/stats returns correct aggregate counts."""
    # Generate some audit entries
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "delete_memory"},
        headers=auth_headers,
    )

    resp = await client.get("/api/v1/audit/stats", headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_events"] >= 2
    assert "by_action" in data
    assert "by_tool" in data
    assert "by_agent" in data
    assert isinstance(data["deny_rate_pct"], float)


@pytest.mark.asyncio
async def test_verify_chain(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """GET /audit/verify shows chain intact after writes."""
    # Create some audit entries
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=auth_headers,
    )
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "save_memory"},
        headers=auth_headers,
    )

    resp = await client.get("/api/v1/audit/verify", headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["verified"] is True
    assert data["entries_checked"] >= 2


@pytest.mark.asyncio
async def test_audit_no_cross_project(
    client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
    agent: dict,
):
    """Project B cannot see project A's audit entries."""
    # Create audit entries in project A
    await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=auth_headers,
    )

    # Query from project B
    resp = await client.get("/api/v1/audit/", headers=second_auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    # Project B should have zero entries (it has no agents or validation calls)
    assert data["total"] == 0
    assert len(data["entries"]) == 0
