# AgentsID — Identity and Auth for AI Agents

## What This Is

AgentsID is the identity and authentication layer for AI agents. It answers three questions every agent system needs to answer:

1. **Who is this agent?** (Identity)
2. **What is it allowed to do?** (Permissions)
3. **Who authorized it?** (Delegation)

## The Problem We Solve

AI agents are accessing databases, sending emails, calling APIs, and making purchases — but there's no standard way to identify them, limit what they can do, or trace their actions back to a human.

**The current state (2026):**
- 88% of MCP servers need authentication
- Only 8.5% use OAuth — the rest use static API keys in environment variables
- 80% of organizations can't tell what their agents are doing in real-time
- The MCP auth spec changed 4 times in 12 months, frustrating developers
- 6 startups tried to solve this, each solved one piece, none built the full stack

## Who This Is For

**Primary user:** Developer building AI agents or MCP servers who needs auth.

**Primary buyer:** Engineering lead at a B2B SaaS company (100-500 people) who shipped AI features and needs agents to authenticate to third-party APIs on behalf of customers.

**Trigger event:** A customer's security questionnaire asks "How does your AI agent authenticate? What permissions does it have? Can you audit what it did?"

## What We Are NOT

- Not a general-purpose auth provider (Auth0, Clerk, Supabase Auth handle human auth)
- Not an enterprise governance platform (Okta, Microsoft handle that)
- Not a tool integration layer (Composio handles that)
- We are SPECIFICALLY: identity, delegation, permissions, and audit for AI agents

---

## Core Concepts

### 1. Agent Identity

Every agent gets a unique, verifiable identity. Not a shared API key — a specific identity for a specific agent instance.

```
Agent {
  id: "agt_7x9k2m..."          // unique identifier
  name: "research-assistant"     // human-readable name
  project_id: "proj_..."        // which project this belongs to
  created_by: "user_..."        // human who created it
  created_at: timestamp
  expires_at: timestamp | null   // optional TTL
  status: "active" | "revoked"
  metadata: {}                   // custom key-value pairs
}
```

An agent identity is NOT a user. It's NOT a service account. It's a new identity type that represents an autonomous software actor with:
- A specific human who authorized it (delegation chain)
- A specific set of permissions (not all-or-nothing)
- A specific lifetime (can expire)
- Full audit trail of every action

### 2. Delegation Chains

Every agent action must be traceable to a human. The delegation chain records:

```
Human (user_abc)
  → authorized Agent (agt_xyz)
    → with permissions [read, search]
      → in scope [workspace_123]
        → until 2026-04-01
```

Multi-hop delegation is supported:
```
Human → Agent A → delegates to Agent B → calls Tool C
```

At every hop, the chain is recorded and permissions can only narrow (never expand).

### 3. Permissions (Per-Tool Authorization)

Current MCP auth is all-or-nothing: either the agent can call all tools or none. AgentsID provides granular, per-tool permissions.

```
Permissions {
  agent_id: "agt_..."
  rules: [
    { tool: "search_memories", action: "allow" },
    { tool: "delete_*", action: "deny" },
    { tool: "save_memory", action: "allow", conditions: { category: ["note", "preference"] } },
  ]
  default: "deny"  // deny anything not explicitly allowed
}
```

Rules support:
- Exact tool names: `"search_memories"`
- Wildcards: `"delete_*"` (all delete tools)
- Conditions: restrictions on tool parameters
- Default deny: if not listed, it's blocked

### 4. Audit Log

Every agent action is logged immutably:

```
AuditEntry {
  id: "aud_..."
  timestamp: ISO 8601
  agent_id: "agt_..."
  delegated_by: "user_..."      // human in the chain
  tool: "save_memory"
  action: "allow" | "deny"
  params: { ... }               // what was passed to the tool
  result: "success" | "error"
  delegation_chain: [user_abc → agt_xyz]
}
```

Queryable by: agent, user, tool, time range, action.
Exportable as JSON or CSV for compliance.

### 5. Token Vault (Week 2+)

Manages OAuth tokens for third-party services. When an agent needs to call Slack, Google, or Salesforce on behalf of a user:

1. Agent requests access to a service
2. AgentsID checks if a valid token exists
3. If not, prompts the user to authenticate (async)
4. Stores the token securely, handles refresh
5. Issues a scoped, time-limited token to the agent

This replaces developers manually managing OAuth tokens, refresh flows, and multi-tenant token isolation.

---

## SDK Design

### TypeScript SDK

