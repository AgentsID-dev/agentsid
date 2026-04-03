"""Tests for agent identity API — registration, listing, revocation, refresh."""

import json

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_agent(client: AsyncClient, auth_headers: dict):
    """POST /agents/ returns 201 with agent details and token."""
    resp = await client.post(
        "/api/v1/agents/",
        json={
            "name": "my-agent",
            "on_behalf_of": "user_123",
            "ttl_hours": 2,
        },
        headers=auth_headers,
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["agent"]["id"].startswith("agt_")
    assert data["agent"]["name"] == "my-agent"
    assert data["agent"]["status"] == "active"
    assert data["agent"]["created_by"] == "user_123"
    assert data["token"].startswith("aid_tok_")
    assert data["token_id"].startswith("tok_")


@pytest.mark.asyncio
async def test_register_agent_with_permissions(
    client: AsyncClient, auth_headers: dict
):
    """Permissions passed at registration are set correctly."""
    resp = await client.post(
        "/api/v1/agents/",
        json={
            "name": "perm-agent",
            "on_behalf_of": "user_perm",
            "permissions": ["read_*", "write_docs"],
        },
        headers=auth_headers,
    )

    assert resp.status_code == 201
    data = resp.json()
    agent_id = data["agent"]["id"]

    # Verify permissions were persisted
    perm_resp = await client.get(
        f"/api/v1/agents/{agent_id}/permissions",
        headers=auth_headers,
    )
    assert perm_resp.status_code == 200
    rules = perm_resp.json()["rules"]
    patterns = {r["tool_pattern"] for r in rules}
    assert "read_*" in patterns
    assert "write_docs" in patterns


@pytest.mark.asyncio
async def test_register_agent_no_auth(client: AsyncClient):
    """POST /agents/ without auth returns 401 (or 403)."""
    resp = await client.post(
        "/api/v1/agents/",
        json={"name": "bad-agent", "on_behalf_of": "user_x"},
    )

    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_register_agent_invalid_key(client: AsyncClient):
    """POST /agents/ with an invalid API key returns 401."""
    resp = await client.post(
        "/api/v1/agents/",
        json={"name": "bad-agent", "on_behalf_of": "user_x"},
        headers={"Authorization": "Bearer aid_proj_invalid_garbage_key"},
    )

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_agents(client: AsyncClient, auth_headers: dict, agent: dict):
    """GET /agents/ returns registered agents."""
    resp = await client.get("/api/v1/agents/", headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    ids = [a["id"] for a in data]
    assert agent["agent"]["id"] in ids


@pytest.mark.asyncio
async def test_get_agent(client: AsyncClient, auth_headers: dict, agent: dict):
    """GET /agents/{id} returns the correct agent."""
    agent_id = agent["agent"]["id"]
    resp = await client.get(f"/api/v1/agents/{agent_id}", headers=auth_headers)

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == agent_id
    assert data["name"] == "test-agent"


@pytest.mark.asyncio
async def test_get_agent_wrong_project(
    client: AsyncClient,
    auth_headers: dict,
    second_auth_headers: dict,
    agent: dict,
):
    """GET /agents/{id} from another project returns 404 (project isolation)."""
    agent_id = agent["agent"]["id"]
    resp = await client.get(
        f"/api/v1/agents/{agent_id}", headers=second_auth_headers
    )

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_revoke_agent(client: AsyncClient, auth_headers: dict, agent: dict):
    """DELETE /agents/{id} revokes agent, token becomes invalid."""
    agent_id = agent["agent"]["id"]
    token = agent["token"]

    # Revoke
    resp = await client.delete(f"/api/v1/agents/{agent_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Token should now be invalid
    validate_resp = await client.post(
        "/api/v1/validate",
        json={"token": token, "tool": "search_memories"},
        headers=auth_headers,
    )
    data = validate_resp.json()
    assert data["valid"] is False


@pytest.mark.asyncio
async def test_revoke_agent_not_found(client: AsyncClient, auth_headers: dict):
    """DELETE /agents/{nonexistent} returns 404."""
    resp = await client.delete(
        "/api/v1/agents/agt_nonexistent", headers=auth_headers
    )

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, auth_headers: dict, agent: dict):
    """POST /agents/{id}/refresh issues new token, old token is revoked."""
    agent_id = agent["agent"]["id"]
    old_token = agent["token"]

    resp = await client.post(
        f"/api/v1/agents/{agent_id}/refresh",
        json={"ttl_hours": 2},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    data = resp.json()
    new_token = data["token"]
    assert new_token != old_token
    assert new_token.startswith("aid_tok_")

    # New token should work
    validate_resp = await client.post(
        "/api/v1/validate",
        json={"token": new_token, "tool": "search_memories"},
        headers=auth_headers,
    )
    assert validate_resp.json()["valid"] is True

    # Old token should be revoked
    validate_old = await client.post(
        "/api/v1/validate",
        json={"token": old_token, "tool": "search_memories"},
        headers=auth_headers,
    )
    assert validate_old.json()["valid"] is False


@pytest.mark.asyncio
async def test_update_agent_name(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """PATCH /agents/{id} updates agent name."""
    agent_id = agent["agent"]["id"]
    resp = await client.patch(
        f"/api/v1/agents/{agent_id}",
        json={"name": "renamed-agent"},
        headers=auth_headers,
    )

    assert resp.status_code == 200
    assert resp.json()["name"] == "renamed-agent"


@pytest.mark.asyncio
async def test_update_agent_metadata_too_large(
    client: AsyncClient, auth_headers: dict, agent: dict
):
    """PATCH /agents/{id} with metadata > 10KB returns 422."""
    agent_id = agent["agent"]["id"]
    big_metadata = {"data": "x" * 11_000}

    resp = await client.patch(
        f"/api/v1/agents/{agent_id}",
        json={"metadata": big_metadata},
        headers=auth_headers,
    )

    assert resp.status_code == 422
