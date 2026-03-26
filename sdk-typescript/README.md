# @agentsid/sdk

[![npm version](https://img.shields.io/npm/v/@agentsid/sdk.svg)](https://www.npmjs.com/package/@agentsid/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Identity and auth for AI agents. Drop-in SDK for MCP servers.

- **Agent Identity** -- unique ID per agent instance, not shared API keys
- **Per-Tool Permissions** -- `search_*` allowed, `delete_*` denied. Default deny.
- **Delegation Chains** -- every agent traces back to the human who authorized it
- **Audit Trail** -- every tool call logged with tamper-evident hash chain

## Installation

```bash
npm install @agentsid/sdk
```

Requires Node.js >= 18.

## Quick Start

### Register an Agent

```typescript
import { AgentsID } from '@agentsid/sdk';

const aid = new AgentsID({ projectKey: 'aid_proj_...' });

const { agent, token } = await aid.registerAgent({
  name: 'research-bot',
  onBehalfOf: 'user_123',
  permissions: ['search_*', 'save_memory'],
});

console.log(agent.id);  // "agt_abc123"
console.log(token);      // Bearer token (shown once, store securely)
```

### Validate a Tool Call

```typescript
const result = await aid.validateToken(token, 'save_memory');

if (result.valid && result.permission?.allowed) {
  // Proceed with tool execution
}
```

### MCP Middleware

```typescript
import { createHttpMiddleware } from '@agentsid/sdk';

const middleware = createHttpMiddleware({ projectKey: 'aid_proj_...' });

// Quick boolean check
const allowed = await middleware.isAllowed(token, 'save_memory'); // true
const denied = await middleware.isAllowed(token, 'delete_all');   // false

// Full validation (throws on denial)
const auth = await middleware.validate(token, 'save_memory', params);
```

## Configuration

The `AgentsID` constructor accepts an `AgentsIDConfig` object:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectKey` | `string` | **(required)** | Your project API key (`aid_proj_...`) |
| `baseUrl` | `string` | `"https://agentsid.dev"` | AgentsID server URL |
| `timeout` | `number` | `10000` | HTTP request timeout in milliseconds |

```typescript
const aid = new AgentsID({
  projectKey: 'aid_proj_...',
  baseUrl: 'https://agentsid.dev',
  timeout: 15000,
});
```

## API Reference

### Agent Management

#### `registerAgent(options): Promise<RegisterAgentResult>`

Register a new agent identity and issue a bearer token.

**Options (`RegisterAgentOptions`):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Human-readable agent name |
| `onBehalfOf` | `string` | Yes | User ID of the human authorizing this agent |
| `permissions` | `string[]` | No | Tool patterns this agent can call (default: none) |
| `ttlHours` | `number` | No | Token lifetime in hours (default: 24, max: 720) |
| `metadata` | `Record<string, unknown>` | No | Custom key-value pairs |

**Returns (`RegisterAgentResult`):**

| Field | Type | Description |
|-------|------|-------------|
| `agent` | `AgentIdentity` | The created agent identity |
| `token` | `string` | Bearer token (shown once -- store securely) |
| `tokenId` | `string` | Token identifier for revocation |
| `expiresAt` | `string` | ISO 8601 expiration timestamp |

```typescript
const { agent, token, expiresAt } = await aid.registerAgent({
  name: 'data-bot',
  onBehalfOf: 'user_456',
  permissions: ['read_*', 'write_notes'],
  ttlHours: 48,
  metadata: { environment: 'production' },
});
```

#### `getAgent(agentId): Promise<AgentIdentity>`

Retrieve agent details by ID.

```typescript
const agent = await aid.getAgent('agt_abc123');
// { id, name, status, createdBy, expiresAt, createdAt, metadata, revokedAt }
```

#### `listAgents(options?): Promise<AgentIdentity[]>`

List all agents in the project.

**Options (`ListAgentsOptions`):**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `"active" \| "revoked" \| "expired" \| "all"` | `"all"` | Filter by status |
| `limit` | `number` | `50` | Max results to return |

```typescript
const active = await aid.listAgents({ status: 'active', limit: 10 });
```

#### `revokeAgent(agentId): Promise<void>`

Revoke an agent. All tokens are immediately invalidated.

```typescript
await aid.revokeAgent('agt_abc123');
```

### Permission Management

#### `setPermissions(agentId, rules): Promise<void>`

Set permission rules for an agent. Replaces all existing rules.

**Each `PermissionRule`:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `toolPattern` | `string` | Yes | Tool name or glob pattern (supports `*` wildcards) |
| `action` | `"allow" \| "deny"` | Yes | Allow or deny matching tools |
| `conditions` | `Record<string, unknown>` | No | Parameter constraints (AND logic) |
| `priority` | `number` | No | Higher priority rules are evaluated first (default: 0) |

```typescript
await aid.setPermissions('agt_abc123', [
  { toolPattern: 'search_*', action: 'allow', priority: 10 },
  { toolPattern: 'delete_*', action: 'deny', priority: 20 },
  {
    toolPattern: 'send_email',
    action: 'allow',
    conditions: { recipient_domain: 'company.com' },
  },
]);
```

#### `getPermissions(agentId): Promise<PermissionRule[]>`

Retrieve the current permission rules for an agent.

```typescript
const rules = await aid.getPermissions('agt_abc123');
```

#### `checkPermission(agentId, tool, params?): Promise<PermissionCheck>`

Check if an agent is allowed to call a specific tool.

**Returns (`PermissionCheck`):**

| Field | Type | Description |
|-------|------|-------------|
| `allowed` | `boolean` | Whether the tool call is permitted |
| `reason` | `string` | Human-readable explanation |
| `matchedRule` | `{ toolPattern: string; action: string } \| null` | The rule that matched |

```typescript
const check = await aid.checkPermission('agt_abc123', 'delete_user', {
  userId: 'u_789',
});

if (!check.allowed) {
  console.log(check.reason); // "Denied by rule: delete_*"
}
```

### Token Validation

#### `validateToken(token, tool?, params?): Promise<ValidateResult>`

Validate an agent token. Optionally check permission for a specific tool in the same call.

**Returns (`ValidateResult`):**

| Field | Type | Description |
|-------|------|-------------|
| `valid` | `boolean` | Whether the token is valid |
| `reason` | `string \| undefined` | Explanation if invalid |
| `agentId` | `string \| undefined` | Agent ID the token belongs to |
| `projectId` | `string \| undefined` | Project ID |
| `delegatedBy` | `string \| undefined` | Parent agent ID (for delegation chains) |
| `expiresAt` | `number \| undefined` | Token expiration timestamp |
| `permission` | `PermissionCheck \| undefined` | Permission result (when `tool` is provided) |

```typescript
// Token-only validation
const result = await aid.validateToken(token);

// Token + permission check in one call
const result = await aid.validateToken(token, 'save_memory', { key: 'value' });
if (result.valid && result.permission?.allowed) {
  // Proceed
}
```

### Audit Log

#### `getAuditLog(options?): Promise<AuditQueryResult>`

Query the tamper-evident audit trail.

**Options (`AuditQueryOptions`):**

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | `string` | Filter by agent ID |
| `tool` | `string` | Filter by tool name |
| `action` | `string` | Filter by action type |
| `since` | `string` | ISO 8601 timestamp -- only entries after this time |
| `limit` | `number` | Max entries to return (default: 100) |
| `offset` | `number` | Pagination offset |

**Returns (`AuditQueryResult`):**

| Field | Type | Description |
|-------|------|-------------|
| `entries` | `AuditEntry[]` | Array of audit log entries |
| `total` | `number` | Total matching entries |
| `limit` | `number` | Applied limit |
| `offset` | `number` | Applied offset |

Each `AuditEntry` contains: `id`, `agentId`, `delegatedBy`, `tool`, `action`, `params`, `result`, `delegationChain`, `errorMessage`, `createdAt`.

```typescript
const log = await aid.getAuditLog({
  agentId: 'agt_abc123',
  since: '2026-03-25T00:00:00Z',
  limit: 50,
});

for (const entry of log.entries) {
  console.log(`${entry.tool} -> ${entry.result} at ${entry.createdAt}`);
}
```

## MCP Middleware

The middleware integrates AgentsID into any MCP server. It validates bearer tokens on every tool call, checks per-tool permissions, and throws typed errors on denial.

### Setup

```typescript
import { createHttpMiddleware } from '@agentsid/sdk';

const middleware = createHttpMiddleware({
  projectKey: 'aid_proj_...',
  baseUrl: 'https://agentsid.dev',     // optional
  skipTools: ['ping', 'health'],        // optional: skip validation for these
  onDenied: (tool, reason) => {         // optional: custom denial handler
    console.warn(`Blocked: ${tool} - ${reason}`);
  },
  onToolCall: (tool, agentId, allowed) => {  // optional: telemetry callback
    metrics.record({ tool, agentId, allowed });
  },
});
```

**`MiddlewareConfig` options:**

| Option | Type | Description |
|--------|------|-------------|
| `projectKey` | `string` | Your project API key |
| `baseUrl` | `string` | AgentsID server URL (default: `https://agentsid.dev`) |
| `onDenied` | `(tool, reason) => void` | Custom denial handler (default: throws `PermissionDeniedError`) |
| `onToolCall` | `(tool, agentId, allowed) => void` | Telemetry callback fired on every tool call |
| `skipTools` | `string[]` | Tool names that bypass validation |

### Usage in MCP Tool Handlers

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createHttpMiddleware, extractBearerToken } from '@agentsid/sdk';

const server = new Server({ name: 'my-mcp-server', version: '1.0.0' });
const middleware = createHttpMiddleware({ projectKey: 'aid_proj_...' });

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const token = extractBearerToken(request.headers?.authorization);
  if (!token) throw new Error('Missing authorization');

  // Throws PermissionDeniedError, TokenExpiredError, or TokenRevokedError
  await middleware.validate(token, request.params.name, request.params.arguments);

  // Tool is authorized -- execute logic
  return { content: [{ type: 'text', text: 'Done' }] };
});
```

### Standalone Functions

#### `validateToolCall(config, token, tool, params?): Promise<ValidateResult>`

Lower-level validation function. Returns a result without throwing.

#### `extractBearerToken(authHeader): string | null`

Extract a bearer token from an HTTP `Authorization` header.

```typescript
const token = extractBearerToken('Bearer aid_tok_abc123');
// "aid_tok_abc123"