```typescript
import { AgentsID } from '@agentsid/sdk';

// ═══════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════

const aid = new AgentsID({
  projectKey: 'aid_proj_...',   // from dashboard or CLI
  baseUrl: 'https://agentsid.dev',  // or self-hosted
});


// ═══════════════════════════════════════════
// REGISTER AN AGENT
// ═══════════════════════════════════════════

const agent = await aid.registerAgent({
  name: 'research-assistant',
  onBehalfOf: 'user_abc',        // human who authorized this
  permissions: [
    'search_memories',
    'save_memory',
    'list_categories',
  ],
  ttl: '24h',                    // auto-expires in 24 hours
  metadata: {
    framework: 'langchain',
    model: 'claude-sonnet-4',
  },
});

// agent.id → "agt_7x9k2m..."
// agent.token → "aid_tok_..." (bearer token for this agent)


// ═══════════════════════════════════════════
// MCP MIDDLEWARE (drop-in)
// ═══════════════════════════════════════════

// Validates every tool call against agent permissions.
// Logs every action to the audit trail.
// Blocks unauthorized calls with a clear error.

import { FastMCP } from '@modelcontextprotocol/sdk';

const server = new FastMCP('My Server');
server.use(aid.mcpMiddleware());

// The middleware:
// 1. Extracts agent token from the request
// 2. Validates the token (not expired, not revoked)
// 3. Checks if the agent has permission for this tool
// 4. Logs the call to the audit trail
// 5. Passes through if allowed, rejects if denied


// ═══════════════════════════════════════════
// MANUAL PERMISSION CHECKS
// ═══════════════════════════════════════════

// For non-MCP use cases or custom logic:

const allowed = await aid.checkPermission({
  agentId: agent.id,
  tool: 'delete_memory',
});
// → { allowed: false, reason: "tool not in agent's permission list" }

// Or throw on denial:
await aid.requirePermission(agentToken, 'save_memory');
// → throws AgentsIDError if denied


// ═══════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════

const logs = await aid.getAuditLog({
  agentId: agent.id,
  since: '2026-03-25',
  tool: 'save_memory',       // optional filter
  limit: 100,
});

// logs → [{ timestamp, agent_id, tool, action, result, delegation_chain }, ...]


// ═══════════════════════════════════════════
// REVOKE AN AGENT
// ═══════════════════════════════════════════

await aid.revokeAgent(agent.id);
// All tokens immediately invalid. Logged to audit trail.


// ═══════════════════════════════════════════
// LIST ALL AGENTS
// ═══════════════════════════════════════════

const agents = await aid.listAgents({
  status: 'active',          // or 'revoked', 'expired', 'all'
  createdBy: 'user_abc',     // optional filter
});
```

### Python SDK

```python
from agentsid import AgentsID

# ═══════════════════════════════════════════
# INITIALIZE
# ═══════════════════════════════════════════

aid = AgentsID(project_key="aid_proj_...")


# ═══════════════════════════════════════════
# REGISTER AN AGENT
# ═══════════════════════════════════════════

agent = await aid.register_agent(
    name="research-assistant",
    on_behalf_of="user_abc",
    permissions=["search_memories", "save_memory"],
    ttl="24h",
)


# ═══════════════════════════════════════════
# MCP MIDDLEWARE (FastMCP decorator)
# ═══════════════════════════════════════════

from mcp.server.fastmcp import FastMCP

server = FastMCP("My Server")

@aid.mcp_middleware(server)
async def setup():
    pass  # middleware auto-validates all tool calls


# ═══════════════════════════════════════════
# MANUAL CHECKS
# ═══════════════════════════════════════════

allowed = await aid.check_permission(
    agent_id=agent.id,
    tool="delete_memory",
)

await aid.require_permission(agent_token, "save_memory")


# ═══════════════════════════════════════════
# AUDIT
# ═══════════════════════════════════════════

logs = await aid.get_audit_log(
    agent_id=agent.id,
    since="2026-03-25",
    limit=100,
)


# ═══════════════════════════════════════════
# REVOKE
# ═══════════════════════════════════════════

await aid.revoke_agent(agent.id)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Developer's App                    │
│                                                       │
│   ┌─────────┐    ┌──────────┐    ┌────────────────┐ │
│   │ Agent A  │    │ Agent B  │    │ MCP Server     │ │
│   │ (token)  │    │ (token)  │    │ + middleware    │ │
│   └────┬─────┘    └────┬─────┘    └───────┬────────┘ │
│        │               │                  │          │
└────────┼───────────────┼──────────────────┼──────────┘
         │               │                  │
         └───────────────┼──────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    AgentsID API     │
              │                     │
              │  ┌───────────────┐  │
              │  │   Identity    │  │  — agent registration
              │  │   Service     │  │  — token issuance
              │  └───────────────┘  │  — token validation
              │                     │
              │  ┌───────────────┐  │
              │  │  Permission   │  │  — per-tool rules
              │  │   Engine      │  │  — wildcard matching
              │  └───────────────┘  │  — condition evaluation
              │                     │
              │  ┌───────────────┐  │
              │  │   Delegation  │  │  — chain tracking
              │  │   Tracker     │  │  — scope narrowing
              │  └───────────────┘  │  — human attribution
              │                     │
              │  ┌───────────────┐  │
              │  │  Audit Log    │  │  — immutable event log
              │  │               │  │  — queryable API
              │  └───────────────┘  │  — export (JSON/CSV)
              │                     │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    PostgreSQL       │
              │  agents, tokens,    │
              │  permissions, audit │
              └─────────────────────┘
```

