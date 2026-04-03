# AgentsID — Technical Architecture

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **API Server** | FastAPI (Python) | Steven's strongest stack, async, type-safe, fast to build |
| **Database** | PostgreSQL (Supabase) | Already have it, proven, free tier |
| **TypeScript SDK** | Pure TypeScript, zero deps | npm package, MCP middleware |
| **Python SDK** | Pure Python, zero deps | PyPI package, MCP middleware |
| **CLI** | Node.js (npx) | Developer onboarding |
| **Auth** | HMAC token signing | Simple, no external auth deps |
| **Deployment** | Railway + Docker | Already have config patterns from Vault |

## Why NOT:
- **No Redis** — PostgreSQL handles everything at our scale. Add Redis for caching when we need it.
- **No Kafka/queues** — Audit log writes are synchronous inserts. Fast enough for MVP.
- **No separate auth service** — We ARE the auth service. Our own auth is just HMAC project keys.
- **No microservices** — One FastAPI app. Split later if needed.

---

## Project Structure

```
agentsid/
├── PRODUCT.md                    # Product spec (this is the bible)
├── ARCHITECTURE.md               # This file
├── README.md                     # Public-facing, GitHub README
│
├── server/                       # FastAPI backend
│   ├── src/
│   │   ├── app.py               # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py        # Settings from env
│   │   │   ├── database.py      # SQLAlchemy async engine
│   │   │   └── security.py      # HMAC signing, token generation
│   │   ├── models/
│   │   │   └── models.py        # SQLAlchemy models (all tables)
│   │   ├── api/
│   │   │   ├── projects.py      # Project CRUD + API key management
│   │   │   ├── agents.py        # Agent registration, listing, revocation
│   │   │   ├── permissions.py   # Permission rule CRUD
│   │   │   ├── auth.py          # Token validation endpoint
│   │   │   └── audit.py         # Audit log query endpoint
│   │   └── services/
│   │       ├── identity.py      # Agent identity logic
│   │       ├── permission.py    # Permission evaluation engine
│   │       ├── delegation.py    # Delegation chain tracking
│   │       └── audit.py         # Audit log writing + querying
│   ├── alembic/                  # Database migrations
│   ├── tests/
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
│
├── sdk-typescript/               # TypeScript SDK (npm package)
│   ├── src/
│   │   ├── index.ts             # Main export
│   │   ├── client.ts            # AgentsID class — API client
│   │   ├── middleware.ts        # MCP middleware
│   │   ├── types.ts             # TypeScript types
│   │   └── errors.ts            # Error classes
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── sdk-python/                   # Python SDK (PyPI package)
│   ├── agentsid/
│   │   ├── __init__.py          # Main export
│   │   ├── client.py            # AgentsID class — API client
│   │   ├── middleware.py        # MCP middleware
│   │   ├── types.py             # Dataclasses/types
│   │   └── errors.py            # Exception classes
│   ├── pyproject.toml
│   └── README.md
│
├── cli/                          # CLI tool (npx agentsid)
│   ├── src/
│   │   ├── index.ts             # CLI entry point
│   │   ├── commands/
│   │   │   ├── init.ts          # agentsid init
│   │   │   ├── register.ts      # agentsid register-agent
│   │   │   ├── list.ts          # agentsid list-agents
│   │   │   ├── revoke.ts        # agentsid revoke
│   │   │   └── audit.ts         # agentsid audit
│   │   └── utils.ts
│   ├── package.json
│   └── README.md
│
└── site/                         # Landing page (agentsid.dev)
    └── index.html
```

---

## API Endpoints

### Projects
```
POST   /api/v1/projects                    Create project, get API key
GET    /api/v1/projects/me                 Get current project info
POST   /api/v1/projects/rotate-key         Rotate project API key
```

### Agents
```
POST   /api/v1/agents                      Register a new agent
GET    /api/v1/agents                      List agents (filterable)
GET    /api/v1/agents/:id                  Get agent details
PATCH  /api/v1/agents/:id                  Update agent metadata
DELETE /api/v1/agents/:id                  Revoke agent (soft delete)
```

### Permissions
```
PUT    /api/v1/agents/:id/permissions      Set permission rules
GET    /api/v1/agents/:id/permissions      Get permission rules
POST   /api/v1/check                       Check if an action is allowed
```

### Auth (Token Validation)
```
POST   /api/v1/validate                    Validate agent token
POST   /api/v1/introspect                  Full token introspection
```

