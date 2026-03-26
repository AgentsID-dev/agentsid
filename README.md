# AgentsID

Identity and auth for AI agents.

Official SDKs and CLI for [agentsid.dev](https://agentsid.dev).

## SDKs

| Language | Package | Install |
|----------|---------|---------|
| TypeScript | [`@agentsid/sdk`](https://www.npmjs.com/package/@agentsid/sdk) | `npm install @agentsid/sdk` |
| Python | `agentsid` | `pip install agentsid` |
| Ruby | `agentsid` | `gem install agentsid` |
| Java | `dev.agentsid:agentsid-sdk` | Maven/Gradle |

## Quick Start

```typescript
import { AgentsID, createHttpMiddleware } from '@agentsid/sdk';

const aid = new AgentsID({ projectKey: 'aid_proj_...' });

const { agent, token } = await aid.registerAgent({
  name: 'research-bot',
  onBehalfOf: 'user_123',
  permissions: ['search_*', 'save_memory'],
});

// Validate every tool call
const middleware = createHttpMiddleware({ projectKey: 'aid_proj_...' });
const allowed = await middleware.isAllowed(token, 'save_memory'); // true
```

## Features

### Advanced Permissions

Fine-grained permission rules with optional advanced controls:

- **Schedule** -- restrict tool access to specific hours and days (e.g., business hours only)
- **Rate Limits** -- sliding-window rate limiting per tool per agent (e.g., 10 calls/minute)
- **Data Classification** -- restrict access by data level (`public`, `internal`, `confidential`)
- **Approval Gates** -- flag sensitive actions for human approval before execution

```typescript
await aid.setPermissions(agentId, [
  {
    toolPattern: 'deploy_*',
    action: 'allow',
    schedule: { hoursStart: 9, hoursEnd: 17, timezone: 'US/Pacific', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    rateLimit: { max: 5, per: 'hour' },
  },
  {
    toolPattern: 'delete_*',
    action: 'allow',
    requiresApproval: true,
  },
]);
```

### Approval Workflow

Human-in-the-loop authorization for sensitive agent actions. When a permission rule has `requires_approval: true`, matching tool calls are held for human review.

```typescript
// List pending approvals
const pending = await aid.listApprovals();

// Approve or reject
await aid.approve(approvalId, { decidedBy: 'admin@example.com' });
await aid.reject(approvalId, { decidedBy: 'admin@example.com', reason: 'Not authorized' });
```

### Webhooks

Subscribe to real-time event notifications via HTTP POST:

- `agent.created`, `agent.revoked`, `agent.denied`
- `limit.approaching`, `limit.reached`
- `approval.requested`, `approval.decided`
- `chain.broken` (audit integrity failure)

```typescript
await aid.createWebhook({
  name: 'slack-alerts',
  url: 'https://hooks.slack.com/services/T00/B00/xxx',
  events: ['agent.denied', 'approval.requested'],
});
```

### Usage Tracking

Monitor current usage against plan limits:

```typescript
const usage = await aid.getUsage();
// { events_this_month: 1200, events_limit: 10000, agents_active: 5, agents_limit: 25, plan: 'free' }
```

## Documentation

- **Website:** [agentsid.dev](https://agentsid.dev)
- **Docs:** [agentsid.dev/docs](https://agentsid.dev/docs)
- **API Reference:** [docs/API.md](docs/API.md)
- **Dashboard:** [agentsid.dev/dashboard](https://agentsid.dev/dashboard)

## License

MIT

