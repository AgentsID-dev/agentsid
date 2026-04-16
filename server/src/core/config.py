"""Application configuration from environment variables."""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Immutable settings. All values from env vars prefixed with AGENTSID_."""

    model_config = {"frozen": True, "env_prefix": "AGENTSID_", "env_file": ".env"}

    # Database — required
    database_url: str

    # Signing secret — required, used for HMAC token signing
    signing_secret: str
    signing_secret_previous: str = ""  # for graceful key rotation

    # Supabase Auth
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # Email (Resend)
    resend_api_key: str = ""
    email_from: str = "AgentsID <noreply@agentsid.dev>"
    # Where admin notifications go (claim waitlist, disputes, etc).
    # Set via AGENTSID_ADMIN_EMAIL env var.
    admin_email: str = ""

    # API
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    base_url: str = "http://localhost:8000"

    # Token defaults
    default_token_ttl_hours: int = 24
    max_token_ttl_hours: int = 720  # 30 days

    # Audit
    audit_retention_days: int = 90

    # Debug mode — set to true for local development only
    debug_mode: bool = False

    # Sentry
    sentry_dsn: str = ""

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError("database_url must use postgresql+asyncpg://")
        return v

    @field_validator("signing_secret")
    @classmethod
    def signing_secret_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("AGENTSID_SIGNING_SECRET must be at least 32 characters")
        return v


settings = Settings()
