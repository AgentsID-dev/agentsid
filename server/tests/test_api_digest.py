"""Tests for the digest subscribe + unsubscribe endpoints.

Covers:
- subscribe happy-path returns a usable unsubscribe_url
- unsubscribe token is deterministic + verifiable
- tampered tokens and malformed emails are rejected (400, no JSONL write)
- rotated signing_secret_previous still accepts prior tokens
- unsubscribe appends to data/digest-unsubscribes.jsonl
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest
from httpx import AsyncClient

from src.api.digest import (
    _UNSUBS_PATH,
    _unsubscribe_token,
    _verify_unsubscribe_token,
    build_unsubscribe_url,
    limiter as digest_limiter,
)

# Turn off rate limiting for this module's tests
digest_limiter.enabled = False


@pytest.fixture(autouse=True)
def clean_unsubs_file():
    """Remove the unsubscribes JSONL before and after each test."""
    if _UNSUBS_PATH.exists():
        _UNSUBS_PATH.unlink()
    yield
    if _UNSUBS_PATH.exists():
        _UNSUBS_PATH.unlink()


# ---------------------------------------------------------------------------
# Token generation + verification (unit)
# ---------------------------------------------------------------------------


@pytest.mark.unit
def test_token_is_deterministic():
    t1 = _unsubscribe_token("alice@example.com")
    t2 = _unsubscribe_token("alice@example.com")
    assert t1 == t2
    assert len(t1) == 32
    assert all(c in "0123456789abcdef" for c in t1)


@pytest.mark.unit
def test_tokens_differ_per_email():
    a = _unsubscribe_token("alice@example.com")
    b = _unsubscribe_token("bob@example.com")
    assert a != b


@pytest.mark.unit
def test_verify_accepts_valid_token():
    email = "carol@example.com"
    token = _unsubscribe_token(email)
    assert _verify_unsubscribe_token(email, token) is True


@pytest.mark.unit
def test_verify_rejects_tampered_token():
    email = "dave@example.com"
    token = _unsubscribe_token(email)
    tampered = token[:-1] + ("0" if token[-1] != "0" else "1")
    assert _verify_unsubscribe_token(email, tampered) is False


@pytest.mark.unit
def test_verify_rejects_wrong_email():
    token = _unsubscribe_token("eve@example.com")
    assert _verify_unsubscribe_token("frank@example.com", token) is False


@pytest.mark.unit
def test_verify_accepts_previous_secret_during_rotation():
    """Tokens minted under the previous secret remain valid until rotation completes."""
    email = "grace@example.com"
    previous_secret = "previous-signing-secret-also-32-chars-minimum-length"
    legacy_token = _unsubscribe_token(email, secret=previous_secret)

    # Legacy token should fail under current secret alone
    assert _verify_unsubscribe_token(email, legacy_token) is False

    # But succeed when signing_secret_previous is configured
    with patch("src.api.digest.settings") as mock_settings:
        mock_settings.signing_secret = "test-signing-secret-that-is-at-least-32-characters-long"
        mock_settings.signing_secret_previous = previous_secret
        assert _verify_unsubscribe_token(email, legacy_token) is True


@pytest.mark.unit
def test_build_url_has_expected_shape():
    url = build_unsubscribe_url("henry@example.com")
    assert "/api/digest/unsubscribe" in url
    assert "email=henry%40example.com" in url
    assert "token=" in url
    # Token portion is the 32-char hex, URL-safe
    token = url.split("token=")[-1]
    assert len(token) == 32


# ---------------------------------------------------------------------------
# Endpoint integration
# ---------------------------------------------------------------------------


@pytest.mark.integration
@pytest.mark.asyncio
async def test_subscribe_returns_unsubscribe_url(client: AsyncClient):
    resp = await client.post(
        "/api/digest/subscribe", json={"email": "sub@example.com"}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "subscribed"
    assert body["unsubscribe_url"].startswith("http")
    assert "email=sub%40example.com" in body["unsubscribe_url"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_unsubscribe_happy_path_writes_jsonl(client: AsyncClient):
    email = "user@example.com"
    token = _unsubscribe_token(email)

    resp = await client.get(
        "/api/digest/unsubscribe", params={"email": email, "token": token}
    )

    assert resp.status_code == 200
    assert "You're unsubscribed" in resp.text
    assert email in resp.text
    assert resp.headers["content-type"].startswith("text/html")

    # Verify JSONL was written
    assert _UNSUBS_PATH.exists()
    records = [
        json.loads(line)
        for line in _UNSUBS_PATH.read_text(encoding="utf-8").splitlines()
    ]
    assert len(records) == 1
    assert records[0]["email"] == email
    assert "unsubscribed_at" in records[0]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_unsubscribe_rejects_tampered_token(client: AsyncClient):
    resp = await client.get(
        "/api/digest/unsubscribe",
        params={"email": "x@y.com", "token": "0" * 32},
    )
    assert resp.status_code == 400
    assert "Invalid link" in resp.text
    assert not _UNSUBS_PATH.exists()  # no write on failure


@pytest.mark.integration
@pytest.mark.asyncio
async def test_unsubscribe_rejects_malformed_email(client: AsyncClient):
    resp = await client.get(
        "/api/digest/unsubscribe",
        params={"email": "not-an-email", "token": "a" * 32},
    )
    assert resp.status_code == 400
    assert not _UNSUBS_PATH.exists()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_unsubscribe_normalises_email_case(client: AsyncClient):
    """Mixed-case email should verify against the lowercased token."""
    email = "mixedcase@example.com"
    token = _unsubscribe_token(email)

    resp = await client.get(
        "/api/digest/unsubscribe",
        params={"email": "MIXEDCASE@Example.COM", "token": token},
    )

    assert resp.status_code == 200
    records = [
        json.loads(line)
        for line in _UNSUBS_PATH.read_text(encoding="utf-8").splitlines()
    ]
    assert records[0]["email"] == email  # lowercased on write
