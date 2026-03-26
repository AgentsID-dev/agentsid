"""AgentsID Python SDK — main client."""

from __future__ import annotations

import httpx

from agentsid.errors import AgentsIDError, AuthenticationError

DEFAULT_BASE_URL = "https://agentsid.dev"
DEFAULT_TIMEOUT = 10.0


class AgentsID:
    """AgentsID client — register agents, validate tokens, manage permissions."""

    def __init__(
        self,
        project_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        if not project_key:
            raise AgentsIDError("project_key is required", "CONFIG_ERROR")
        self._project_key = project_key
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    # ═══════════════════════════════════════════
    # AGENTS
    # ═══════════════════════════════════════════

    async def register_agent(
        self,
        name: str,
        on_behalf_of: str,
        permissions: list[str] | None = None,
        ttl_hours: int | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """Register a new agent identity and issue a token."""
        return await self._request("POST", "/agents/", {
            "name": name,
            "on_behalf_of": on_behalf_of,
            "permissions": permissions,
            "ttl_hours": ttl_hours,
            "metadata": metadata,
        })

    async def get_agent(self, agent_id: str) -> dict:
        return await self._request("GET", f"/agents/{agent_id}")

    async def list_agents(self, status: str | None = None, limit: int = 50) -> list[dict]:
        params = {}
        if status:
            params["status"] = status
        if limit != 50:
            params["limit"] = str(limit)
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return await self._request("GET", f"/agents/?{qs}" if qs else "/agents/")

    async def revoke_agent(self, agent_id: str) -> None:
        await self._request("DELETE", f"/agents/{agent_id}")

    # ═══════════════════════════════════════════
    # PERMISSIONS
    # ═══════════════════════════════════════════

    async def set_permissions(self, agent_id: str, rules: list[dict]) -> dict:
        """Set permission rules. Each rule: {"tool_pattern": "...", "action": "allow"|"deny"}"""
        body = [
            {
                "tool_pattern": r.get("tool_pattern", r.get("toolPattern", "")),
                "action": r.get("action", "allow"),
                "conditions": r.get("conditions"),
                "priority": r.get("priority", 0),
            }
            for r in rules
        ]
        return await self._request("PUT", f"/agents/{agent_id}/permissions", body)

    async def get_permissions(self, agent_id: str) -> list[dict]:
        data = await self._request("GET", f"/agents/{agent_id}/permissions")
        return data.get("rules", [])

    async def check_permission(
        self, agent_id: str, tool: str, params: dict | None = None
    ) -> dict:
        return await self._request("POST", "/check", {
            "agent_id": agent_id,
            "tool": tool,
            "params": params,
        })

    # ═══════════════════════════════════════════
    # TOKEN VALIDATION
    # ═══════════════════════════════════════════

    async def validate_token(
        self, token: str, tool: str | None = None, params: dict | None = None
    ) -> dict:
        return await self._request("POST", "/validate", {
            "token": token,
            "tool": tool,
            "params": params,
        })

    # ═══════════════════════════════════════════
    # AUDIT
    # ═══════════════════════════════════════════

    async def get_audit_log(
        self,
        agent_id: str | None = None,
        tool: str | None = None,
        action: str | None = None,
        since: str | None = None,
        limit: int = 100,
    ) -> dict:
        params = {}
        if agent_id:
            params["agent_id"] = agent_id
        if tool:
            params["tool"] = tool
        if action:
            params["action"] = action
        if since:
            params["since"] = since
        params["limit"] = str(limit)
        qs = "&".join(f"{k}={v}" for k, v in params.items())
        return await self._request("GET", f"/audit/?{qs}")

    # ═══════════════════════════════════════════
    # HTTP CLIENT
    # ═══════════════════════════════════════════

    async def _request(self, method: str, path: str, body: object | None = None) -> dict:
        url = f"{self._base_url}/api/v1{path}"
        headers = {
            "Authorization": f"Bearer {self._project_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.request(
                method, url, headers=headers,
                json=body if body is not None else None,
            )

        if response.status_code == 401:
            raise AuthenticationError()

        if response.status_code == 204:
            return {}

        data = response.json()

        if not response.is_success:
            raise AgentsIDError(
                data.get("detail", f"Request failed: {response.status_code}"),
                "API_ERROR",
                response.status_code,
            )

        return data
