"""Tests for project creation API."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    """POST /projects/ returns 201 with project id and api_key."""
    resp = await client.post("/api/v1/projects/", json={"name": "My Project"})

    assert resp.status_code == 201
    data = resp.json()
    assert "project" in data
    assert "api_key" in data
    assert data["project"]["id"].startswith("proj_")
    assert data["api_key"].startswith("aid_proj_")
    assert data["project"]["name"] == "My Project"
    assert data["project"]["plan"] == "free"


@pytest.mark.asyncio
async def test_create_project_with_email(client: AsyncClient):
    """Email field is accepted when valid."""
    resp = await client.post(
        "/api/v1/projects/",
        json={"name": "Email Project", "email": "test@example.com"},
    )

    assert resp.status_code == 201
    data = resp.json()
    assert data["project"]["name"] == "Email Project"


@pytest.mark.asyncio
async def test_create_project_invalid_email(client: AsyncClient):
    """Invalid email format is rejected with 422."""
    resp = await client.post(
        "/api/v1/projects/",
        json={"name": "Bad Email Project", "email": "not-an-email"},
    )

    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_project_empty_name(client: AsyncClient):
    """Empty name is rejected with 422."""
    resp = await client.post("/api/v1/projects/", json={"name": ""})

    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_project_returns_unique_keys(client: AsyncClient):
    """Two projects get different API keys and IDs."""
    resp1 = await client.post("/api/v1/projects/", json={"name": "Project A"})
    resp2 = await client.post("/api/v1/projects/", json={"name": "Project B"})

    assert resp1.status_code == 201
    assert resp2.status_code == 201

    data1 = resp1.json()
    data2 = resp2.json()

    assert data1["api_key"] != data2["api_key"]
    assert data1["project"]["id"] != data2["project"]["id"]
