"""AgentsID MCP middleware for Python.

Drop-in middleware for Python MCP servers. Validates agent tokens,
checks per-tool permissions, and blocks unauthorized calls.

Usage:
    from agentsid import create_mcp_middleware

    middleware = create_mcp_middleware(project_key="aid_proj_...")

    # In your MCP tool handler:
    async def my_tool(params, context):
        auth = await middleware.validate(bearer_token, "my_tool", params)
        # auth.permission.allowed is True/False
"""

from __future__ import annotations

import httpx

from agentsid.errors import (
    AgentsIDError,
    PermissionDeniedError,
    TokenExpiredError,
    TokenRevokedError,
)

DEFAULT_BASE_URL = "https://agentsid.dev"


async def validate_tool_call(
    project_key: str,
    token: str,
    tool: str,
    params: dict | None = None,
    base_url: str = DEFAULT_BASE_URL,
) -> dict:
    """Validate a tool call against AgentsID. Returns validation result."""
    url = f"{base_url.rstrip('/')}/api/v1/validate"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            url,
            json={"token": token, "tool": tool, "params": params},
            headers={"Content-Type": "application/json"},
        )

    if not response.is_success:
        return {"valid": False, "reason": f"Validation failed: {response.status_code}"}

    return response.json()


class MCPMiddleware:
    """MCP middleware instance — validates tool calls against AgentsID."""

    def __init__(
        self,
        project_key: str,
        base_url: str = DEFAULT_BASE_URL,
        skip_tools: list[str] | None = None,
        on_denied: object | None = None,
    ) -> None:
        self._project_key = project_key
        self._base_url = base_url.rstrip("/")
        self._skip_tools = set(skip_tools or [])
        self._on_denied = on_denied

    async def validate(
        self, token: str, tool: str, params: dict | None = None
    ) -> dict:
        """Validate a tool call. Raises on denial unless on_denied is set."""
        if tool in self._skip_tools:
            return {"valid": True, "reason": "Tool in skip list"}

        result = await validate_tool_call(
            self._project_key, token, tool, params, self._base_url
        )

        if not result.get("valid"):
            reason = result.get("reason", "Unknown")
            if "expired" in reason:
                raise TokenExpiredError()
            if "revoked" in reason:
                raise TokenRevokedError()

        permission = result.get("permission", {})
        if permission and not permission.get("allowed"):
            reason = permission.get("reason", "Denied")
            if self._on_denied:
                self._on_denied(tool, reason)
            else:
                raise PermissionDeniedError(tool, reason)

        return result

    async def is_allowed(self, token: str, tool: str) -> bool:
        """Quick check — returns True/False without raising."""
        try:
            result = await validate_tool_call(
                self._project_key, token, tool, base_url=self._base_url
            )
            return result.get("valid", False) and result.get("permission", {}).get("allowed", False)
        except Exception:
            return False


def create_mcp_middleware(
    project_key: str,
    base_url: str = DEFAULT_BASE_URL,
    skip_tools: list[str] | None = None,
) -> MCPMiddleware:
    """Create an MCP middleware instance.

    Args:
        project_key: Your AgentsID project key (aid_proj_...)
        base_url: AgentsID server URL
        skip_tools: Tool names to skip validation for
    """
    return MCPMiddleware(
        project_key=project_key,
        base_url=base_url,
        skip_tools=skip_tools,
    )
