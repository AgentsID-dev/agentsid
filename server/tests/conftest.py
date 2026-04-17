"""Test fixtures for AgentsID server.

Uses SQLite+aiosqlite for fast, isolated tests. Overrides settings and
database dependencies before the app is imported.
"""

import os

# Override env vars BEFORE any app imports — must happen at module level
os.environ["AGENTSID_DATABASE_URL"] = "postgresql+asyncpg://fake/test"  # passes validator
os.environ["AGENTSID_SIGNING_SECRET"] = (
    "test-signing-secret-that-is-at-least-32-characters-long"
)

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON, event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.app import app
from src.core.database import get_db
from src.models.models import Base

# Disable rate limiting for tests — all limiter instances
app.state.limiter.enabled = False

from src.api.projects import limiter as projects_limiter
from src.api.validate import limiter as validate_limiter

projects_limiter.enabled = False
validate_limiter.enabled = False

# ---------------------------------------------------------------------------
# SQLite-compatible engine (JSONB columns fall back to JSON automatically
# in SQLAlchemy when using a non-PostgreSQL dialect)
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite://"  # in-memory

test_engine = create_async_engine(TEST_DB_URL, echo=False)
test_session_factory = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


# Patch JSONB + ARRAY -> JSON for SQLite before table creation
def _patch_jsonb_columns() -> None:
    """Replace PostgreSQL JSONB and ARRAY columns with generic JSON for SQLite compat."""
    from sqlalchemy.dialects.postgresql import ARRAY, JSONB

    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, JSONB):
                column.type = JSON()
            elif isinstance(column.type, ARRAY):
                # SQLite has no array type — serialise as JSON list in tests
                column.type = JSON()


_patch_jsonb_columns()


# SQLite needs "auto" begin for `with_for_update` to not error — we just
# monkeypatch it away via compile-time event
@event.listens_for(test_engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# ---------------------------------------------------------------------------
# Dependency override
# ---------------------------------------------------------------------------


async def override_get_db():
    async with test_session_factory() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # Clear identity/permission caches between tests
    from src.services.identity import _revocation_cache
    from src.services.permission import _permission_cache

    _revocation_cache.clear()
    _permission_cache.clear()


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client against the FastAPI app."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest_asyncio.fixture
async def project(client: AsyncClient):
    """Create a test project and return its response dict (with api_key)."""
    resp = await client.post("/api/v1/projects/", json={"name": "Test Project"})
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def auth_headers(project: dict):
    """Authorization headers using the test project's API key."""
    return {"Authorization": f"Bearer {project['api_key']}"}


@pytest_asyncio.fixture
async def agent(client: AsyncClient, auth_headers: dict):
    """Register a test agent with search_* and save_memory permissions."""
    resp = await client.post(
        "/api/v1/agents/",
        json={
            "name": "test-agent",
            "on_behalf_of": "user_test",
            "permissions": ["search_*", "save_memory"],
            "ttl_hours": 1,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def second_project(client: AsyncClient):
    """Create a second project for cross-project isolation tests."""
    resp = await client.post("/api/v1/projects/", json={"name": "Second Project"})
    assert resp.status_code == 201
    return resp.json()


@pytest_asyncio.fixture
async def second_auth_headers(second_project: dict):
    """Auth headers for the second project."""
    return {"Authorization": f"Bearer {second_project['api_key']}"}
