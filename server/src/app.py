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
from slowapi.util import get_remote_address

from src.api.agents import router as agents_router
from src.api.approvals import router as approvals_router
from src.api.audit import router as audit_router
from src.api.permissions import router as permissions_router
from src.api.projects import router as projects_router
from src.api.validate import router as validate_router
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

limiter = Limiter(key_func=get_remote_address)

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
app.include_router(webhooks_router, prefix="/api/v1")


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
    response.headers["X-Request-ID"] = request.headers.get("X-Request-ID", "")
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


# Serve legacy static assets (kept for backward compat — remove after full migration)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# React SPA — serve static files from dist + catch-all for client-side routing
SPA_ROUTES = {"/", "/dashboard", "/docs", "/guides", "/terms", "/privacy", "/blog", "/spec", "/hall-of-mcps"}


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
    if route in SPA_ROUTES or route.startswith("/blog/"):
        index = WEB_DIST_DIR / "index.html"
        if index.exists():
            return FileResponse(index)
        return JSONResponse({"error": "Frontend not built"}, status_code=503)
    return JSONResponse({"detail": "Not found"}, status_code=404)