## Data Model

```sql
-- Projects (one per customer/app)
projects:
  id, name, api_key_hash, created_at

-- Agent identities
agents:
  id, project_id, name, created_by (user ref),
  status (active/revoked/expired), expires_at,
  metadata (JSONB), created_at

-- Agent tokens (short-lived, rotatable)
agent_tokens:
  id, agent_id, token_hash, expires_at,
  created_at, revoked_at

-- Permission rules
permissions:
  id, agent_id, tool_pattern, action (allow/deny),
  conditions (JSONB), priority (int)

-- Delegation chains
delegations:
  id, agent_id, delegated_by_type (user/agent),
  delegated_by_id, permissions_snapshot (JSONB),
  created_at, expires_at

-- Audit log (append-only)
audit_log:
  id, project_id, agent_id, delegated_by,
  tool, action (allow/deny), params (JSONB),
  result (success/error), delegation_chain (JSONB),
  created_at
```

---

## Week 1 MVP Scope

### Build (in order):
1. **Project + API key management** — create project, generate project API key
2. **Agent registration** — create agent identity, issue token
3. **Permission engine** — per-tool rules with wildcards, default deny
4. **Token validation** — verify token, check expiry, check revocation
5. **MCP middleware (TypeScript)** — drop-in for any MCP server
6. **MCP middleware (Python)** — same for Python MCP servers
7. **Audit logging** — every action logged, queryable API
8. **Delegation chains** — track human → agent → action
9. **CLI tool** — `npx agentsid init`, `agentsid register-agent`, etc.
10. **Landing page** — agentsid.dev

### Don't Build (Week 1):
- Token vault (third-party OAuth management)
- Dashboard UI (CLI is enough for developers)
- Enterprise IdP integration (Okta, Entra)
- Multi-tenant token isolation
- SSO/SCIM
- SOC 2 compliance docs

### Don't Build (Maybe Ever):
- Human auth (Auth0/Clerk/Supabase do this)
- General API gateway features
- Rate limiting (other tools do this)

---

## Pricing

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 1K auth events/mo, 5 agents, 7-day audit retention |
| Developer | $49/mo | 25K events, 50 agents, 30-day audit, email support |
| Growth | $199/mo | 250K events, unlimited agents, 90-day audit, token vault |
| Enterprise | Custom | SLA, SSO, compliance reports, 1-year audit, on-prem |

---

## Competitive Positioning

"Auth0 handles humans. AgentsID handles agents."

| | Auth0 | Microsoft Entra | Agentic Fabriq | AgentsID |
|---|---|---|---|---|
| **Available today** | Yes (GA) | Preview only | No (private pilot) | Building now |
| **Agent-to-agent auth** | No | Preview | Claims yes | Yes |
| **MCP-native** | Partial | No | Unknown | Yes (core feature) |
| **Developer experience** | Good | Complex | Unknown | Top priority |
| **Self-serve** | Yes ($35+/mo) | No (enterprise) | No (sales only) | Yes ($0-49/mo) |
| **Per-tool permissions** | No | No | Unknown | Yes |
| **Delegation chains** | Partial | Partial | Claims yes | Yes |
| **Audit trail** | Basic | Strong | Claims yes | Full (queryable API) |
| **Framework support** | LangChain, LlamaIndex | Azure AI only | Unknown | Any MCP server |

---

## Go-to-Market

### Week 1-2: Ship
- Open-source SDK on GitHub
- npm + PyPI packages
- Landing page at agentsid.dev
- Show HN post

### Week 3-4: Distribute
- Post on r/ClaudeAI, r/cursor, r/LangChain
- Tweet thread showing the problem + solution
- Submit to MCP directories (Smithery, mcp.so)
- Write blog post: "Why Your MCP Server's Auth Is Broken"

### Month 2-3: Monetize
- Launch hosted service (free tier)
- Dashboard for audit log visualization
- First paying customers from GitHub stars → hosted tier

### Month 4-6: Enterprise
- Token vault (third-party OAuth)
- Enterprise IdP integration
- SOC 2 compliance
- Sales conversations with Series B/C SaaS companies

---

## Success Metrics

### Week 1:
- [ ] SDK works end-to-end (register → validate → audit)
- [ ] MCP middleware blocks unauthorized tool calls
- [ ] 10+ GitHub stars

### Month 1:
- [ ] 100+ npm/PyPI installs
- [ ] 50+ GitHub stars
- [ ] 5+ developers using it in real projects
- [ ] Show HN post with 50+ points

### Month 3:
- [ ] 1,000+ installs
- [ ] 10+ hosted tier users
- [ ] First paying customer
- [ ] $500+ MRR

### Month 6:
- [ ] 5,000+ installs
- [ ] 100+ hosted users
- [ ] 10+ paying customers
- [ ] $5,000+ MRR
