"""AgentsID — Identity and auth for AI agents.

Quick start:

    from agentsid import AgentsID

    aid = AgentsID(project_key="aid_proj_...")

    # Register an agent
    result = await aid.register_agent(
        name="research-bot",
        on_behalf_of="user_123",
        permissions=["search_memories", "save_memory"],
    )

    # Validate token + check permission
    check = await aid.validate_token(result["token"], tool="search_memories")
"""

from agentsid.client import AgentsID
from agentsid.errors import (
    AgentsIDError,
    AuthenticationError,
    PermissionDeniedError,
    TokenExpiredError,
    TokenRevokedError,
)
from agentsid.middleware import create_mcp_middleware, validate_tool_call

__all__ = [
    "AgentsID",
    "AgentsIDError",
    "AuthenticationError",
    "PermissionDeniedError",
    "TokenExpiredError",
    "TokenRevokedError",
    "create_mcp_middleware",
    "validate_tool_call",
]
