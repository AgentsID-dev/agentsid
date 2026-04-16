"""Claim waitlist — minimal endpoint that collects maintainer interest while
the real GitHub-OAuth verification flow is under construction.

Writes to a JSONL file at data/claim-waitlist.jsonl so we don't need a DB
migration to ship. Port to a proper `claims` table once Phase A of the real
flow lands (see task #11).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.services.notifications import notify_claim_submission

router = APIRouter(prefix="/api/claims", tags=["claims"])
limiter = Limiter(key_func=get_remote_address)


# Write lock so two concurrent requests can't corrupt the JSONL file.
_WRITE_LOCK = Lock()

# Data dir lives outside src so it survives redeploys.
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_WAITLIST_PATH = _DATA_DIR / "claim-waitlist.jsonl"


class WaitlistSubmission(BaseModel):
    email: EmailStr
    github_handle: str = Field(..., min_length=1, max_length=64)
    package_slug: str = Field(..., min_length=1, max_length=200)
    notes: str | None = Field(default=None, max_length=1000)


_GH_HANDLE_RE = re.compile(r"^@?[A-Za-z0-9][A-Za-z0-9-]{0,38}$")
_SLUG_RE = re.compile(r"^[A-Za-z0-9@./_\-]+$")


@dataclass(frozen=True)
class WaitlistEntry:
    submitted_at: str
    email: str
    github_handle: str
    package_slug: str
    notes: str | None
    ip: str


def _get_real_ip(request: Request) -> str:
    cf = request.headers.get("CF-Connecting-IP")
    if cf:
        return cf
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _append_entry(entry: WaitlistEntry) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    line = json.dumps(
        {
            "submitted_at": entry.submitted_at,
            "email": entry.email,
            "github_handle": entry.github_handle,
            "package_slug": entry.package_slug,
            "notes": entry.notes,
            "ip": entry.ip,
        }
    )
    with _WRITE_LOCK:
        with _WAITLIST_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


@router.post("/waitlist")
@limiter.limit("5/hour")
async def submit_waitlist(request: Request, body: WaitlistSubmission) -> dict:
    """Accept a maintainer's interest in claiming a tool listing.

    No verification happens here — this is a temporary waitlist while the real
    GitHub-OAuth flow is built (task #11). We promise the user a 24h turnaround
    so they don't feel ghosted.

    Rate limit: 5 submissions per IP per hour. Prevents form spam without
    blocking legitimate maintainers who want to claim more than one tool.
    """
    handle = body.github_handle.lstrip("@")
    if not _GH_HANDLE_RE.fullmatch(handle):
        raise HTTPException(status_code=400, detail="Invalid GitHub handle")

    slug = body.package_slug.strip()
    if not _SLUG_RE.fullmatch(slug):
        raise HTTPException(status_code=400, detail="Invalid package slug")

    entry = WaitlistEntry(
        submitted_at=datetime.now(timezone.utc).isoformat(),
        email=str(body.email),
        github_handle=handle,
        package_slug=slug,
        notes=(body.notes or "").strip() or None,
        ip=_get_real_ip(request),
    )
    _append_entry(entry)

    # Email the admin — the source of truth lives in your inbox so we don't
    # depend on Railway volume persistence for the JSONL file.
    try:
        notify_claim_submission(
            email=entry.email,
            github_handle=entry.github_handle,
            package_slug=entry.package_slug,
            notes=entry.notes,
            ip=entry.ip,
        )
    except Exception:  # noqa: BLE001 — email failure must not block submission
        pass

    return {
        "status": "received",
        "message": (
            "Thanks — we'll verify your ownership via GitHub and email you "
            "within 24 hours."
        ),
    }
