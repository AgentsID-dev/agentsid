# @agentsid/sdk

Identity and auth for AI agents. Drop-in SDK for MCP servers.

- **Agent Identity** — unique ID per agent instance, not shared API keys
- **Per-Tool Permissions** — `search_*` allowed, `delete_*` denied. Default deny.
- **Delegation Chains** — every agent traces back to the human who authorized it
- **Audit Trail** — every tool call logged with tamper-evident hash chain

## Install

```bash
npm install @agentsid/sdk
```

## Quick Start

```typescript
import { AgentsID, createHttpMiddleware } from '@agentsid/sdk';

const aid = new AgentsID({ projectKey: 'aid_proj_...' });

// Register an agent with scoped permissions
const { agent, token } = await aid.registerAgent({
  name: 'research-bot',
  onBehalfOf: 'user_123',
  permissions: ['search_*', 'save_memory'],
});

// Validate tool calls (MCP middleware)
const middleware = createHttpMiddleware({ projectKey: 'aid_proj_...' });
const allowed = await middleware.isAllowed(token, 'save_memory'); // true
const denied = await middleware.isAllowed(token, 'delete_all');   // false
```

## MCP Middleware

```typescript
const middleware = createHttpMiddleware({
  projectKey: 'aid_proj_...',
  baseUrl: 'https://agentsid.dev',
});

// In your MCP tool handler:
const result = await middleware.validate(bearerToken, 'tool_name', params);
// Throws PermissionDeniedError if blocked
```

## API

| Method | Description |
|--------|-------------|
| `registerAgent(opts)` | Register a new agent identity |
| `getAgent(id)` | Get agent details |
| `listAgents(opts?)` | List all agents |
| `revokeAgent(id)` | Revoke agent + all tokens |
| `setPermissions(id, rules)` | Set permission rules |
| `checkPermission(id, tool)` | Check if a tool is allowed |
| `validateToken(token, tool?)` | Validate a token |
| `getAuditLog(opts?)` | Query the audit trail |

## Links

- **Website:** [agentsid.dev](https://agentsid.dev)
- **Docs:** [agentsid.dev/docs](https://agentsid.dev/docs)
- **Dashboard:** [agentsid.dev/dashboard](https://agentsid.dev/dashboard)

## License

MIT
