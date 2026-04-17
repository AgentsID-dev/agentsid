"""AgentsID — FastAPI application entry point.

SECURITY FIXES APPLIED:
- H1: Rate limiting via slowapi
- H5: Security headers middleware
- L5: Version removed from health endpoint
"""

import logging
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from src.api.agents import router as agents_router
from src.api.approvals import router as approvals_router
from src.api.audit import router as audit_router
from src.api.badge import router as badge_router
from src.api.claims import router as claims_router
from src.api.digest import router as digest_router
from src.api.permissions import router as permissions_router
from src.api.projects import router as projects_router
from src.api.validate import router as validate_router
from src.api.teams import router as teams_router
from src.api.webhooks import router as webhooks_router
from src.core.config import settings

logging.basicConfig(level=logging.INFO)

if settings.sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        environment="production",
    )

def _get_real_ip(request: Request) -> str:
    """Get real client IP behind Cloudflare/proxy."""
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_get_real_ip)

app = FastAPI(
    title="AgentsID",
    description="Identity and auth for AI agents",
    version="0.1.0",
    docs_url=None,  # disable in production
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=False,  # M1 fix: API key auth, not cookies
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(projects_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(permissions_router, prefix="/api/v1")
app.include_router(validate_router, prefix="/api/v1")
app.include_router(approvals_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(teams_router, prefix="/api/v1")
app.include_router(webhooks_router, prefix="/api/v1")
# Public badge endpoint — no prefix, served at /badge/:slug.svg
app.include_router(badge_router)
# Claim waitlist — see task #11 for the real GitHub OAuth verification flow
app.include_router(claims_router)
# Digest subscribe
app.include_router(digest_router)


# L3: Request size limit — reject bodies over 1MB
@app.middleware("http")
async def limit_request_size(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length:
        if int(content_length) > 1_000_000:
            return JSONResponse(status_code=413, content={"detail": "Request too large"})
    # For requests without Content-Length (chunked), we can't pre-check
    # but FastAPI/Starlette will handle body limits at the framework level
    return await call_next(request)


# H5: Security headers
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cache-Control"] = "no-store"
    import uuid
    response.headers["X-Request-ID"] = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self' https://*.supabase.co https://us.i.posthog.com https://*.ingest.us.sentry.io; "
        "frame-ancestors 'none';"
    )
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.on_event("startup")
async def run_migrations():
    """Ensure new columns exist (safe to run multiple times)."""
    from src.core.database import engine
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT"
        ))
        # Advanced permission columns
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS ip_allowlist JSONB"))
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS max_chain_depth INTEGER"))
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS budget JSONB"))
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS cooldown JSONB"))
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS sequence_requirements JSONB"))
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS session_limits JSONB"))
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS risk_score_threshold INTEGER"))
        await conn.execute(text("ALTER TABLE permission_rules ADD COLUMN IF NOT EXISTS anomaly_detection JSONB"))
        # Teams
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS teams (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                owner_email VARCHAR(255) NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS team_members (
                id SERIAL PRIMARY KEY,
                team_id VARCHAR(50) NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL,
                invited_at TIMESTAMPTZ DEFAULT NOW(),
                joined_at TIMESTAMPTZ,
                UNIQUE(team_id, email)
            )
        """))
        await conn.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_id VARCHAR(50) REFERENCES teams(id)"
        ))


@app.get("/health")
async def health():
    return {"status": "ok", "service": "agentsid"}


@app.get("/api/v1/auth/config")
async def auth_config():
    """Public endpoint — returns Supabase config for frontend auth.
    The anon key is designed to be public (Supabase architecture)."""
    return {
        "supabase_url": settings.supabase_url or None,
        "supabase_anon_key": settings.supabase_anon_key or None,
    }


STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
WEB_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "web" / "dist"
_REGISTRY_INDEX: dict | None = None
_REGISTRY_INDEX_PATH = Path(__file__).resolve().parent.parent.parent / "scanner" / "registry-index.json"


def _get_registry_index() -> dict:
    global _REGISTRY_INDEX
    if _REGISTRY_INDEX is None:
        import json
        if _REGISTRY_INDEX_PATH.exists():
            _REGISTRY_INDEX = json.loads(_REGISTRY_INDEX_PATH.read_text())
        else:
            _REGISTRY_INDEX = {}
    return _REGISTRY_INDEX


@app.get("/api/registry/{slug}")
async def registry_lookup(slug: str):
    """Look up a pre-scanned MCP server report by slug."""
    import re

    if not re.match(r'^[\w\-@./]+$', slug):
        return JSONResponse({"error": "Invalid slug"}, status_code=400)

    index = _get_registry_index()
    slug_clean = slug.replace("@", "").replace("/", "-").lstrip("-")

    entry = index.get(slug) or index.get(slug_clean)
    if not entry:
        return JSONResponse({"error": f"No registry entry found for: {slug}"}, status_code=404)

    return JSONResponse({
        "slug": slug,
        "registryUrl": f"https://agentsid.dev/registry/{slug}",
        **entry,
    })


# Serve legacy static assets (kept for backward compat — remove after full migration)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# React SPA — serve static files from dist + catch-all for client-side routing
SPA_ROUTES = {
    "/", "/dashboard", "/docs", "/guides", "/terms", "/privacy", "/blog",
    "/spec", "/hall-of-mcps", "/research",
    "/grade", "/docs/grade",  # grade system docs (proposal #1)
    "/claim",                 # maintainer claim waitlist
    "/digest",                # MCP Security Digest subscribe
    "/badges",                # embed-a-badge gallery
}


@app.get("/{full_path:path}", include_in_schema=False)
async def spa_catch_all(full_path: str):
    route = f"/{full_path}" if full_path else "/"
    # Never intercept API or legacy static routes
    if route.startswith("/api") or route.startswith("/static"):
        return JSONResponse({"detail": "Not found"}, status_code=404)
    # Try serving a static file from web/dist (JS, CSS, images, screenshots, favicon)
    if full_path:
        static_file = (WEB_DIST_DIR / full_path).resolve()
        if static_file.is_file() and str(static_file).startswith(str(WEB_DIST_DIR.resolve())):
            return FileResponse(static_file)
    # SPA routes — serve index.html for client-side routing
    if (
        route in SPA_ROUTES
        or route.startswith("/blog/")
        or route.startswith("/registry")
        or route.startswith("/claim/")
    ):
        index = WEB_DIST_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        return JSONResponse({"error": "Frontend not built"}, status_code=503)
    return JSONResponse({"detail": "Not found"}, status_code=404)
