# agentsid

[![Gem Version](https://img.shields.io/gem/v/agentsid.svg)](https://rubygems.org/gems/agentsid)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Identity and auth for AI agents. Official Ruby SDK for [agentsid.dev](https://agentsid.dev).

- **Agent Identity** -- unique ID per agent instance, not shared API keys
- **Per-Tool Permissions** -- `search_*` allowed, `delete_*` denied. Default deny.
- **Delegation Chains** -- every agent traces back to the human who authorized it
- **Audit Trail** -- every tool call logged with tamper-evident hash chain

## Installation

Add to your Gemfile:

```ruby
gem "agentsid"
```

Or install directly:

```bash
gem install agentsid
```

Requires Ruby >= 3.0.

## Quick Start

### Register an Agent

```ruby
require "agentsid"

client = AgentsID::Client.new(project_key: "aid_proj_...")

result = client.register_agent(
  name: "research-bot",
  on_behalf_of: "user_123",
  permissions: ["search_*", "save_memory"]
)

agent = result["agent"]
token = result["token"]  # Store securely -- shown once
```

### Validate a Tool Call

```ruby
check = client.validate_token(token, tool: "save_memory")

if check["valid"] && check.dig("permission", "allowed")
  # Proceed with tool execution
end
```

### MCP Middleware

```ruby
middleware = AgentsID.create_mcp_middleware(project_key: "aid_proj_...")

# Quick boolean check
middleware.allowed?(token, "save_memory")  # true
middleware.allowed?(token, "delete_all")   # false

# Full validation (raises on denial)
auth = middleware.validate(token, "save_memory", params)
```

## Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_key` | `String` | **(required)** | Your project API key (`aid_proj_...`) |
| `base_url` | `String` | `"https://agentsid.dev"` | AgentsID server URL |
| `timeout` | `Integer` | `10` | HTTP timeout in seconds |

```ruby
client = AgentsID::Client.new(
  project_key: "aid_proj_...",
  base_url: "https://agentsid.dev",
  timeout: 15
)
```

## API Reference

### Agent Management

#### `register_agent(name:, on_behalf_of:, permissions: nil, ttl_hours: nil, metadata: nil) -> Hash`

Register a new agent identity and issue a bearer token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `String` | Yes | Human-readable agent name |
| `on_behalf_of` | `String` | Yes | User ID of the human authorizing this agent |
| `permissions` | `Array<String>` | No | Tool patterns this agent can call (default: none) |
| `ttl_hours` | `Integer` | No | Token lifetime in hours (default: 24, max: 720) |
| `metadata` | `Hash` | No | Custom key-value pairs |

Returns a Hash with `"agent"`, `"token"`, `"token_id"`, and `"expires_at"`.

```ruby
result = client.register_agent(
  name: "data-bot",
  on_behalf_of: "user_456",
  permissions: ["read_*", "write_notes"],
  ttl_hours: 48,
  metadata: { "environment" => "production" }
)
```

#### `get_agent(agent_id) -> Hash`

Retrieve agent details by ID.

```ruby
agent = client.get_agent("agt_abc123")
```

#### `list_agents(status: nil, limit: 50) -> Array<Hash>`

List all agents in the project.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | `String, nil` | `nil` | Filter: `"active"`, `"revoked"`, `"expired"` |
| `limit` | `Integer` | `50` | Max results to return |

```ruby
active = client.list_agents(status: "active", limit: 10)
```

#### `revoke_agent(agent_id) -> Hash`

Revoke an agent. All tokens are immediately invalidated.

```ruby
client.revoke_agent("agt_abc123")
```

### Permission Management

#### `set_permissions(agent_id, rules) -> Hash`

Set permission rules for an agent. Replaces all existing rules.

Each rule is a Hash with:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `tool_pattern` | `String` | Yes | Tool name or glob pattern (supports `*` wildcards) |
| `action` | `String` | Yes | `"allow"` or `"deny"` |
| `conditions` | `Hash, nil` | No | Parameter constraints (AND logic) |
| `priority` | `Integer` | No | Higher priority rules are evaluated first (default: 0) |

```ruby
client.set_permissions("agt_abc123", [
  { tool_pattern: "search_*", action: "allow", priority: 10 },
  { tool_pattern: "delete_*", action: "deny", priority: 20 },
  {
    tool_pattern: "send_email",
    action: "allow",
    conditions: { "recipient_domain" => "company.com" }
  }
])
```

#### `get_permissions(agent_id) -> Array<Hash>`

Retrieve the current permission rules for an agent.

```ruby
rules = client.get_permissions("agt_abc123")
```

#### `check_permission(agent_id, tool, params: nil) -> Hash`

Check if an agent is allowed to call a specific tool.

Returns a Hash with `"allowed"` (bool), `"reason"` (string), and `"matched_rule"`.

```ruby
check = client.check_permission("agt_abc123", "delete_user", params: { user_id: "u_789" })

unless check["allowed"]
  puts check["reason"]
end
```

### Token Validation

#### `validate_token(token, tool: nil, params: nil) -> Hash`

Validate an agent token. Optionally check permission for a specific tool in the same call.

Returns a Hash with `"valid"`, `"reason"`, `"agent_id"`, `"project_id"`, `"delegated_by"`, `"expires_at"`, and optionally `"permission"`.

```ruby
# Token-only validation
result = client.validate_token(token)

# Token + permission check in one call
result = client.validate_token(token, tool: "save_memory", params: { key: "value" })
if result["valid"] && result.dig("permission", "allowed")
  # Proceed
end
```

### Audit Log

#### `get_audit_log(agent_id: nil, tool: nil, action: nil, since: nil, limit: 100) -> Hash`

Query the tamper-evident audit trail.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `agent_id` | `String, nil` | `nil` | Filter by agent ID |
| `tool` | `String, nil` | `nil` | Filter by tool name |
| `action` | `String, nil` | `nil` | Filter by action type |
| `since` | `String, nil` | `nil` | ISO 8601 timestamp -- entries after this time |
| `limit` | `Integer` | `100` | Max entries to return |

Returns a Hash with `"entries"` (array), `"total"`, `"limit"`, `"offset"`.

```ruby
log = client.get_audit_log(
  agent_id: "agt_abc123",
  since: "2026-03-25T00:00:00Z",
  limit: 50
)

log["entries"].each do |entry|
  puts "#{entry['tool']} -> #{entry['result']} at #{entry['created_at']}"
end
```

## MCP Middleware

The middleware integrates AgentsID into any Ruby MCP server. It validates bearer tokens, checks per-tool permissions, and raises typed exceptions on denial.

### Setup

```ruby
middleware = AgentsID.create_mcp_middleware(
  project_key: "aid_proj_...",
  base_url: "https://agentsid.dev",    # optional
  skip_tools: ["ping", "health"]       # optional: bypass validation
)
```

Or construct directly with a custom denial handler:

```ruby
middleware = AgentsID::MCPMiddleware.new(
  project_key: "aid_proj_...",
  skip_tools: ["ping"],
  on_denied: ->(tool, reason) { logger.warn("Blocked: #{tool} - #{reason}") }
)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `project_key` | `String` | **(required)** | Your project API key |
| `base_url` | `String` | `"https://agentsid.dev"` | AgentsID server URL |
| `skip_tools` | `Array<String>, nil` | `nil` | Tool names that bypass validation |
| `on_denied` | `Proc, nil` | `nil` | Custom denial handler (default: raises `PermissionDeniedError`) |

### Usage in MCP Tool Handlers

```ruby
middleware = AgentsID.create_mcp_middleware(project_key: "aid_proj_...")

def handle_tool_call(tool_name, params, bearer_token)
  # Raises PermissionDeniedError, TokenExpiredError, or TokenRevokedError
  auth = middleware.validate(bearer_token, tool_name, params)

  # Tool is authorized -- execute logic
  { result: "success" }
end
```

### Middleware Methods

#### `validate(token, tool, params = nil) -> Hash`

Full validation. Raises on denial.

#### `allowed?(token, tool) -> Boolean`

Quick boolean check. Returns `false` on any error instead of raising.

### Standalone Function

#### `AgentsID.validate_tool_call(project_key:, token:, tool:, params: nil, base_url:) -> Hash`

Lower-level validation function. Returns a result Hash without raising.

```ruby
result = AgentsID.validate_tool_call(
  project_key: "aid_proj_...",
  token: bearer_token,
  tool: "save_memory"
)
```

## Error Handling

All errors extend `AgentsID::AgentsIDError`, which provides `code` and optional `status_code` attributes.

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

```ruby
begin
  middleware.validate(token, "delete_user")
rescue AgentsID::PermissionDeniedError => e
  puts "Denied: #{e.tool} - #{e.reason}"
rescue AgentsID::TokenExpiredError
  puts "Token expired, request a new one"
rescue AgentsID::TokenRevokedError
  puts "Token revoked"
rescue AgentsID::AuthenticationError
  puts "Bad API key"
rescue AgentsID::AgentsIDError => e
  puts "SDK error [#{e.code}]: #{e.message}"
end
```

## Links

- **Website:** [agentsid.dev](https://agentsid.dev)
- **Docs:** [agentsid.dev/docs](https://agentsid.dev/docs)
- **Dashboard:** [agentsid.dev/dashboard](https://agentsid.dev/dashboard)
- **GitHub:** [github.com/agentsid/sdk-ruby](https://github.com/agentsid/sdk-ruby)

## License

MIT