const missing = extractBearerToken(null);
// null
```

## Error Handling

All errors extend `AgentsIDError`, which provides `code` and optional `statusCode` properties.

| Error Class | Code | HTTP Status | When |
|-------------|------|-------------|------|
| `AgentsIDError` | varies | varies | Base error class for all SDK errors |
| `AuthenticationError` | `AUTH_ERROR` | 401 | Invalid or missing project key |
| `PermissionDeniedError` | `PERMISSION_DENIED` | 403 | Agent lacks permission for the tool |
| `TokenExpiredError` | `TOKEN_EXPIRED` | 401 | Agent token has expired |
| `TokenRevokedError` | `TOKEN_REVOKED` | 401 | Agent token has been revoked |
| `AgentNotFoundError` | `AGENT_NOT_FOUND` | 404 | Agent ID does not exist |

Additional error codes from the base `AgentsIDError`:

| Code | When |
|------|------|
| `CONFIG_ERROR` | Missing or invalid configuration (e.g., no `projectKey`) |
| `API_ERROR` | Non-success HTTP response from the API |
| `TIMEOUT` | Request exceeded the configured timeout |
| `NETWORK_ERROR` | Network connectivity failure |

```typescript
import {
  AgentsIDError,
  AuthenticationError,
  PermissionDeniedError,
  TokenExpiredError,
} from '@agentsid/sdk';

