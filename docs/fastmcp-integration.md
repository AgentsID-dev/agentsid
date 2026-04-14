# AgentsID + FastMCP Integration Guide

## The Problem

FastMCP's built-in `AuthMiddleware` handles OAuth scopes — it answers "is this user authenticated?" But it doesn't answer:

- **Which tools** can this specific agent call? (per-tool permissions)
- **How often** can it call them? (rate limiting per agent)
- **Who authorized** this agent, and what's the delegation chain?
- **What happened** when it called a tool? (tamper-evident audit trail)

AgentsID adds a per-tool permission layer on top of FastMCP's existing auth. Every tool call gets validated against agent-specific rules before execution.

## Installation

```bash
pip install agentsid fastmcp
```

## Quick Start

```python
import logging

import mcp.types as mt
from fastmcp import FastMCP
from fastmcp.server.middleware.middleware import CallNext, Middleware, MiddlewareContext
from fastmcp.tools.base import ToolResult

from agentsid import AgentsID

logger = logging.getLogger(__name__)


class AgentsIDMiddleware(Middleware):
    """Per-tool permission middleware powered by AgentsID.

    Validates every tool call against agent-specific permission rules.
    Allowed calls proceed normally. Denied calls return an error without
    executing the tool.
    """

    def __init__(self, project_key: str, base_url: str = "https://agentsid.dev"):
        self.aid = AgentsID(project_key=project_key, base_url=base_url)

    async def on_call_tool(
        self,
        context: MiddlewareContext[mt.CallToolRequestParams],
        call_next: CallNext[mt.CallToolRequestParams, ToolResult],
    ) -> ToolResult:
        """Validate tool call against AgentsID permissions before execution."""
        tool_name = context.message.name

        # Extract the agent token from the request context.
        # In a real deployment, the agent token comes from the Authorization
        # header or is embedded in the tool call arguments.
        token = None
        if context.fastmcp_context:
            try:
                from fastmcp.server.dependencies import get_access_token

                token = get_access_token(context.fastmcp_context)
            except Exception:
                pass

        # Fallback: check if token is passed in tool arguments
        if not token and context.message.arguments:
            token = context.message.arguments.pop("_agent_token", None)

        if not token:
            logger.warning("No agent token for tool call: %s", tool_name)
            return ToolResult(
                content=[mt.TextContent(type="text", text="Authentication required. Provide an AgentsID agent token.")],
                isError=True,
            )

        # Validate against AgentsID
        try:
            result = await self.aid.validate_token(token, tool_name)
        except Exception as e:
            logger.error("AgentsID validation error: %s", e)
            # Fail closed — deny on error
            return ToolResult(
                content=[mt.TextContent(type="text", text=f"Authorization check failed: {e}")],
                isError=True,
            )

        # Check token validity
        if not result.get("valid"):
            reason = result.get("reason", "Token validation failed")
            logger.info("AgentsID token invalid: %s — %s", tool_name, reason)
            return ToolResult(
                content=[mt.TextContent(type="text", text=f"Blocked by AgentsID: {reason}")],
                isError=True,
            )

        # Check tool permission
        permission = result.get("permission", {})
        if not permission.get("allowed"):
            reason = permission.get("reason", "Permission denied")
            logger.info("AgentsID denied: %s — %s", tool_name, reason)
            return ToolResult(
                content=[mt.TextContent(type="text", text=f"Blocked by AgentsID: {reason}")],
                isError=True,
            )

        # Permission granted — execute the tool
        return await call_next(context)


# ─── Example Server ───

mcp = FastMCP(
    "My Protected Server",
    middleware=[
        AgentsIDMiddleware(project_key="aid_proj_your_key_here"),
    ],
)


@mcp.tool
def search_notes(query: str) -> str:
    """Search notes by keyword."""
    return f"Found 3 notes matching '{query}'"


@mcp.tool
def save_note(title: str, content: str) -> str:
    """Save a new note."""
    return f"Saved note: {title}"


@mcp.tool
def delete_note(note_id: str) -> str:
    """Delete a note by ID."""
    return f"Deleted note {note_id}"


if __name__ == "__main__":
    mcp.run()
```

## What Happens

With this middleware:

1. Agent calls `search_notes(query="quarterly report")`
2. AgentsID checks: does this agent's token have permission for `search_notes`?
3. If the agent has `search_*` in its permissions → **allowed**, tool executes
4. If not → **blocked**, returns error, tool never executes
5. Every call — allowed or denied — is logged to the tamper-evident audit trail

## Setting Up Permissions

Register an agent and set permissions via the AgentsID SDK:

```python
import asyncio
from agentsid import AgentsID

async def setup():
    aid = AgentsID(project_key="aid_proj_your_key_here")

    # Register an agent with scoped permissions
    result = await aid.register_agent(
        name="research-assistant",
        on_behalf_of="user@company.com",
        permissions=["search_notes", "list_notes", "save_note"],
    )

    print(f"Agent ID: {result['agent']['id']}")
    print(f"Token: {result['token']}")
    # Give this token to the agent — it's validated on every tool call

asyncio.run(setup())
```

## Combining with FastMCP's Built-in Auth

AgentsID middleware works alongside FastMCP's existing `AuthMiddleware`:

```python
from fastmcp.server.middleware import AuthMiddleware
from fastmcp.server.auth import require_scopes

mcp = FastMCP(
    "My Server",
    middleware=[
        # Layer 1: OAuth scope check (FastMCP built-in)
        AuthMiddleware(auth=require_scopes("api")),
        # Layer 2: Per-tool permission check (AgentsID)
        AgentsIDMiddleware(project_key="aid_proj_..."),
    ],
)
```

OAuth proves who the user is. AgentsID controls what the agent can do.

## Dashboard

Every tool call — allowed or denied — appears in the AgentsID dashboard at [agentsid.dev/dashboard](https://agentsid.dev/dashboard) with:

- Which agent made the call
- Which tool was called
- Whether it was allowed or denied (and why)
- Timestamp and audit chain

## Links

- [AgentsID Documentation](https://agentsid.dev/docs)
- [FastMCP Middleware Docs](https://gofastmcp.com/servers/middleware)
- [AgentsID Python SDK](https://github.com/AgentsID-dev/agentsid/tree/master/sdk-python)
