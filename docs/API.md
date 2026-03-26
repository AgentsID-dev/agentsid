# AgentsID API Reference

Base URL: `https://api.agentsid.dev/api/v1` (hosted) or `http://localhost:8000/api/v1` (self-hosted)

## Authentication

All API requests require a project API key in the `Authorization` header:

```
Authorization: Bearer aid_proj_<your_project_key>
```

Project API keys are issued when you create a project. They are shown once and cannot be retrieved again. If you lose your key, rotate it to get a new one.

The only endpoint that does not require a project API key is `POST /api/v1/projects` (project creation) and `GET /health`.

---

## Projects

### Create Project

Create a new project and receive an API key.

**Rate limit:** 5 requests per minute per IP.

```
POST /api/v1/projects/
```

**Request body:**

```json
{
  "name": "my-app",
  "email": "dev@example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name (1-255 characters) |
| `email` | string | No | Owner email address |

**Response** `201 Created`:

```json
{
  "project": {
    "id": "proj_a1b2c3d4e5f6",
    "name": "my-app",
    "plan": "free",
    "created_at": "2026-03-25 14:30:00+00:00"
  },
  "api_key": "aid_proj_xR7kM2pQ9..."
}
```

The `api_key` is shown once. Store it securely.

**curl:**

```bash
curl -X POST https://api.agentsid.dev/api/v1/projects/ \
  -H "Content-Type: application/json" \
  -d '{"name": "my-app", "email": "dev@example.com"}'
