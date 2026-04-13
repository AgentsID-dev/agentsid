<p align="center">
  <img src="https://agentsid.dev/favicon.svg" width="60" alt="AgentsID" />
</p>

<h1 align="center">AgentsID</h1>

<p align="center">
  <strong>Identity, permissions, and audit for AI agents.</strong>
  <br />
  The Auth0 for the agent economy.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@agentsid/sdk"><img src="https://img.shields.io/npm/v/@agentsid/sdk?style=flat-square&color=7c5bf0&label=npm" alt="npm" /></a>
  <a href="https://pypi.org/project/agentsid/"><img src="https://img.shields.io/pypi/v/agentsid?style=flat-square&color=7c5bf0&label=pypi" alt="pypi" /></a>
  <a href="https://rubygems.org/gems/agentsid"><img src="https://img.shields.io/gem/v/agentsid?style=flat-square&color=7c5bf0&label=gem" alt="gem" /></a>
  <a href="https://agentsid.dev"><img src="https://img.shields.io/badge/website-agentsid.dev-7c5bf0?style=flat-square" alt="website" /></a>
  <a href="https://github.com/stevenkozeniesky02/agentsid/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-7c5bf0?style=flat-square" alt="license" /></a>
</p>

<p align="center">
  <a href="https://agentsid.dev/docs">Docs</a> &middot;
  <a href="https://agentsid.dev/guides">Guides</a> &middot;
  <a href="https://agentsid.dev/dashboard">Dashboard</a> &middot;
  <a href="https://agentsid.dev/docs#api-reference">API Reference</a>
</p>

---

## The Problem

AI agents are accessing databases, sending emails, calling APIs, and making purchases -- but there is no standard way to identify them, limit what they can do, or trace their actions back to a human.

- **88%** of MCP servers need authentication, but only **8.5%** use OAuth
- **53%** rely on static API keys passed as environment variables
- **80%** of organizations cannot tell what their agents are doing in real-time

Auth0 handles humans. **AgentsID handles agents.**

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  Your App                                           │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ Agent A   │  │ Agent B   │  │ MCP Server     │  │
│  │ (token)   │  │ (token)   │  │ + middleware    │  │
│  └─────┬─────┘  └─────┬─────┘  └───────┬────────┘  │
│        │              │                │            │
└────────┼──────────────┼────────────────┼────────────┘
         │              │                │
         └──────────────┼────────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   AgentsID API  │
              │                 │
              │  Identity       │  Register, issue tokens
              │  Permissions    │  Per-tool deny-first rules
              │  Delegation     │  Human → Agent → Agent
              │  Audit          │  Tamper-evident hash chain
              └─────────────────┘
```

**Every tool call flows through AgentsID.** The middleware validates the agent's token, checks permissions against deny-first rules, and logs the result to a tamper-evident audit chain -- all in under 1ms.

## Quick Start

### Install

```bash
npm install @agentsid/sdk    # TypeScript
pip install agentsid          # Python
gem install agentsid          # Ruby
```

### Register an agent

```typescript
import { AgentsID } from '@agentsid/sdk';

const aid = new AgentsID({ projectKey: 'aid_proj_...' });

const { agent, token } = await aid.registerAgent({
  name: 'research-bot',
  onBehalfOf: 'user_123',
  permissions: ['search_*', 'save_memory'],
});
```

### Validate every tool call

```typescript
const result = await aid.validate(token, 'delete_user');

if (!result.allowed) {
  console.log('Blocked:', result.reason);
  // → "Tool 'delete_user' is not in the allow list"
}
```

### Add MCP middleware (2 lines)

```typescript
import { createHttpMiddleware } from '@agentsid/sdk';

