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

## Documentation

- **Website:** [agentsid.dev](https://agentsid.dev)
- **Docs:** [agentsid.dev/docs](https://agentsid.dev/docs)
- **Dashboard:** [agentsid.dev/dashboard](https://agentsid.dev/dashboard)

## License

MIT

