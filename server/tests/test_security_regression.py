"""Regression tests for previously fixed security vulnerabilities.

Each test is named after the vulnerability ID from the security review.
These must never regress.
"""

import pytest
from httpx import AsyncClient

from src.core.security import generate_agent_token


@pytest.mark.asyncio
async def test_c1_validate_requires_auth(client: AsyncClient, agent: dict):
    """C1: /validate must return 401 without a project API key."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
    )

    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_c1_introspect_requires_auth(client: AsyncClient, agent: dict):
    """C1: /introspect must return 401 without a project API key."""
    resp = await client.post(
        "/api/v1/introspect",
        json={"token": agent["token"]},
    )

    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_c2_cross_project_permissions_blocked(
    client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
    agent: dict,
):
    """C2: Cannot set permissions on another project's agent."""
    agent_id = agent["agent"]["id"]

    resp = await client.put(
        f"/api/v1/agents/{agent_id}/permissions",
        json=[{"tool_pattern": "*", "action": "allow"}],
        headers=second_auth_headers,
    )

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_c3_cross_project_check_blocked(
    client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
    agent: dict,
):
    """C3: Cannot check permissions for another project's agent."""
    resp = await client.post(
        "/api/v1/check",
        json={
            "agent_id": agent["agent"]["id"],
            "tool": "search_memories",
        },
        headers=second_auth_headers,
    )

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_c4_wrong_project_token_rejected(
    client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
    agent: dict,
):
    """C4: Token from project A must be rejected when validated by project B's key."""
    resp = await client.post(
        "/api/v1/validate",
        json={"token": agent["token"], "tool": "search_memories"},
        headers=second_auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["valid"] is False


@pytest.mark.asyncio
async def test_s8_delegation_requires_valid_token(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """S8: Delegation with an invalid parent_token must fail."""
    resp = await client.post(
        "/api/v1/agents/delegate",
        json={
            "parent_agent_id": agent["agent"]["id"],
            "parent_token": "aid_tok_fake_garbage.invalid",
            "child_name": "evil-child",
            "child_permissions": ["search_memories"],
        },
        headers=auth_headers,
    )

    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_s8_delegation_revoked_parent(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """S8: Delegation with a revoked parent token must fail."""
    agent_id = agent["agent"]["id"]
    token = agent["token"]

    # Revoke the parent agent
    await client.delete(f"/api/v1/agents/{agent_id}", headers=auth_headers)

    resp = await client.post(
        "/api/v1/agents/delegate",
        json={
            "parent_agent_id": agent_id,
            "parent_token": token,
            "child_name": "evil-child",
            "child_permissions": ["search_memories"],
        },
        headers=auth_headers,
    )

    # Should fail — either 403 (revoked token) or 404 (agent not active)
    assert resp.status_code in (403, 404)