```

**Errors:**

| Code | Reason |
|------|--------|
| 422 | Invalid name or email format |
| 429 | Rate limit exceeded |

---

## Agents

All agent endpoints require a project API key.

### Register Agent

Create a new agent identity, issue its first token, set up delegation chain and permission rules.

```
POST /api/v1/agents/
```

**Request body:**

```json
{
  "name": "research-assistant",
  "on_behalf_of": "user_abc",
  "permissions": ["search_memories", "save_memory", "list_categories"],
  "ttl_hours": 24,
  "metadata": {
    "framework": "langchain",
    "model": "claude-sonnet-4"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Agent name (1-255 characters) |
| `on_behalf_of` | string | Yes | Human user ID who authorized this agent (1-255 characters) |
| `permissions` | string[] | No | List of tool patterns to allow (max 100). If omitted, no tools are allowed by default. |
| `ttl_hours` | integer | No | Token lifetime in hours (1-720). Defaults to server config. |
| `metadata` | object | No | Arbitrary key-value pairs (max 10KB JSON) |

**Response** `201 Created`:

```json
{
  "agent": {
    "id": "agt_7x9k2mNpQ4rS1tUv",
    "name": "research-assistant",
    "status": "active",
    "created_by": "user_abc",
    "expires_at": "2026-03-26 14:30:00+00:00",
    "created_at": "2026-03-25 14:30:00+00:00"
  },
  "token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
  "token_id": "tok_a1b2c3d4e5f6",
  "expires_at": "2026-03-26 14:30:00+00:00"
}
```

The `token` is the bearer token for this agent. Use it in the `Authorization` header when the agent makes tool calls through MCP middleware or when validating via the `/validate` endpoint.

**curl:**

```bash
curl -X POST https://api.agentsid.dev/api/v1/agents/ \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "research-assistant",
    "on_behalf_of": "user_abc",
    "permissions": ["search_memories", "save_memory"],
    "ttl_hours": 24
  }'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 422 | Validation error (name too long, ttl out of range, metadata over 10KB) |

---

### List Agents

List all agents in the project, optionally filtered by status.

```
GET /api/v1/agents/
```

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | (all) | Filter by: `active`, `revoked`, `expired` |
| `limit` | integer | 50 | Results per page (1-200) |

**Response** `200 OK`:

```json
[
  {
    "id": "agt_7x9k2mNpQ4rS1tUv",
    "name": "research-assistant",
    "project_id": "proj_a1b2c3d4e5f6",
    "created_by": "user_abc",
    "status": "active",
    "expires_at": "2026-03-26 14:30:00+00:00",
    "metadata": {"framework": "langchain"},
    "created_at": "2026-03-25 14:30:00+00:00",
    "revoked_at": null
  }
]
```

**curl:**

```bash
curl https://api.agentsid.dev/api/v1/agents/?status=active&limit=10 \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |

---

### Get Agent

Get details for a specific agent.

```
GET /api/v1/agents/{agent_id}
```

**Response** `200 OK`:

```json
{
  "id": "agt_7x9k2mNpQ4rS1tUv",
  "name": "research-assistant",
  "project_id": "proj_a1b2c3d4e5f6",
  "created_by": "user_abc",
  "status": "active",
  "expires_at": "2026-03-26 14:30:00+00:00",
  "metadata": {"framework": "langchain"},
  "created_at": "2026-03-25 14:30:00+00:00",
  "revoked_at": null
}
```

**curl:**

```bash
curl https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 404 | Agent not found or does not belong to this project |

---

### Update Agent

Update an agent's name or metadata. Does not affect tokens or permissions.

```
PATCH /api/v1/agents/{agent_id}
```

**Request body:**

```json
{
  "name": "updated-agent-name",
  "metadata": {"version": "2.0"}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | New agent name (1-255 characters) |
| `metadata` | object | No | Replace metadata (max 10KB JSON) |

Both fields are optional. Only provided fields are updated.

**Response** `200 OK`:

```json
{
  "id": "agt_7x9k2mNpQ4rS1tUv",
  "name": "updated-agent-name",
  "project_id": "proj_a1b2c3d4e5f6",
  "created_by": "user_abc",
  "status": "active",
  "expires_at": "2026-03-26 14:30:00+00:00",
  "metadata": {"version": "2.0"},
  "created_at": "2026-03-25 14:30:00+00:00",
  "revoked_at": null
}
```

**curl:**

```bash
curl -X PATCH https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '{"name": "updated-agent-name"}'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 404 | Agent not found |
| 422 | Validation error |

---

### Refresh Token

Issue a new token for an existing active agent. All previous tokens for this agent are revoked immediately.

```
POST /api/v1/agents/{agent_id}/refresh
```

**Request body (optional):**

```json
{
  "ttl_hours": 48
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ttl_hours` | integer | No | New token lifetime in hours (1-720) |

**Response** `200 OK`:

```json
{
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "token": "aid_tok_newtoken...",
  "token_id": "tok_f6e5d4c3b2a1",
  "expires_at": "2026-03-27 14:30:00+00:00"
}
```

**curl:**

```bash
curl -X POST https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv/refresh \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '{"ttl_hours": 48}'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 404 | Agent not found or revoked |

---

### Delegate to Agent

Create a child agent with narrowed permissions from a parent agent. The parent agent's token is validated, and child permissions must be a subset of the parent's permissions.

```
POST /api/v1/agents/delegate
```

**Request body:**

```json
{
  "parent_agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "parent_token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
  "child_name": "sub-researcher",
  "child_permissions": ["search_memories"],
  "ttl_hours": 12
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `parent_agent_id` | string | Yes | ID of the parent agent delegating permissions |
| `parent_token` | string | Yes | Valid token belonging to the parent agent |
| `child_name` | string | Yes | Name for the child agent (1-255 characters) |
| `child_permissions` | string[] | Yes | Permissions for the child (must be subset of parent's) |
| `ttl_hours` | integer | No | Token lifetime in hours (1-720) |

**Response** `201 Created`:

Same response format as Register Agent.

**curl:**

```bash
curl -X POST https://api.agentsid.dev/api/v1/agents/delegate \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "parent_agent_id": "agt_7x9k2mNpQ4rS1tUv",
    "parent_token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
    "child_name": "sub-researcher",
    "child_permissions": ["search_memories"],
    "ttl_hours": 12
  }'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 403 | Permission scope violation -- child permissions exceed parent's scope |
| 404 | Parent agent not found |

---

### Revoke Agent

Permanently revoke an agent. All tokens are immediately invalidated. This action cannot be undone.

```
DELETE /api/v1/agents/{agent_id}
```

**Response** `204 No Content`

No response body.

**curl:**

```bash
curl -X DELETE https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 404 | Agent not found |

---

## Permissions

All permission endpoints require a project API key. The agent must belong to the authenticated project.

### Set Permissions

Replace all permission rules for an agent. Any existing rules are deleted and replaced with the provided set.

```
PUT /api/v1/agents/{agent_id}/permissions
```

**Request body:**

```json
[
  {
    "tool_pattern": "search_memories",
    "action": "allow",
    "priority": 0
  },
  {
    "tool_pattern": "save_memory",
    "action": "allow",
    "conditions": {"category": ["note", "preference"]},
    "priority": 1
  },
  {
    "tool_pattern": "delete_*",
    "action": "deny",
    "priority": 10
  }
]
```

Each rule object:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tool_pattern` | string | Yes | Tool name or wildcard pattern (1-255 characters). Supports `*` wildcards: `save_*`, `*_memory`, `*`. |
| `action` | string | No | `allow` or `deny`. Defaults to `allow`. |
| `conditions` | object | No | Key-value constraints on tool parameters. All conditions must match (AND logic). Values can be a list of allowed values or a single value. |
| `priority` | integer | No | Rule priority (0-1000). Higher priority rules are evaluated first. Defaults to 0. |

**Response** `200 OK`:

```json
{
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "rules": [
    {"tool_pattern": "search_memories", "action": "allow", "conditions": null, "priority": 0},
    {"tool_pattern": "save_memory", "action": "allow", "conditions": {"category": ["note", "preference"]}, "priority": 1},
    {"tool_pattern": "delete_*", "action": "deny", "conditions": null, "priority": 10}
  ]
}
```

**curl:**

```bash
curl -X PUT https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv/permissions \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '[
    {"tool_pattern": "search_*", "action": "allow"},
    {"tool_pattern": "delete_*", "action": "deny", "priority": 10}
  ]'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 404 | Agent not found or does not belong to this project |
| 422 | Validation error (invalid action, pattern too long) |

---

### Get Permissions

Retrieve the current permission rules for an agent, ordered by priority (highest first).

```
GET /api/v1/agents/{agent_id}/permissions
```

**Response** `200 OK`:

```json
{
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "rules": [
    {"tool_pattern": "delete_*", "action": "deny", "conditions": null, "priority": 10},
    {"tool_pattern": "save_memory", "action": "allow", "conditions": {"category": ["note"]}, "priority": 1},
    {"tool_pattern": "search_memories", "action": "allow", "conditions": null, "priority": 0}
  ]
}
```

**curl:**

```bash
curl https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv/permissions \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 404 | Agent not found |

---

### Check Permission

Check whether an agent is allowed to call a specific tool with optional parameters. Does not log to the audit trail (use `/validate` for audited checks).

```
POST /api/v1/check
```

**Request body:**

```json
{
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "tool": "save_memory",
  "params": {"category": "note", "content": "hello"}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | string | Yes | Agent ID to check |
| `tool` | string | Yes | Tool name to check (1-255 characters) |
| `params` | object | No | Tool parameters for condition evaluation |

**Response** `200 OK`:

```json
{
  "allowed": true,
  "reason": "Allowed by rule: save_memory",
  "matched_rule": {
    "tool_pattern": "save_memory",
    "action": "allow"
  }
}
```

When denied:

```json
{
  "allowed": false,
  "reason": "No matching rule -- default deny",
  "matched_rule": null
}
```

**curl:**

```bash
curl -X POST https://api.agentsid.dev/api/v1/check \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "agt_7x9k2mNpQ4rS1tUv", "tool": "delete_memory"}'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |
| 404 | Agent not found or does not belong to this project |
| 422 | Validation error |

---

## Validation

Validation endpoints are used by MCP middleware to verify agent tokens and check permissions in a single call. All validation endpoints require a project API key, and the token being validated must belong to the same project.

### Validate Token

Validate an agent token's signature, expiry, and revocation status. Optionally check permission for a specific tool. Every call is logged to the audit trail.

```
POST /api/v1/validate
```

**Request body:**

```json
{
  "token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
  "tool": "save_memory",
  "params": {"category": "note"}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Agent token to validate (max 5000 characters) |
| `tool` | string | No | Tool name to check permission for (alphanumeric, underscores, dots, hyphens, asterisks) |
| `params` | object | No | Tool parameters for condition evaluation |

**Response** `200 OK` (valid token, tool allowed):

```json
{
  "valid": true,
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "project_id": "proj_a1b2c3d4e5f6",
  "delegated_by": "user_abc",
  "expires_at": 1711411200,
  "permission": {
    "allowed": true,
    "reason": "Allowed by rule: save_memory",
    "matched_rule": {"tool_pattern": "save_memory", "action": "allow"}
  }
}
```

**Response** `200 OK` (valid token, no tool specified):

```json
{
  "valid": true,
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "project_id": "proj_a1b2c3d4e5f6",
  "delegated_by": "user_abc",
  "expires_at": 1711411200
}
```

**Response** `200 OK` (invalid token):

```json
{
  "valid": false,
  "reason": "Token validation failed"
}
```

Error reasons are intentionally generic to prevent leaking information about token format or validation internals. The same message is returned for expired tokens, invalid signatures, revoked tokens, and project mismatches.

Sensitive parameters (`password`, `secret`, `token`, `api_key`, `credential`, `key`) are automatically redacted in audit log entries.

**curl:**

```bash
curl -X POST https://api.agentsid.dev/api/v1/validate \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
    "tool": "save_memory",
    "params": {"category": "note"}
  }'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing project API key |
| 422 | Validation error (empty token, invalid tool name pattern) |

---

### Introspect Token

Full token introspection. Returns the decoded claims, agent details, permission rules, and delegation chain. Intended for debugging and admin dashboards, not for hot-path validation.

```
POST /api/v1/introspect
```

**Request body:**

```json
{
  "token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
  "tool": "save_memory",
  "params": {"category": "note"}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Agent token to introspect |
| `tool` | string | No | Tool name to check permission for |
| `params` | object | No | Tool parameters for condition evaluation |

**Response** `200 OK` (active token):

```json
{
  "active": true,
  "agent": {
    "id": "agt_7x9k2mNpQ4rS1tUv",
    "name": "research-assistant",
    "project_id": "proj_a1b2c3d4e5f6",
    "created_by": "user_abc",
    "status": "active",
    "expires_at": "2026-03-26 14:30:00+00:00",
    "metadata": {"framework": "langchain"},
    "created_at": "2026-03-25 14:30:00+00:00",
    "revoked_at": null
  },
  "claims": {
    "sub": "agt_7x9k2mNpQ4rS1tUv",
    "prj": "proj_a1b2c3d4e5f6",
    "dby": "user_abc",
    "iat": 1711324800,
    "exp": 1711411200,
    "jti": "tok_a1b2c3d4e5f6"
  },
  "permissions": [
    {"tool_pattern": "search_memories", "action": "allow", "conditions": null, "priority": 0},
    {"tool_pattern": "save_memory", "action": "allow", "conditions": null, "priority": 1}
  ],
  "delegation_chain": [
    {"type": "user", "id": "user_abc", "granted": ["search_memories", "save_memory"]},
    {"type": "agent", "id": "agt_7x9k2mNpQ4rS1tUv", "received": ["search_memories", "save_memory"]}
  ]
}
```

**Response** `200 OK` (inactive token):

```json
{
  "active": false,
  "reason": "Token validation failed"
}
```

**curl:**

```bash
curl -X POST https://api.agentsid.dev/api/v1/introspect \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \
  -H "Content-Type: application/json" \
  -d '{"token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt..."}'
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing project API key |
| 422 | Validation error |

---

## Audit

All audit endpoints require a project API key. Results are scoped to the authenticated project.

### Query Audit Log

Retrieve audit log entries with optional filters. Results are ordered newest-first.

```
GET /api/v1/audit/
```

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `agent_id` | string | (all) | Filter by agent ID |
| `tool` | string | (all) | Filter by tool name (exact match) |
| `action` | string | (all) | Filter by action: `allow` or `deny` |
| `since` | string | (all) | ISO 8601 datetime, e.g. `2026-03-01T00:00:00Z` |
| `limit` | integer | 100 | Results per page (1-500) |
| `offset` | integer | 0 | Pagination offset |

**Response** `200 OK`:

```json
{
  "entries": [
    {
      "id": 42,
      "agent_id": "agt_7x9k2mNpQ4rS1tUv",
      "delegated_by": "user_abc",
      "tool": "save_memory",
      "action": "allow",
      "params": {"category": "note"},
      "result": "success",
      "delegation_chain": [
        {"type": "user", "id": "user_abc"},
        {"type": "agent", "id": "agt_7x9k2mNpQ4rS1tUv"}
      ],
      "error_message": null,
      "created_at": "2026-03-25 14:35:00+00:00"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

**curl:**

```bash
curl "https://api.agentsid.dev/api/v1/audit/?agent_id=agt_7x9k2mNpQ4rS1tUv&action=deny&limit=50" \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |

---

### Audit Stats

Get aggregate statistics for the audit log over a time period.

```
GET /api/v1/audit/stats
```

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days` | integer | 30 | Lookback period in days (1-365) |

**Response** `200 OK`:

```json
{
  "period_days": 30,
  "total_events": 1523,
  "by_action": {
    "allow": 1400,
    "deny": 123
  },
  "by_tool": {
    "save_memory": 800,
    "search_memories": 500,
    "delete_memory": 123,
    "list_categories": 100
  },
  "by_agent": {
    "agt_7x9k2mNpQ4rS1tUv": 900,
    "agt_abc123def456": 623
  },
  "deny_rate_pct": 8.1
}
```

`by_tool` and `by_agent` return the top 10 entries by count.

**curl:**

```bash
curl "https://api.agentsid.dev/api/v1/audit/stats?days=7" \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |

---

### Verify Audit Chain

Verify the integrity of the project's audit hash chain. Each audit entry is linked to the previous entry's hash, forming a tamper-evident chain.

```
GET /api/v1/audit/verify
```

**Response** `200 OK` (chain intact):

```json
{
  "verified": true,
  "entries_checked": 1523,
  "message": "All entries verified -- chain intact"
}
```

**Response** `200 OK` (chain broken):

```json
{
  "verified": false,
  "entries_checked": 1523,
  "broken_at_id": 42,
  "message": "Integrity chain broken at entry 42 -- possible tampering"
}
```

**curl:**

```bash
curl "https://api.agentsid.dev/api/v1/audit/verify" \
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."
```

**Errors:**

| Code | Reason |
|------|--------|
| 401 | Invalid or missing API key |

---

## Health

### Health Check

No authentication required.

```
GET /health
```

**Response** `200 OK`:

```json
{
  "status": "ok",
  "service": "agentsid"
}
```

**curl:**

```bash
curl https://api.agentsid.dev/health
```

---

## Common Error Responses

All error responses follow this format:

```json
{
  "detail": "Error description"
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad request |
| 401 | Invalid or missing API key |
| 404 | Resource not found |
| 422 | Validation error (request body failed schema validation) |
| 429 | Rate limit exceeded |
| 500 | Internal server error (generic message, details logged server-side) |

For 422 errors, the response includes field-level validation details:

```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "String should have at least 1 character",
      "type": "string_too_short"
    }
  ]
}
```
