"""Token generation, HMAC signing, and validation.

Token format: aid_tok_<base64url(json_payload)>.<base64url(hmac_signature)>
Project key format: aid_proj_<random_urlsafe_32>

Tokens are self-validating via HMAC — no database call needed for basic validation.
Revocation checks require a cache-backed database lookup.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from dataclasses import dataclass

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from src.core.config import settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key using HKDF with purpose separation."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"agentsid-api-key-encryption",
    )
    key_bytes = hkdf.derive(settings.signing_secret.encode())
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt_api_key(raw_key: str) -> str:
    """Encrypt a raw API key for storage."""
    return _get_fernet().encrypt(raw_key.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """Decrypt a stored API key."""
    return _get_fernet().decrypt(encrypted.encode()).decode()

PROJECT_KEY_PREFIX = "aid_proj_"
AGENT_TOKEN_PREFIX = "aid_tok_"


@dataclass(frozen=True)
class TokenClaims:
    """Decoded token claims."""

    sub: str  # agent ID
    prj: str  # project ID
    dby: str  # delegated by (user/agent ID)
    iat: int  # issued at (unix timestamp)
    exp: int  # expires at (unix timestamp)
    jti: str  # unique token ID (for revocation)

    @property
    def is_expired(self) -> bool:
        return time.time() > self.exp


def generate_project_key() -> tuple[str, str]:
    """Generate a project API key. Returns (raw_key, key_hash)."""
    raw = PROJECT_KEY_PREFIX + secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def hash_key(raw_key: str) -> str:
    """Hash any key for storage/lookup."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


def generate_agent_token(
    agent_id: str,
    project_id: str,
    delegated_by: str,
    ttl_seconds: int,
) -> tuple[str, str, TokenClaims]:
    """Generate a signed agent token. Returns (raw_token, token_id, claims)."""
    now = int(time.time())
    token_id = "tok_" + secrets.token_urlsafe(16)

    claims = TokenClaims(
        sub=agent_id,
        prj=project_id,
        dby=delegated_by,
        iat=now,
        exp=now + ttl_seconds,
        jti=token_id,
    )

    # Encode payload
    payload_json = json.dumps({
        "sub": claims.sub,
        "prj": claims.prj,
        "dby": claims.dby,
        "iat": claims.iat,
        "exp": claims.exp,
        "jti": claims.jti,
    }, separators=(",", ":"))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).rstrip(b"=").decode()

    # Sign
    signature = hmac.new(
        settings.signing_secret.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=").decode()

    raw_token = f"{AGENT_TOKEN_PREFIX}{payload_b64}.{sig_b64}"
    return raw_token, token_id, claims


def validate_agent_token(raw_token: str) -> TokenClaims:
    """Validate an agent token's signature and expiry. Does NOT check revocation.

    Raises ValueError if invalid.
    """
    if not isinstance(raw_token, str):
        raise ValueError("Token must be a string")
    if not raw_token.isascii():
        raise ValueError("Token must be ASCII")
    if not raw_token.startswith(AGENT_TOKEN_PREFIX):
        raise ValueError("Invalid token format")

    token_body = raw_token[len(AGENT_TOKEN_PREFIX):]
    parts = token_body.split(".")
    if len(parts) != 2:
        raise ValueError("Invalid token structure")

    payload_b64, sig_b64 = parts

    # Verify signature
    expected_sig = hmac.new(
        settings.signing_secret.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).digest()
    expected_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b"=").decode()

    if not hmac.compare_digest(sig_b64, expected_b64):
        # Fall back to previous signing secret for graceful key rotation
        if settings.signing_secret_previous:
            previous_sig = hmac.new(
                settings.signing_secret_previous.encode(),
                payload_b64.encode(),
                hashlib.sha256,
            ).digest()
            previous_b64 = base64.urlsafe_b64encode(previous_sig).rstrip(b"=").decode()
            if not hmac.compare_digest(sig_b64, previous_b64):
                raise ValueError("Invalid token signature")
        else:
            raise ValueError("Invalid token signature")

    # Decode payload
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding
    payload_json = base64.urlsafe_b64decode(payload_b64).decode()
    payload = json.loads(payload_json)

    claims = TokenClaims(
        sub=payload["sub"],
        prj=payload["prj"],
        dby=payload["dby"],
        iat=payload["iat"],
        exp=payload["exp"],
        jti=payload["jti"],
    )

    if claims.is_expired:
        raise ValueError("Token expired")

    return claims
