# agentsid

[![PyPI version](https://img.shields.io/pypi/v/agentsid.svg)](https://pypi.org/project/agentsid/)
[![Python](https://img.shields.io/pypi/pyversions/agentsid.svg)](https://pypi.org/project/agentsid/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Identity and auth for AI agents. Official Python SDK for [agentsid.dev](https://agentsid.dev).

- **Agent Identity** -- unique ID per agent instance, not shared API keys
- **Per-Tool Permissions** -- `search_*` allowed, `delete_*` denied. Default deny.
- **Delegation Chains** -- every agent traces back to the human who authorized it
- **Audit Trail** -- every tool call logged with tamper-evident hash chain

## Installation

```bash
pip install agentsid
```

Requires Python >= 3.10. The SDK uses [httpx](https://www.python-httpx.org/) for async HTTP.

## Quick Start

### Register an Agent

```python
from agentsid import AgentsID

aid = AgentsID(project_key="aid_proj_...")

result = await aid.register_agent(
    name="research-bot",
    on_behalf_of="user_123",
    permissions=["search_*", "save_memory"],
)

agent = result["agent"]
token = result["token"]  # Store securely -- shown once
```

### Validate a Tool Call

```python
check = await aid.validate_token(token, tool="save_memory")

if check["valid"] and check.get("permission", {}).get("allowed"):
    # Proceed with tool execution
    pass
```

### MCP Middleware

```python
from agentsid import create_mcp_middleware

middleware = create_mcp_middleware(project_key="aid_proj_...")

# Quick boolean check
allowed = await middleware.is_allowed(token, "save_memory")  # True
denied = await middleware.is_allowed(token, "delete_all")    # False

# Full validation (raises on denial)
auth = await middleware.validate(token, "save_memory", params)
```

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_key` | `str` | **(required)** | Your project API key (`aid_proj_...`) |
| `base_url` | `str` | `"https://agentsid.dev"` | AgentsID server URL |
| `timeout` | `float` | `10.0` | HTTP request timeout in seconds |

```python
aid = AgentsID(
    project_key="aid_proj_...",
    base_url="https://agentsid.dev",
    timeout=15.0,
)
```

## API Reference

### Agent Management

#### `register_agent(name, on_behalf_of, permissions?, ttl_hours?, metadata?) -> dict`

Register a new agent identity and issue a bearer token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `str` | Yes | Human-readable agent name |
| `on_behalf_of` | `str` | Yes | User ID of the human authorizing this agent |
| `permissions` | `list[str] \| None` | No | Tool patterns this agent can call (default: none) |
| `ttl_hours` | `int \| None` | No | Token lifetime in hours (default: 24, max: 720) |
| `metadata` | `dict \| None` | No | Custom key-value pairs |

Returns a dict with `agent`, `token`, `token_id`, and `expires_at`.

```python
result = await aid.register_agent(
    name="data-bot",
    on_behalf_of="user_456",
    permissions=["read_*", "write_notes"],
    ttl_hours=48,
    metadata={"environment": "production"},
)
```

#### `get_agent(agent_id) -> dict`

Retrieve agent details by ID.

```python
agent = await aid.get_agent("agt_abc123")
```

#### `list_agents(status?, limit?) -> list[dict]`

List all agents in the project.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `str \| None` | `None` | Filter: `"active"`, `"revoked"`, `"expired"` |
| `limit` | `int` | `50` | Max results to return |

```python
active = await aid.list_agents(status="active", limit=10)
```

#### `revoke_agent(agent_id) -> None`

Revoke an agent. All tokens are immediately invalidated.

```python
await aid.revoke_agent("agt_abc123")
```

### Permission Management

#### `set_permissions(agent_id, rules) -> dict`

Set permission rules for an agent. Replaces all existing rules.

Each rule is a dict with:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `tool_pattern` | `str` | Yes | Tool name or glob pattern (supports `*` wildcards) |
| `action` | `str` | Yes | `"allow"` or `"deny"` |
| `conditions` | `dict \| None` | No | Parameter constraints (AND logic) |
| `priority` | `int` | No | Higher priority rules are evaluated first (default: 0) |

```python
await aid.set_permissions("agt_abc123", [
    {"tool_pattern": "search_*", "action": "allow", "priority": 10},
    {"tool_pattern": "delete_*", "action": "deny", "priority": 20},
    {
        "tool_pattern": "send_email",
        "action": "allow",
        "conditions": {"recipient_domain": "company.com"},
    },
])
```

#### `get_permissions(agent_id) -> list[dict]`

Retrieve the current permission rules for an agent.

```python
rules = await aid.get_permissions("agt_abc123")
```

#### `check_permission(agent_id, tool, params?) -> dict`

Check if an agent is allowed to call a specific tool.

Returns a dict with `allowed` (bool), `reason` (str), and `matched_rule`.

```python
check = await aid.check_permission("agt_abc123", "delete_user", params={"user_id": "u_789"})

if not check["allowed"]:
    print(check["reason"])
```

### Token Validation

#### `validate_token(token, tool?, params?) -> dict`

Validate an agent token. Optionally check permission for a specific tool in the same call.

Returns a dict with `valid`, `reason`, `agent_id`, `project_id`, `delegated_by`, `expires_at`, and optionally `permission`.

```python
# Token-only validation
result = await aid.validate_token(token)

# Token + permission check in one call
result = await aid.validate_token(token, tool="save_memory", params={"key": "value"})
if result["valid"] and result.get("permission", {}).get("allowed"):
    # Proceed
    pass
```

### Audit Log

#### `get_audit_log(agent_id?, tool?, action?, since?, limit?) -> dict`

Query the tamper-evident audit trail.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `agent_id` | `str \| None` | `None` | Filter by agent ID |
| `tool` | `str \| None` | `None` | Filter by tool name |
| `action` | `str \| None` | `None` | Filter by action type |
| `since` | `str \| None` | `None` | ISO 8601 timestamp -- entries after this time |
| `limit` | `int` | `100` | Max entries to return |

Returns a dict with `entries` (list), `total`, `limit`, `offset`.

```python
log = await aid.get_audit_log(
    agent_id="agt_abc123",
    since="2026-03-25T00:00:00Z",
    limit=50,
)

for entry in log["entries"]:
    print(f"{entry['tool']} -> {entry['result']} at {entry['created_at']}")
```

## MCP Middleware

The middleware integrates AgentsID into any Python MCP server. It validates bearer tokens, checks per-tool permissions, and raises typed exceptions on denial.

### Setup

```python
from agentsid import create_mcp_middleware

middleware = create_mcp_middleware(
    project_key="aid_proj_...",
    base_url="https://agentsid.dev",    # optional
    skip_tools=["ping", "health"],      # optional: bypass validation
)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_key` | `str` | **(required)** | Your project API key |
| `base_url` | `str` | `"https://agentsid.dev"` | AgentsID server URL |
| `skip_tools` | `list[str] \| None` | `None` | Tool names that bypass validation |

### Usage in MCP Tool Handlers

```python
from agentsid import create_mcp_middleware, PermissionDeniedError, TokenExpiredError

middleware = create_mcp_middleware(project_key="aid_proj_...")

async def handle_tool_call(tool_name: str, params: dict, bearer_token: str):
    # Raises PermissionDeniedError, TokenExpiredError, or TokenRevokedError
    auth = await middleware.validate(bearer_token, tool_name, params)

    # Tool is authorized -- execute logic
    return {"result": "success"}
```

### Middleware Methods

#### `validate(token, tool, params?) -> dict`

Full validation. Raises on denial.

#### `is_allowed(token, tool) -> bool`

Quick boolean check. Returns `False` on any error instead of raising.

### Standalone Function

#### `validate_tool_call(project_key, token, tool, params?, base_url?) -> dict`

Lower-level validation function. Returns a result dict without raising.

```python
from agentsid import validate_tool_call

result = await validate_tool_call(
    project_key="aid_proj_...",
    token=bearer_token,
    tool="save_memory",
)
```

## Error Handling

All errors extend `AgentsIDError`, which provides `code` and optional `status_code` attributes.

| Exception | Code | HTTP Status | When |
|-----------|------|-------------|------|
| `AgentsIDError` | varies | varies | Base exception for all SDK errors |
| `AuthenticationError` | `AUTH_ERROR` | 401 | Invalid or missing project key |
| `PermissionDeniedError` | `PERMISSION_DENIED` | 403 | Agent lacks permission for the tool |
| `TokenExpiredError` | `TOKEN_EXPIRED` | 401 | Agent token has expired |
| `TokenRevokedError` | `TOKEN_REVOKED` | 401 | Agent token has been revoked |

Additional error codes from the base `AgentsIDError`:

| Code | When |
|------|------|
| `CONFIG_ERROR` | Missing or invalid configuration (e.g., no `project_key`) |
| `API_ERROR` | Non-success HTTP response from the API |

```python
from agentsid import (
    AgentsIDError,
    AuthenticationError,
    PermissionDeniedError,
    TokenExpiredError,
    TokenRevokedError,
)

try:
    await middleware.validate(token, "delete_user")
except PermissionDeniedError as e:
    print(f"Denied: {e.tool} - {e.reason}")
except TokenExpiredError:
    print("Token expired, request a new one")
except TokenRevokedError:
    print("Token revoked")
except AuthenticationError:
    print("Bad API key")
except AgentsIDError as e:
    print(f"SDK error [{e.code}]: {e}")
```

## Links

- **Website:** [agentsid.dev](https://agentsid.dev)
- **Docs:** [agentsid.dev/docs](https://agentsid.dev/docs)
- **Dashboard:** [agentsid.dev/dashboard](https://agentsid.dev/dashboard)
- **GitHub:** [github.com/agentsid/agentsid](https://github.com/agentsid/agentsid)

## License

MIT
