# AgentsID Security Model

This document describes the security architecture of AgentsID: how tokens are signed and validated, how permissions are evaluated, how delegation chains enforce scope narrowing, and what is recorded in the audit trail.

## Token Format and Signing

AgentsID uses HMAC-SHA256 signed tokens for agent authentication. Tokens are self-validating -- the server can verify authenticity without a database call.

### Token Structure

```
aid_tok_<base64url(json_payload)>.<base64url(hmac_signature)>
```

The token consists of three parts:

1. **Prefix** (`aid_tok_`) -- identifies the string as an AgentsID agent token.
2. **Payload** -- base64url-encoded JSON containing the claims.
3. **Signature** -- base64url-encoded HMAC-SHA256 signature of the payload.

### Token Claims

```json
{
  "sub": "agt_7x9k2mNpQ4rS1tUv",
  "prj": "proj_a1b2c3d4e5f6",
  "dby": "user_abc",
  "iat": 1711324800,
  "exp": 1711411200,
  "jti": "tok_a1b2c3d4e5f6"
}
```

| Claim | Description |
|-------|-------------|
| `sub` | Agent ID -- the unique identity of the agent |
| `prj` | Project ID -- which project this agent belongs to |
| `dby` | Delegated by -- the human user ID (or parent agent ID) who authorized this agent |
| `iat` | Issued at -- Unix timestamp of token creation |
| `exp` | Expires at -- Unix timestamp of token expiry |
| `jti` | Token ID -- unique identifier used for revocation lookups |

### Signing Process

1. The payload JSON is serialized with compact separators (no whitespace).
2. The JSON bytes are base64url-encoded (no padding).
3. The encoded payload is signed with HMAC-SHA256 using the server's `SIGNING_SECRET`.
4. The signature bytes are base64url-encoded (no padding).
5. The final token is: `aid_tok_` + encoded payload + `.` + encoded signature.

The `SIGNING_SECRET` is a server-side secret stored as an environment variable. It is never exposed to clients. Rotating this secret invalidates all existing tokens. To rotate gracefully without invalidating active tokens, set `AGENTSID_SIGNING_SECRET_PREVIOUS` to the old secret while updating `AGENTSID_SIGNING_SECRET` to the new value. The server will attempt validation with the current secret first and fall back to the previous secret. Once all tokens signed with the old secret have expired, remove `AGENTSID_SIGNING_SECRET_PREVIOUS`.

### Project API Keys

Project API keys follow a separate format:

```
aid_proj_<random_urlsafe_32>
```

Project keys are generated using `secrets.token_urlsafe(32)` and stored as SHA-256 hashes. The raw key is shown once at project creation and cannot be retrieved again. Authentication is performed by hashing the provided key and comparing against stored hashes.

---

## Token Validation Pipeline

When a token is submitted to the `/validate` endpoint or checked by MCP middleware, validation follows a strict five-step pipeline. Every step must pass. Failure at any step short-circuits to denial.

### Step 1: Signature Verification (no database call)

- Verify the token starts with `aid_tok_`.
- Split the token body on `.` to extract payload and signature.
- Recompute the HMAC-SHA256 signature using the server's signing secret.
- Compare signatures using constant-time comparison (`hmac.compare_digest`) to prevent timing attacks.
- If the signature does not match, reject with a generic error message.

### Step 2: Expiry Check (no database call)

- Decode the base64url payload and parse the JSON claims.
- Compare the `exp` claim against the current Unix timestamp.
- If `exp < now`, reject as expired.

### Step 3: Project Ownership Check (no database call)

- Compare the `prj` claim in the token against the project ID of the authenticated API key.
- If they do not match, reject. This prevents tokens from one project being used to access another project's resources.
- The error message is identical to other validation failures to prevent enumeration.

### Step 4: Revocation Check (database call)

- Look up the token by its `jti` (token ID) in the `agent_tokens` table.
- If the token record does not exist, treat as revoked (fail-closed).
- If the token record has a non-null `revoked_at` timestamp, reject as revoked.

### Step 5: Permission Check (optional, database call)

- If a `tool` parameter was provided in the validation request, evaluate permission rules.
- See the Permission Engine section below for evaluation details.

### Error Message Handling

All validation failures return the same generic message: `"Token validation failed"`. This is intentional. Specific reasons (expired, bad signature, wrong project, revoked) are not disclosed to prevent attackers from learning about token internals. Detailed failure reasons are logged server-side for debugging.

---

## Permission Engine

AgentsID implements a deny-first permission model. If no rule explicitly allows an action, it is denied.

### Evaluation Order

Permission rules are loaded from the database and evaluated in this order:

