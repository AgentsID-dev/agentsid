# AgentsID Permission Specification v1.0

**Status:** Draft
**Published:** March 2026
**Authors:** AgentsID Research
**Repository:** github.com/stevenkozeniesky02/permission-spec
**Canonical URL:** agentsid.dev/spec

---

## Abstract

This specification defines a standard format for expressing, evaluating, and auditing permission rules for AI agent tool calls. It is designed for use with the Model Context Protocol (MCP) and any agent framework where a language model invokes external tools. The specification covers permission rule format, constraint types, evaluation algorithm, delegation chains, audit log format, agent identity tokens, and extension mechanisms.

The goal is to provide a common language for agent permissions that can be adopted independently of any specific runtime, platform, or vendor.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Terminology](#2-terminology)
3. [Permission Rule Format](#3-permission-rule-format)
   - 3.1 Tool Patterns
   - 3.2 Actions
   - 3.3 Conditions
   - 3.4 Priority
4. [Constraint Types](#4-constraint-types)
   - 4.1 Schedule
   - 4.2 Rate Limit
   - 4.3 Data Classification
   - 4.4 Budget
   - 4.5 Sequence
   - 4.6 Session Limit
   - 4.7 Risk Score
   - 4.8 IP Allowlist
   - 4.9 Chain Depth
   - 4.10 Cooldown
   - 4.11 Anomaly Detection
   - 4.12 Approval Gate
5. [Evaluation Algorithm](#5-evaluation-algorithm)
6. [Delegation Protocol](#6-delegation-protocol)
7. [Audit Log Format](#7-audit-log-format)
8. [Agent Identity Format](#8-agent-identity-format)
9. [Extension Mechanism](#9-extension-mechanism)
10. [Security Considerations](#10-security-considerations)
11. [Reference Implementation](#11-reference-implementation)

---

## 1. Introduction

AI agents operating through the Model Context Protocol have unrestricted access to every tool a server exposes by default. There is no standard mechanism for expressing which tools an agent may call, under what conditions, with what parameter constraints, or subject to what approval requirements.

This creates three classes of risk:

1. **Over-privilege** — agents can call destructive or sensitive tools they should not have access to
2. **Scope ambiguity** — agents infer the broadest valid scope for tool parameters in the absence of constraints
3. **Auditability gaps** — there is no standard for logging what an agent did, when, and under whose authority

This specification defines a portable, vendor-neutral format for addressing all three. A permission policy is a JSON document. An evaluation engine is a pure function. An audit log is a hash-chained append-only ledger. Any runtime can implement this spec without depending on AgentsID infrastructure.

### 1.1 Design Principles

- **Deny-first** — absent a matching allow rule, all tool calls are denied
- **Least privilege** — rules grant the minimum necessary access
- **Composable** — rules combine without conflict via explicit priority
- **Portable** — the spec is a JSON schema, not a platform dependency
- **Auditable** — every evaluation decision is logged with cryptographic integrity

### 1.2 Relationship to MCP

This specification is a complement to MCP, not a replacement. MCP defines how tools are discovered and called. This specification defines who may call them, under what conditions, and with what audit trail. It operates as a policy enforcement layer between the agent and the MCP server.

---

## 2. Terminology

| Term | Definition |
|------|-----------|
| **Agent** | An LLM-driven process that invokes tools to complete tasks |
| **Principal** | A human user or system that authorizes an agent to act on their behalf |
| **Tool** | A callable function exposed by an MCP server |
| **Permission Rule** | A JSON object expressing whether a tool call is allowed or denied |
| **Policy** | An ordered collection of permission rules |
| **Constraint** | A condition attached to a rule that must be satisfied for the rule to match |
| **Delegation** | The act of a principal granting a subset of their permissions to an agent or sub-agent |
| **Chain** | An ordered sequence of delegations from a root principal to a leaf agent |
| **Audit Entry** | An immutable record of a tool call evaluation decision |

---

## 3. Permission Rule Format

A permission policy is a JSON object with the following top-level structure:

```json
{
  "version": "1.0",
  "agentId": "agent_abc123",
  "issuedAt": "2026-03-29T00:00:00Z",
  "expiresAt": "2026-04-29T00:00:00Z",
  "rules": [ ...PermissionRule[] ]
}
```

### 3.1 Tool Patterns

Each rule targets one or more tools using glob patterns:

```json
{
  "tools": ["github.*", "filesystem.read_*"],
  "action": "allow"
}
```

Pattern matching rules:

| Pattern | Matches |
|---------|---------|
| `*` | Any single tool name segment |
| `**` | Any tool name, including namespaced tools |
| `github.*` | All tools in the `github` namespace |
| `filesystem.read_file` | Exactly one tool |
| `!filesystem.write_*` | Negation — exclude write tools |

Patterns are evaluated in the order listed. The first matching pattern in the list determines the match. Negation patterns (`!`) cause the rule to skip this tool if matched.

### 3.2 Actions

```typescript
type Action = "allow" | "deny"
```

- `allow` — the tool call is permitted (subject to constraints)
- `deny` — the tool call is rejected immediately, no further rules evaluated

### 3.3 Conditions

A rule may include a `conditions` object restricting which parameter values are allowed:

```json
{
  "tools": ["filesystem.write_file"],
  "action": "allow",
  "conditions": {
    "path": {
      "pattern": "^/home/user/projects/",
      "maxLength": 512
    },
    "content": {
      "maxLength": 1048576
    }
  }
}
```

Condition types:

| Type | Description |
|------|-------------|
| `pattern` | Regex the parameter value must match |
| `enum` | Allowed values (exact match) |
| `maxLength` | Maximum string length |
| `minLength` | Minimum string length |
| `max` | Maximum numeric value |
| `min` | Minimum numeric value |
| `notContains` | Strings the value must not contain |
| `allowedKeys` | For object parameters: permitted keys |

If a condition fails, the rule does not match and evaluation continues to the next rule.

### 3.4 Priority

Rules are evaluated in order. The first matching rule determines the outcome. To override a broader rule with a more specific one, place the specific rule first:

```json
{
  "rules": [
    {
      "tools": ["filesystem.write_file"],
      "action": "deny",
      "conditions": { "path": { "pattern": "^\\.ssh/" } }
    },
    {
      "tools": ["filesystem.*"],
      "action": "allow"
    }
  ]
}
```

In this example, `write_file` to `.ssh/` paths is denied while all other filesystem tools are allowed.

---

## 4. Constraint Types

Constraints attach runtime conditions to rules beyond parameter validation. They are specified in a `constraints` array on the rule:

```json
{
  "tools": ["github.push_files"],
  "action": "allow",
  "constraints": [
    { "type": "rateLimit", "max": 10, "windowSeconds": 3600 },
    { "type": "schedule", "daysOfWeek": [1,2,3,4,5], "hoursUTC": [8, 20] }
  ]
}
```

### 4.1 Schedule

Restricts tool calls to specific time windows.

```json
{
  "type": "schedule",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "hoursUTC": [8, 17]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `daysOfWeek` | `number[]` | ISO weekday numbers (1=Monday, 7=Sunday) |
| `hoursUTC` | `[number, number]` | UTC hour range [start, end] (exclusive end) |
| `timezone` | `string` | IANA timezone for evaluation (default: UTC) |

### 4.2 Rate Limit

Limits how many times a tool can be called within a time window.

```json
{
  "type": "rateLimit",
  "max": 100,
  "windowSeconds": 3600,
  "scope": "agent"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `max` | `number` | Maximum calls allowed |
| `windowSeconds` | `number` | Time window duration |
| `scope` | `"agent" \| "principal" \| "global"` | Counter scope |

### 4.3 Data Classification

Prevents tools from accessing or returning data above a specified sensitivity level.

```json
{
  "type": "dataClassification",
  "maxLevel": "confidential"
}
```

Levels (ascending sensitivity): `public` → `internal` → `confidential` → `restricted` → `secret`

### 4.4 Budget

Caps the total cost (in USD, tokens, or custom units) that a tool may consume per window.

```json
{
  "type": "budget",
  "currency": "usd",
  "max": 10.00,
  "windowSeconds": 86400
}
```

### 4.5 Sequence

Requires that specific tools be called (or not called) before this tool is permitted.

```json
{
  "type": "sequence",
  "requires": ["filesystem.read_file"],
  "forbids": ["github.push_files"]
}
```

| Field | Description |
|-------|-------------|
| `requires` | Tools that must have been called earlier in this session |
| `forbids` | Tools that must not have been called earlier in this session |

### 4.6 Session Limit

Caps the total number of times a tool may be called per session.

```json
{
  "type": "sessionLimit",
  "max": 5
}
```

### 4.7 Risk Score

Blocks the call if the computed risk score for the tool invocation exceeds a threshold.

```json
{
  "type": "riskScore",
  "maxScore": 0.7
}
```

Risk scores are computed by the evaluation engine based on parameter values, context, and historical patterns. The scoring algorithm is defined in the reference implementation.

### 4.8 IP Allowlist

Restricts tool calls to requests originating from specified IP ranges.

```json
{
  "type": "ipAllowlist",
  "cidrs": ["10.0.0.0/8", "192.168.1.0/24"]
}
```

### 4.9 Chain Depth

Limits how many levels deep in a delegation chain this rule applies.

```json
{
  "type": "chainDepth",
  "max": 2
}
```

A chain depth of 1 means only the direct delegate of the principal. A chain depth of 2 allows one level of sub-delegation.

### 4.10 Cooldown

Requires a minimum elapsed time between calls to a tool.

```json
{
  "type": "cooldown",
  "seconds": 300
}
```

### 4.11 Anomaly Detection

Blocks the call if behavioral anomaly detection flags it.

```json
{
  "type": "anomalyDetection",
  "sensitivity": "medium",
  "action": "deny"
}
```

| Sensitivity | Description |
|-------------|-------------|
| `low` | Only flag statistically extreme outliers |
| `medium` | Flag deviations from established baseline patterns |
| `high` | Block on any deviation from expected behavior |

### 4.12 Approval Gate

Pauses execution and requires a human (or automated system) to approve the call before it proceeds.

```json
{
  "type": "approvalGate",
  "approvers": ["principal", "admin@example.com"],
  "timeoutSeconds": 300,
  "timeoutAction": "deny"
}
```

| Field | Description |
|-------|-------------|
| `approvers` | Identities that may approve. `"principal"` refers to the issuing principal. |
| `timeoutSeconds` | How long to wait for approval before applying `timeoutAction` |
| `timeoutAction` | `"deny"` or `"allow"` — what to do on timeout |

---

## 5. Evaluation Algorithm

### 5.1 Deny-First Default

If no rule matches a tool call, the call is **denied**. An explicit `allow` rule is required for every tool an agent may call.

### 5.2 Evaluation Pipeline

```
Input: tool_name, parameters, context

1. For each rule in rules (in order):
   a. Test tool_name against rule.tools patterns
      - If no pattern matches: skip rule
      - If a negation pattern matches: skip rule
   b. Test parameters against rule.conditions
      - If any condition fails: skip rule
   c. Evaluate rule.constraints
      - If any constraint fails: skip rule
   d. Return rule.action ("allow" or "deny")

2. If no rule matched: return "deny"
```

### 5.3 Wildcard Resolution

When multiple patterns could match a tool:

1. Exact matches take precedence over glob matches
2. More specific globs (fewer wildcards) take precedence over less specific globs
3. Negation patterns (`!`) are evaluated before positive patterns at each specificity level

### 5.4 Short-Circuit on Deny

A `deny` rule with no conditions short-circuits all subsequent evaluation for the matched tool. This ensures explicit denials cannot be overridden by subsequent allow rules.

```json
[
  { "tools": ["shell.*"], "action": "deny" },
  { "tools": ["**"], "action": "allow" }
]
```

In this example, `shell.*` tools are always denied even though `**` would otherwise allow them.

---

## 6. Delegation Protocol

### 6.1 Delegation Object

A delegation is a signed permission policy issued by a principal to an agent, with scope equal to or narrower than the principal's own permissions.

```json
{
  "version": "1.0",
  "delegationId": "del_xyz789",
  "issuedBy": "principal_abc",
  "issuedTo": "agent_def456",
  "issuedAt": "2026-03-29T00:00:00Z",
  "expiresAt": "2026-03-30T00:00:00Z",
  "parentDelegationId": null,
  "rules": [ ...PermissionRule[] ],
  "signature": "hmac-sha256:..."
}
```

### 6.2 Scope Narrowing Rules

A delegation may only grant permissions that the issuing principal holds. An attempt to delegate a tool or permission that the principal does not have is **invalid**.

Formally: `delegate.rules ⊆ principal.rules`

Sub-delegations must satisfy: `sub_delegate.rules ⊆ delegate.rules`

### 6.3 Cascading Revocation

Revoking a delegation automatically revokes all sub-delegations issued from it. The revocation propagates to the full chain.

Revocation is recorded as an audit entry (see Section 7) and enforcement is immediate.

---

## 7. Audit Log Format

### 7.1 Entry Schema

Every evaluation decision produces an immutable audit entry:

```json
{
  "entryId": "entry_abc123",
  "timestamp": "2026-03-29T12:34:56.789Z",
  "agentId": "agent_def456",
  "delegationId": "del_xyz789",
  "tool": "github.push_files",
  "parameters": {
    "owner": "myorg",
    "repo": "myrepo",
    "branch": "main"
  },
  "decision": "allow",
  "matchedRule": 2,
  "constraintsEvaluated": ["rateLimit", "schedule"],
  "durationMs": 3,
  "prevEntryHash": "sha256:e3b0c44298fc1c149afb...",
  "entryHash": "sha256:a665a45920422f9d417e..."
}
```

| Field | Description |
|-------|-------------|
| `entryId` | Unique identifier for this entry |
| `timestamp` | ISO 8601 with milliseconds |
| `agentId` | The agent that made the call |
| `delegationId` | The delegation under which the call was made |
| `tool` | Fully qualified tool name |
| `parameters` | Sanitized parameters (secrets redacted) |
| `decision` | `"allow"` or `"deny"` |
| `matchedRule` | Index of the matching rule, or `null` if default deny |
| `constraintsEvaluated` | List of constraint types that were checked |
| `durationMs` | Evaluation time |
| `prevEntryHash` | SHA-256 hash of the previous entry |
| `entryHash` | SHA-256 hash of this entry's canonical JSON |

### 7.2 Hash Chain Integrity

Each entry's `entryHash` is computed over the canonical JSON of the entry with `entryHash` set to `null`:

```
entryHash = SHA-256(canonicalize(entry with entryHash=null))
```

The first entry uses `prevEntryHash: "genesis"`.

Any tampering with a historical entry invalidates all subsequent hashes, making the log append-only by construction.

### 7.3 Verification

```typescript
function verifyChain(entries: AuditEntry[]): boolean {
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]
    const curr = entries[i]
    if (curr.prevEntryHash !== prev.entryHash) return false
    const computed = sha256(canonicalize({ ...curr, entryHash: null }))
    if (computed !== curr.entryHash) return false
  }
  return true
}
```

---

## 8. Agent Identity Format

### 8.1 Agent ID Structure

Agent IDs are prefixed strings with a random component:

```
agent_[a-zA-Z0-9]{16}
```

Example: `agent_dK9mPqR2xL4wNv8j`

### 8.2 Token Format

Agent identity tokens are HMAC-SHA256 signed payloads:

```json
{
  "agentId": "agent_dK9mPqR2xL4wNv8j",
  "principalId": "principal_abc123",
  "issuedAt": 1743206400,
  "expiresAt": 1743292800,
  "scope": ["github.*", "filesystem.read_*"],
  "delegationId": "del_xyz789"
}
```

Encoded as: `base64url(header).base64url(payload).hmac-sha256-signature`

The signing key is the project's secret key (never transmitted). Verification requires only the key and the token.

### 8.3 Token Lifecycle

| State | Description |
|-------|-------------|
| `active` | Valid, within expiry, not revoked |
| `expired` | Past `expiresAt` |
| `revoked` | Explicitly invalidated before expiry |
| `suspended` | Temporarily blocked (anomaly detection) |

Tokens move from `active` to `expired` automatically. Revocation is explicit and irreversible. Suspension is reversible.

---

## 9. Extension Mechanism

### 9.1 Custom Constraint Types

Implementors may define custom constraint types using the `x-` prefix:

```json
{
  "type": "x-geofence",
  "allowedCountries": ["US", "CA", "GB"],
  "denyAction": "deny"
}
```

Custom constraints must:
- Use the `x-` prefix
- Be documented in the policy's `extensions` field
- Fail closed (deny) if the evaluator does not recognize the type

### 9.2 Extensions Declaration

```json
{
  "version": "1.0",
  "extensions": {
    "x-geofence": {
      "spec": "https://example.com/specs/geofence-constraint-v1",
      "failBehavior": "deny"
    }
  },
  "rules": [ ... ]
}
```

---

## 10. Security Considerations

### 10.1 Policy Storage

Permission policies contain authorization decisions and must be stored with appropriate access controls. Policies should not be stored in plaintext in version control unless the repository is private and access-controlled.

### 10.2 Secret Redaction in Audit Logs

Parameters that match common secret patterns (tokens, passwords, keys) must be redacted before writing to the audit log. Redaction uses `[REDACTED]` as the replacement value. Pattern matching for redaction follows OWASP secret detection guidelines.

### 10.3 Clock Skew

Schedule and expiry constraints depend on accurate system time. Implementations should reject tokens or evaluate schedule constraints with a maximum clock skew tolerance of 60 seconds.

### 10.4 Delegation Forgery

Delegation signatures must be verified before processing. An unverified delegation must be treated as if it does not exist (default deny). The signing algorithm (HMAC-SHA256) requires both parties to share the secret key — delegations cannot be forged by agents.

### 10.5 Prompt Injection

This specification does not prevent prompt injection at the LLM layer. However, by enforcing deny-first evaluation at the tool call layer, it limits the impact of a successful injection: even if an agent is manipulated into calling a tool, the policy engine will deny the call if no matching allow rule exists.

---

## 11. Reference Implementation

AgentsID provides a production reference implementation of this specification:

| Component | Package | Description |
|-----------|---------|-------------|
| Policy evaluator | `@agentsid/sdk` | Core evaluation engine (TypeScript) |
| MCP middleware | `@agentsid/guard` | Drop-in MCP server with 50 tools |
| Audit log | `@agentsid/sdk` | Hash-chained ledger with verification |
| Agent identity | `@agentsid/sdk` | Token issuance and verification |
| Scanner | `@agentsid/scanner` | Static analysis of MCP tool definitions |

**Quick start:**

```bash
npm install @agentsid/sdk
```

```typescript
import { AgentsID } from "@agentsid/sdk"

const client = new AgentsID({ apiKey: process.env.AGENTSID_API_KEY })

const result = await client.validate({
  agentId: "agent_abc123",
  tool: "github.push_files",
  parameters: { owner: "myorg", repo: "myrepo", branch: "main" }
})

if (!result.allowed) {
  throw new Error(`Tool call denied: ${result.reason}`)
}
```

Full documentation: [agentsid.dev/docs](https://agentsid.dev/docs)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-29 | Initial draft |

---

*This specification is published under the Creative Commons Attribution 4.0 International License. Implementations are encouraged without restriction.*
