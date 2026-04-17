"""Digest subscribe endpoint — collects emails for the weekly MCP Security Digest.

Same pattern as claims waitlist: validates email, appends to JSONL, emails admin.

Also exposes /unsubscribe via HMAC token (CAN-SPAM requirement) — stateless,
no DB lookup needed, compatible with signing_secret_previous rotation.
"""

from __future__ import annotations

import hmac
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
from html import escape as html_escape
from pathlib import Path
from threading import Lock
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from src.services.notifications import _send_email
from src.core.config import settings

router = APIRouter(prefix="/api/digest", tags=["digest"])
limiter = Limiter(key_func=get_remote_address)

_WRITE_LOCK = Lock()
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_SUBS_PATH = _DATA_DIR / "digest-subscribers.jsonl"
_UNSUBS_PATH = _DATA_DIR / "digest-unsubscribes.jsonl"

_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_TOKEN_NAMESPACE = b"agentsid.digest.unsubscribe.v1"


def _unsubscribe_token(email: str, *, secret: str | None = None) -> str:
    """Deterministic 32-hex-char HMAC token for a given subscriber email.

    Namespaced so these tokens cannot be substituted for any other HMAC use in
    the app. Returns 128-bit output — long enough to resist online guessing
    under the 5/hour rate limit, short enough to fit comfortably in a URL.
    """
    key = (secret if secret is not None else settings.signing_secret).encode()
    mac = hmac.new(key, _TOKEN_NAMESPACE + b"|" + email.encode("utf-8"), sha256)
    return mac.hexdigest()[:32]


def _verify_unsubscribe_token(email: str, token: str) -> bool:
    """Constant-time verify; accepts current + previous signing secret."""
    candidates = [_unsubscribe_token(email)]
    if settings.signing_secret_previous:
        candidates.append(
            _unsubscribe_token(email, secret=settings.signing_secret_previous)
        )
    return any(hmac.compare_digest(token, c) for c in candidates)


def build_unsubscribe_url(email: str) -> str:
    """Public helper — Voice/email templates call this to get the footer link."""
    token = _unsubscribe_token(email)
    return (
        f"{settings.base_url.rstrip('/')}/api/digest/unsubscribe"
        f"?email={quote(email, safe='')}&token={token}"
    )


class SubscribeBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)


def _get_real_ip(request: Request) -> str:
    cf = request.headers.get("CF-Connecting-IP")
    if cf:
        return cf
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@dataclass(frozen=True)
class SubEntry:
    subscribed_at: str
    email: str
    ip: str


def _append(entry: SubEntry) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    line = json.dumps({
        "subscribed_at": entry.subscribed_at,
        "email": entry.email,
        "ip": entry.ip,
    })
    with _WRITE_LOCK:
        with _SUBS_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


@router.post("/subscribe")
@limiter.limit("5/hour")
async def subscribe(request: Request, body: SubscribeBody) -> dict:
    """Subscribe an email to the MCP Security Digest."""
    email = body.email.strip().lower()
    if not _EMAIL_RE.fullmatch(email):
        raise HTTPException(status_code=400, detail="Invalid email")

    entry = SubEntry(
        subscribed_at=datetime.now(timezone.utc).isoformat(),
        email=email,
        ip=_get_real_ip(request),
    )
    _append(entry)

    # Notify admin — escape all user-influenced fields even though the regex
    # rejects whitespace and @, because `<`, `>`, `"`, `'` and `&` still pass.
    safe_email = html_escape(email, quote=True)
    safe_ip = html_escape(entry.ip, quote=True)
    safe_ts = html_escape(entry.subscribed_at, quote=True)
    if settings.admin_email:
        try:
            _send_email(
                to=settings.admin_email,
                subject=f"Digest subscriber: {email}",
                html=(
                    "<h2>New digest subscriber</h2>"
                    f"<p><strong>{safe_email}</strong> just subscribed to the MCP Security Digest.</p>"
                    f'<p style="color:#999;font-size:12px;">IP: {safe_ip} · {safe_ts}</p>'
                ),
            )
        except Exception:
            pass

    return {
        "status": "subscribed",
        "message": "You're in. First issue lands Monday morning.",
        "unsubscribe_url": build_unsubscribe_url(email),
    }


def _append_unsubscribe(email: str, ip: str) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    line = json.dumps(
        {
            "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
            "email": email,
            "ip": ip,
        }
    )
    with _WRITE_LOCK:
        with _UNSUBS_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


_UNSUB_HTML_OK = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Unsubscribed · AgentsID</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#09090b;color:#e4e4e7;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px}
.card{max-width:480px;text-align:center}
h1{color:#f59e0b;font-size:24px;margin:0 0 12px}
p{color:#a1a1aa;line-height:1.6}
a{color:#f59e0b}
</style></head><body><div class="card">
<h1>You're unsubscribed</h1>
<p>We've removed <strong>{email}</strong> from the MCP Security Digest. No more emails from this list.</p>
<p><a href="https://agentsid.dev">Return to agentsid.dev</a></p>
</div></body></html>"""

_UNSUB_HTML_ERR = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Invalid unsubscribe link · AgentsID</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#09090b;color:#e4e4e7;
display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:24px}
.card{max-width:480px;text-align:center}
h1{color:#ef4444;font-size:24px;margin:0 0 12px}
p{color:#a1a1aa;line-height:1.6}
a{color:#f59e0b}
</style></head><body><div class="card">
<h1>Invalid link</h1>
<p>This unsubscribe link is invalid or has been tampered with. If you want off the list, reply to any digest email with &quot;unsubscribe&quot; and we'll remove you manually.</p>
<p><a href="https://agentsid.dev">Return to agentsid.dev</a></p>
</div></body></html>"""


@router.get("/unsubscribe", response_class=HTMLResponse)
@limiter.limit("20/hour")
async def unsubscribe(request: Request, email: str, token: str) -> HTMLResponse:
    """One-click unsubscribe (CAN-SPAM compliant).

    Tokens are deterministic HMAC over email — stateless, no DB lookup. Returns
    HTML 200 on success or 400 on invalid token so inbox-provider prefetch
    doesn't unsubscribe users accidentally (prefetchers typically follow GET
    but don't render HTML, and unsubscribe is idempotent here anyway).
    """
    email_clean = email.strip().lower()
    if not _EMAIL_RE.fullmatch(email_clean):
        return HTMLResponse(content=_UNSUB_HTML_ERR, status_code=400)
    if not _verify_unsubscribe_token(email_clean, token):
        return HTMLResponse(content=_UNSUB_HTML_ERR, status_code=400)

    _append_unsubscribe(email_clean, _get_real_ip(request))

    # Escape before reflecting into HTML — the regex rejects whitespace and @
    # but permits `<`, `>`, `"`, `'` and `&`, which would otherwise allow XSS.
    return HTMLResponse(
        content=_UNSUB_HTML_OK.replace("{email}", html_escape(email_clean, quote=True)),
        status_code=200,
    )