1. **Explicit DENY rules** are checked first. If any deny rule matches the tool name and conditions, the request is denied immediately. Deny always wins.
2. **Explicit ALLOW rules** are checked next. If an allow rule matches the tool name and conditions, the request is allowed.
3. **Default DENY**. If no rule matches at all, the request is denied.

Within each phase, rules are evaluated in descending priority order (highest priority first).

### Pattern Matching

Tool patterns support Unix-style wildcard matching via `fnmatch`:

| Pattern | Matches | Does Not Match |
|---------|---------|----------------|
| `save_memory` | `save_memory` | `save_note`, `delete_memory` |
| `save_*` | `save_memory`, `save_note`, `save_file` | `delete_memory` |
| `*_memory` | `save_memory`, `delete_memory`, `search_memory` | `save_note` |
| `*` | Everything | (nothing excluded) |

### Condition Evaluation

Rules can include conditions that constrain tool parameters:

```json
{
  "tool_pattern": "save_memory",
  "action": "allow",
  "conditions": {
    "category": ["note", "preference"],
    "workspace_id": [123, 456]
  }
}
```

Condition matching rules:

- All conditions must match (AND logic). If any condition fails, the rule does not apply.
- Each condition key is checked against the corresponding key in the tool call's `params`.
- If the condition value is a list, the param value must be present in the list.
- If the condition value is a scalar, the param value must equal it exactly.
- **Fail-closed behavior**: If a rule has conditions but the tool call has no params, the rule does not match. If a required condition key is missing from params, the rule does not match.
- Complex param values (dicts, lists) are rejected -- only scalar comparisons are supported.

### Example Evaluation

Given these rules:

```json
[
  {"tool_pattern": "delete_*", "action": "deny", "priority": 10},
  {"tool_pattern": "save_memory", "action": "allow", "conditions": {"category": ["note"]}, "priority": 5},
  {"tool_pattern": "search_*", "action": "allow", "priority": 0}
]
```

| Tool Call | Params | Result | Reason |
|-----------|--------|--------|--------|
| `delete_memory` | any | Denied | Matches `delete_*` deny rule |
| `save_memory` | `{"category": "note"}` | Allowed | Matches `save_memory` with valid condition |
| `save_memory` | `{"category": "secret"}` | Denied | Condition fails, no other rule matches, default deny |
| `save_memory` | (none) | Denied | Condition requires params, fail-closed |
| `search_memories` | any | Allowed | Matches `search_*` allow rule |
| `list_categories` | any | Denied | No matching rule, default deny |

---

## Delegation Chains

Every agent is created on behalf of a human user or another agent. The delegation chain records the full provenance of who authorized what.

### Single-Hop Delegation

When a human creates an agent:

```json
{
  "chain": [
    {"type": "user", "id": "user_abc", "granted": ["search_memories", "save_memory"]},
    {"type": "agent", "id": "agt_7x9k2mNpQ4rS1tUv", "received": ["search_memories", "save_memory"]}
  ]
}
```

### Multi-Hop Delegation

When Agent A delegates to Agent B:

```json
{
  "chain": [
    {"type": "user", "id": "user_abc", "granted": ["read", "write", "delete"]},
    {"type": "agent", "id": "agt_parent", "granted": ["read", "write"]},
    {"type": "agent", "id": "agt_child", "received": ["read"]}
  ]
}
```

### Scope Narrowing Rule

Permissions can only narrow at each delegation hop, never expand. When Agent A (which has `[read, write]`) delegates to Agent B, Agent B can receive at most `[read, write]`. It cannot receive `delete` because Agent A does not have it.

The server enforces this by checking each requested child permission against the parent's allow rules. If any child permission is not covered by the parent's permissions, the delegation request is rejected with an error:

```
Permission 'delete' not in parent's scope.
Child permissions can only narrow, never expand.
```

### Delegation in Audit Entries

Every audit log entry includes the full delegation chain, making it possible to trace any agent action back to the human who originally authorized it.

---

## Audit Trail

The audit log is an append-only record of every token validation and permission check.

### What Is Logged

Every call to `/validate` generates an audit entry, regardless of outcome:

| Field | Description |
|-------|-------------|
| `project_id` | Which project the event belongs to |
| `agent_id` | The agent whose token was validated (or "unknown" if token was invalid) |
| `delegated_by` | The human user in the delegation chain |
| `tool` | The tool name being checked (or "token_validation" if no tool was specified) |
| `action` | `allow` or `deny` |
| `params` | Tool parameters (with sensitive values redacted) |
| `result` | `success`, `blocked`, or `error` |
| `delegation_chain` | Full chain from human to agent |
| `error_message` | Internal error description (not exposed to clients) |
| `created_at` | Timestamp of the event |

### Sensitive Parameter Redaction

Parameters with the following key names are automatically replaced with `***REDACTED***` before being written to the audit log:

- `password`
- `secret`
- `token`
- `api_key`
- `credential`
- `key`