const guard = createHttpMiddleware({ projectKey: 'aid_proj_...' });
// That's it. Every tool call is now validated.
```

## Features

### Deny-First Permissions

Every tool call is blocked unless explicitly allowed. Fine-grained rules with wildcards, conditions, schedules, and rate limits.

```typescript
await aid.setPermissions(agentId, [
  { toolPattern: 'search_*', action: 'allow' },
  { toolPattern: 'deploy_*', action: 'allow',
    schedule: { hoursStart: 9, hoursEnd: 17, timezone: 'US/Pacific' },
    rateLimit: { max: 5, per: 'hour' } },
  { toolPattern: 'delete_*', action: 'allow', requiresApproval: true },
]);
```

### HMAC-SHA256 Tokens

Cryptographically signed agent tokens verified without a database call. Supports key rotation with zero downtime.

### Delegation Chains

Every agent action traces back to a human. Multi-hop delegation (Human → Agent A → Agent B) with automatic scope narrowing -- child agents can never have more permissions than their parent.

### Tamper-Evident Audit

SHA-256 hash chain links every event. If anyone modifies a record, the chain breaks. Queryable by agent, tool, action, and time range. Exportable for compliance.

### Approval Gates

Sensitive actions pause for human approval. Email notifications, webhook triggers, time-boxed decisions.

```typescript
const pending = await aid.listApprovals();
await aid.approve(approvalId, { decidedBy: 'admin@example.com' });
```

### Webhooks

Real-time event notifications for 8 event types:

`agent.created` · `agent.revoked` · `agent.denied` · `limit.approaching` · `limit.reached` · `approval.requested` · `approval.decided` · `chain.broken`

## SDKs

| Language | Package | Install |
|----------|---------|---------|
| **TypeScript** | [`@agentsid/sdk`](https://www.npmjs.com/package/@agentsid/sdk) | `npm install @agentsid/sdk` |
| **Python** | [`agentsid`](https://pypi.org/project/agentsid/) | `pip install agentsid` |
| **Ruby** | [`agentsid`](https://rubygems.org/gems/agentsid) | `gem install agentsid` |
| **Java** | `dev.agentsid:agentsid-sdk` | Maven / Gradle |

## CLI

```bash
npx agentsid init                           # Create project, get API key
npx agentsid register-agent --name "bot"    # Register an agent
npx agentsid list-agents                    # List all agents
npx agentsid audit --agent <id>             # View audit log
npx agentsid revoke <id>                    # Revoke an agent
```

## GitHub Action

Scan any MCP server for security issues directly from GitHub. The action posts a grade on every PR, writes a full dashboard to the workflow run summary, and uploads findings to the native **Security → Code scanning** tab as SARIF.

### Try it without installing

Open an issue titled `scan: <package-or-url>` on this repo and the scanner runs automatically. Results are posted as a comment within about 30 seconds.

Example: [`scan: @playwright/mcp-server`](../../issues/new?title=scan%3A+%40playwright%2Fmcp-server)

### CI Usage

Add this to any workflow to scan your MCP server on every pull request:

```yaml
name: MCP Security Scan
on: [pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write    # post PR comment
      security-events: write  # upload findings to Security tab
    steps:
      - uses: stevenkozeniesky02/agentsid@master
        with:
          target: 'npx @your-org/your-mcp-server'
```

The `security-events: write` permission is required for SARIF upload. Without it, findings still appear in the PR comment and workflow summary but will not show up in the Security tab.

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `target` | Yes | — | MCP server to scan. An npx command (e.g. `npx @your-org/server`) or an HTTP URL (e.g. `https://mcp.example.com/mcp`). |
| `env` | No | `''` | Environment variables for the server, one `KEY=VALUE` per line. |
| `fail-on-grade` | No | `''` | Fail the workflow if the grade is at or below this letter (`A`, `B`, `C`, `D`, `F`). Leave empty to never fail on grade alone. |
| `comment` | No | `'true'` | Post results as a sticky PR comment with scan history. |
| `upload-sarif` | No | `'true'` | Upload findings to the GitHub Security tab as SARIF. |
| `token` | No | `github.token` | Token used to post PR comments. |

### Outputs

| Output | Description |
|--------|-------------|
| `grade` | Overall letter grade (`A`–`F`) |
| `score` | Numeric score (`0`–`100`) |
| `findings-critical` | Count of CRITICAL findings |
| `findings-high` | Count of HIGH findings |
| `report-path` | Absolute path to the full JSON report file |

### Examples

**Block PRs that score D or below:**

```yaml
- uses: stevenkozeniesky02/agentsid@master
  with:
    target: 'npx @your-org/your-mcp-server'
    fail-on-grade: 'D'
```

**Scan a remote server with credentials:**

```yaml
- uses: stevenkozeniesky02/agentsid@master
  with:
    target: 'https://mcp.example.com/mcp'
    env: |
      API_KEY=${{ secrets.MCP_API_KEY }}
      REGION=us-east-1
```

**Scan multiple servers in parallel (matrix):**

```yaml
jobs:
  scan:
    strategy:
      matrix:
        server:
          - 'npx @your-org/server-a'
          - 'npx @your-org/server-b'
          - 'npx @your-org/server-c'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      security-events: write
    steps:
      - uses: stevenkozeniesky02/agentsid@master
        with:
          target: ${{ matrix.server }}
```

**Use the grade in downstream steps:**

```yaml
- uses: stevenkozeniesky02/agentsid@master
  id: scan
  with:
    target: 'npx @your-org/your-mcp-server'

- run: |
    echo "Grade: ${{ steps.scan.outputs.grade }}"
    echo "Score: ${{ steps.scan.outputs.score }}"
    echo "Critical findings: ${{ steps.scan.outputs.findings-critical }}"
```

### What the scanner checks

Based on 5 published research papers and analysis of more than 15,000 MCP servers across five category grades:

- **auth** — token handling, credential exposure, unauthenticated tool access
- **injection** — prompt injection, unicode smuggling, invisible instructions
- **input validation** — schema gaps, unbounded parameters, type confusion
- **output safety** — data leakage, unsafe returns, sensitive field exposure
- **privilege** — overly broad tool scopes, privilege escalation paths

Findings are grouped into a trust score (0–100) and letter grade (A–F), with per-category grades broken out in the PR comment and workflow summary.

## Documentation

| Resource | Link |
|----------|------|
| Website | [agentsid.dev](https://agentsid.dev) |
| Documentation | [agentsid.dev/docs](https://agentsid.dev/docs) |
| Setup Guides | [agentsid.dev/guides](https://agentsid.dev/guides) |
| Dashboard | [agentsid.dev/dashboard](https://agentsid.dev/dashboard) |
| API Reference | [docs/API.md](docs/API.md) |
| Security Model | [docs/SECURITY.md](docs/SECURITY.md) |

## Self-Hosting

AgentsID is a single FastAPI application backed by PostgreSQL.

```bash
git clone https://github.com/stevenkozeniesky02/agentsid.git
cd agentsid/server
cp .env.example .env  # set DATABASE_URL and SIGNING_SECRET
pip install -e .
uvicorn src.app:app --host 0.0.0.0 --port 8000
```

Or with Docker:

```bash
docker build -t agentsid .
docker run -p 8000:8000 --env-file .env agentsid
```

## Why AgentsID

| | Auth0 | Microsoft Entra | AgentsID |
|---|---|---|---|
| Agent-to-agent auth | No | Preview only | Yes |
| MCP native | No | No | Yes |
| Per-tool permissions | No | No | Yes |
| Delegation chains | No | Limited | Yes |
| Self-hostable | No | No | Yes |
| Developer-first | Complex | Azure-locked | 3 lines of code |
| Pricing | Expensive at scale | Enterprise only | Free tier + usage-based |

## License

[MIT](LICENSE)