try {
  await middleware.validate(token, 'delete_user');
} catch (err) {
  if (err instanceof PermissionDeniedError) {
    console.log(`Denied: ${err.tool} - ${err.reason}`);
  } else if (err instanceof TokenExpiredError) {
    console.log('Token expired, request a new one');
  } else if (err instanceof AuthenticationError) {
    console.log('Bad API key');
  } else if (err instanceof AgentsIDError) {
    console.log(`SDK error [${err.code}]: ${err.message}`);
  }
}
```

## TypeScript Types

All types are exported from the package and available for import:

```typescript
import type {
  AgentsIDConfig,
  RegisterAgentOptions,
  AgentIdentity,
  RegisterAgentResult,
  PermissionRule,
  PermissionCheck,
  ValidateResult,
  AuditEntry,
  AuditQueryOptions,
  AuditQueryResult,
  ListAgentsOptions,
  AgentsIDContext,
  MiddlewareConfig,
} from '@agentsid/sdk';
```

`AgentsIDContext` is injected into MCP tool call context after successful middleware validation, providing `agentId`, `projectId`, `delegatedBy`, and `permissions`.

## Links

- **Website:** [agentsid.dev](https://agentsid.dev)
- **Docs:** [agentsid.dev/docs](https://agentsid.dev/docs)
- **Dashboard:** [agentsid.dev/dashboard](https://agentsid.dev/dashboard)
- **GitHub:** [github.com/agentsid/agentsid](https://github.com/agentsid/agentsid)

## License

MIT