### Audit
```
GET    /api/v1/audit                       Query audit log
GET    /api/v1/audit/export                Export as JSON/CSV
GET    /api/v1/audit/stats                 Aggregate stats
```

### Health
```
GET    /health                             Health check
```

---

## Authentication Flow

### Project Authentication (API calls to AgentsID)
```
Developer → AgentsID API
  Authorization: Bearer aid_proj_<key>
```
Project keys are HMAC-signed, validated server-side. No database lookup needed for validation — the signature proves authenticity.

### Agent Authentication (Tool calls through middleware)
```
Agent → MCP Server (with AgentsID middleware)
  Authorization: Bearer aid_tok_<token>

Middleware:
  1. Extract token from request
  2. Validate signature (HMAC — no DB call)
  3. Check expiry (from token claims)
  4. Check revocation (DB call, cached 60s)
  5. Load permissions (DB call, cached 60s)
  6. Match tool name against permission rules
  7. Allow or deny
  8. Log to audit trail (async, non-blocking)
```

### Token Format
```
aid_tok_<base64url(header.payload.signature)>

Header: { alg: "HS256", typ: "AID" }
Payload: {
  sub: "agt_7x9k2m...",        // agent ID
  prj: "proj_...",             // project ID
  dby: "user_abc",             // delegated by (human)
  iat: 1711324800,             // issued at
  exp: 1711411200,             // expires at
  jti: "tok_...",              // unique token ID (for revocation)
}
Signature: HMAC-SHA256(header + payload, project_secret)
```

Tokens are JWTs with custom claims. They can be validated without a database call (signature check + expiry check). Revocation requires a cache-backed DB check.

---

## Permission Engine

### Evaluation Order
1. Check explicit DENY rules first (deny always wins)
2. Check explicit ALLOW rules
3. Fall back to default (default: DENY)

### Pattern Matching
```
"save_memory"     → exact match
"save_*"          → prefix wildcard
"*_memory"        → suffix wildcard
"*"               → match all
```

### Condition Evaluation
```json
{
  "tool": "save_memory",
  "action": "allow",
  "conditions": {
    "category": ["note", "preference"],
    "workspace_id": [123, 456]
  }
}
```
Conditions match against tool call parameters. All conditions must match (AND logic).

---

## Delegation Chain Tracking

When Agent A is created on behalf of User X:
```json
{
  "chain": [
    { "type": "user", "id": "user_abc", "granted": ["read", "write"] },
    { "type": "agent", "id": "agt_xyz", "received": ["read", "write"] }
  ]
}
```

When Agent A delegates to Agent B:
```json
{
  "chain": [
    { "type": "user", "id": "user_abc", "granted": ["read", "write"] },
    { "type": "agent", "id": "agt_xyz", "granted": ["read"] },
    { "type": "agent", "id": "agt_abc", "received": ["read"] }
  ]
}
```

**Key rule:** Permissions can only narrow at each hop. Agent A has [read, write] but can only delegate [read] to Agent B. Agent B cannot escalate beyond what Agent A granted.

---

## Build Order (Week 1)

### Day 1: Foundation
- [ ] FastAPI app skeleton
- [ ] Database models + first migration
- [ ] Config from env
- [ ] Project creation + API key generation
- [ ] Health endpoint

### Day 2: Agent Identity
- [ ] Agent registration endpoint
- [ ] Token generation (JWT-like with HMAC)
- [ ] Token validation endpoint
- [ ] Agent listing + filtering
- [ ] Agent revocation

### Day 3: Permission Engine
- [ ] Permission rules CRUD
- [ ] Pattern matching (exact + wildcard)
- [ ] Condition evaluation
- [ ] Default deny behavior
- [ ] Check endpoint

### Day 4: MCP Middleware
- [ ] TypeScript middleware (intercept tool calls, validate, log)
- [ ] Python middleware (same)
- [ ] Integration test with a real MCP server

### Day 5: Audit + Delegation
- [ ] Audit log writes (async, non-blocking)
- [ ] Audit log query endpoint
- [ ] Delegation chain tracking
- [ ] Delegation chain validation (scope narrowing)
- [ ] Export endpoint (JSON)

### Day 6: SDK + CLI
- [ ] TypeScript SDK (npm package)
- [ ] Python SDK (PyPI package)
- [ ] CLI tool (npx agentsid init/register/list/revoke/audit)

### Day 7: Ship
- [ ] Landing page (agentsid.dev)
- [ ] README with quickstart
- [ ] Deploy server to Railway
- [ ] Publish npm + PyPI packages
- [ ] Show HN post draft