Matching is case-insensitive.

### Audit Query Capabilities

The audit log can be queried with filters:

- **By agent**: See everything a specific agent did.
- **By tool**: See all calls to a specific tool across all agents.
- **By action**: See all denied or allowed events.
- **By time range**: Filter events after a specific ISO 8601 datetime.
- **Pagination**: `limit` (1-500, default 100) and `offset` for paging through results.

### Aggregate Statistics

The `/audit/stats` endpoint provides aggregate metrics over a configurable time period (1-365 days):

- Total events
- Events grouped by action (allow/deny)
- Top 10 tools by call count
- Top 10 agents by call count
- Deny rate percentage

### Non-Blocking Writes

Audit log writes are designed to never block or fail the primary request. If an audit write fails (database error, serialization error), the failure is logged to the server's application log but the validation response is still returned to the caller. This ensures that audit infrastructure issues do not cause service outages.

### Audit Hash Chain Integrity

Each audit entry is cryptographically linked to its predecessor using SHA-256 hashing. The entry hash covers the project ID, agent ID, tool, action, result, delegated_by, params, error_message, and the previous entry's hash. The first entry in a project's chain uses the sentinel value `"genesis"` as its previous hash.

This forms a tamper-evident chain: modifying, inserting, or deleting any entry breaks the chain from that point forward. The `GET /api/v1/audit/verify` endpoint walks the chain and reports the first broken link, if any.

To prevent race conditions where concurrent audit writes could fork the chain (two entries reading the same `prev_hash` before either commits), the previous hash query uses `SELECT ... FOR UPDATE` to serialize access to the last audit entry per project.

---

## Rate Limiting

AgentsID applies rate limiting to prevent abuse:

- **Project creation**: 5 requests per minute per IP address (protects against project enumeration and resource exhaustion).
- Rate limiting is implemented using SlowAPI with in-memory storage.
- When rate limited, the server returns HTTP 429 with a `Retry-After` header.

---

## Security Headers

Every HTTP response includes the following security headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframes |
| `Cache-Control` | `no-store` | Prevents caching of API responses containing tokens |
| `X-Request-ID` | (echoed from request) | Correlates client requests with server logs |

### CORS Configuration

CORS is configured per deployment via the `CORS_ORIGINS` environment variable:

- Credentials are not allowed (`allow_credentials=False`) because authentication uses API keys in headers, not cookies.
- Allowed methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- Allowed headers: `Authorization`, `Content-Type`.

### OpenAPI/Swagger Disabled

The Swagger UI (`/docs`) and ReDoc (`/redoc`) endpoints are disabled in production to prevent API schema exposure.

---

## Error Handling

### Generic Error Messages

All unhandled exceptions return a generic `{"detail": "Internal server error"}` response with HTTP 500. The actual exception details are logged server-side but never exposed to clients. This prevents information leakage about the server's internal state, stack traces, or database structure.

### Validation-Specific Error Obfuscation

Token validation errors (bad signature, expired, revoked, wrong project) all return the same message: `"Token validation failed"`. This is a deliberate security measure. Distinguishing between failure modes would allow an attacker to learn:

- Whether a token format is valid (signature errors vs. parse errors)
- Whether a token belongs to a specific project (project mismatch)
- Whether a token was revoked vs. expired (timing attacks on revocation)

---

## Threat Model Summary

| Threat | Mitigation |
|--------|-----------|
| Token forgery | HMAC-SHA256 signature with server-side secret |
| Token replay after revocation | Revocation check via `jti` lookup in database |
| Timing attack on signature | Constant-time comparison via `hmac.compare_digest` |
| Cross-project token use | Token's `prj` claim verified against authenticated project |
| Permission escalation via delegation | Scope narrowing enforced -- child permissions must be a subset of parent |
| Sensitive data in audit logs | Automatic redaction of password, secret, token, api_key, credential, key |
| API schema reconnaissance | Swagger/ReDoc endpoints disabled in production |
| Error message information leakage | Generic error messages; details logged server-side only |
| Clickjacking | `X-Frame-Options: DENY` header on all responses |
| Response caching of tokens | `Cache-Control: no-store` header on all responses |
| MIME type sniffing | `X-Content-Type-Options: nosniff` header |
| Project creation spam | Rate limited to 5/minute per IP |
| Unknown token IDs | Treated as revoked (fail-closed) |
| Missing tool params with conditional rules | Fail-closed -- rule does not match if params are absent |

---

## Responsible Disclosure

If you discover a security vulnerability in AgentsID, please report it responsibly.

**Email:** security@agentsid.dev

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

We will acknowledge receipt within 48 hours and provide a timeline for resolution. We will not take legal action against security researchers who follow responsible disclosure practices.

Do not open public GitHub issues for security vulnerabilities.
