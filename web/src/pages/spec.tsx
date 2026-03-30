import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TocSection {
  readonly id: string;
  readonly label: string;
  readonly subsections?: ReadonlyArray<{ id: string; label: string }>;
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------

const TOC: ReadonlyArray<TocSection> = [
  { id: "abstract", label: "Abstract" },
  { id: "intro", label: "1. Introduction",
    subsections: [
      { id: "principles", label: "1.1 Design Principles" },
      { id: "mcp-relation", label: "1.2 Relationship to MCP" },
    ]
  },
  { id: "terminology", label: "2. Terminology" },
  { id: "rule-format", label: "3. Permission Rule Format",
    subsections: [
      { id: "tool-patterns", label: "3.1 Tool Patterns" },
      { id: "actions", label: "3.2 Actions" },
      { id: "conditions", label: "3.3 Conditions" },
      { id: "priority", label: "3.4 Priority" },
    ]
  },
  { id: "constraints", label: "4. Constraint Types",
    subsections: [
      { id: "schedule", label: "4.1 Schedule" },
      { id: "rate-limit", label: "4.2 Rate Limit" },
      { id: "data-classification", label: "4.3 Data Classification" },
      { id: "budget", label: "4.4 Budget" },
      { id: "sequence", label: "4.5 Sequence" },
      { id: "session-limit", label: "4.6 Session Limit" },
      { id: "risk-score", label: "4.7 Risk Score" },
      { id: "ip-allowlist", label: "4.8 IP Allowlist" },
      { id: "chain-depth", label: "4.9 Chain Depth" },
      { id: "cooldown", label: "4.10 Cooldown" },
      { id: "anomaly", label: "4.11 Anomaly Detection" },
      { id: "approval-gate", label: "4.12 Approval Gate" },
    ]
  },
  { id: "evaluation", label: "5. Evaluation Algorithm",
    subsections: [
      { id: "deny-first", label: "5.1 Deny-First Default" },
      { id: "pipeline", label: "5.2 Evaluation Pipeline" },
      { id: "wildcard", label: "5.3 Wildcard Resolution" },
      { id: "short-circuit", label: "5.4 Short-Circuit on Deny" },
    ]
  },
  { id: "delegation", label: "6. Delegation Protocol",
    subsections: [
      { id: "delegation-object", label: "6.1 Delegation Object" },
      { id: "scope-narrowing", label: "6.2 Scope Narrowing" },
      { id: "revocation", label: "6.3 Cascading Revocation" },
    ]
  },
  { id: "audit", label: "7. Audit Log Format",
    subsections: [
      { id: "entry-schema", label: "7.1 Entry Schema" },
      { id: "hash-chain", label: "7.2 Hash Chain Integrity" },
      { id: "verification", label: "7.3 Verification" },
    ]
  },
  { id: "identity", label: "8. Agent Identity Format",
    subsections: [
      { id: "agent-id", label: "8.1 Agent ID Structure" },
      { id: "token-format", label: "8.2 Token Format" },
      { id: "token-lifecycle", label: "8.3 Token Lifecycle" },
    ]
  },
  { id: "extensions", label: "9. Extension Mechanism" },
  { id: "security", label: "10. Security Considerations" },
  { id: "reference-impl", label: "11. Reference Implementation" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeading({ id, number, children }: { id: string; number: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-xl font-bold tracking-tight text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2.5 scroll-mt-24"
    >
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/10 text-xs font-bold text-amber-500 shrink-0">
        {number}
      </span>
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-base font-semibold text-foreground mt-8 mb-3 scroll-mt-24">
      {children}
    </h3>
  );
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group rounded-lg border border-border bg-bg-code overflow-hidden my-4">
      <button
        onClick={copy}
        className="absolute top-2.5 right-3 text-xs text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="p-4 overflow-x-auto text-sm text-text-dim font-mono leading-relaxed">
        <code>{children.trim()}</code>
      </pre>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-card">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-bg-card/50 transition-colors">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-muted-foreground font-mono text-xs align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3 my-4 text-sm text-muted-foreground">
      <strong className="text-amber-500">Note: </strong>{children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Spec() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-12 flex gap-12">

      {/* Sidebar TOC */}
      <aside className="hidden xl:block w-64 shrink-0">
        <div className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Contents
          </p>
          <nav className="space-y-0.5">
            {TOC.map((section) => (
              <div key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
                >
                  {section.label}
                </a>
                {section.subsections?.map((sub) => (
                  <a
                    key={sub.id}
                    href={`#${sub.id}`}
                    className="block text-xs text-muted-foreground/70 hover:text-muted-foreground pl-3 py-0.5 transition-colors"
                  >
                    {sub.label}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <article className="min-w-0 flex-1 max-w-3xl">

        {/* Header */}
        <header className="mb-10 pb-8 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Draft
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
              v1.0
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            AgentsID Permission Specification
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-4">
            <span>Published: March 2026</span>
            <span>Authors: AgentsID Research</span>
            <a
              href="https://github.com/stevenkozeniesky02/permission-spec"
              className="text-amber-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/agentsid/permission-spec
            </a>
          </div>
        </header>

        {/* Abstract */}
        <section className="mb-14 scroll-mt-20" id="abstract">
          <div className="rounded-xl border border-border bg-bg-card p-5 text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Abstract. </strong>
            This specification defines a standard format for expressing, evaluating, and auditing
            permission rules for AI agent tool calls. It is designed for use with the Model Context
            Protocol (MCP) and any agent framework where a language model invokes external tools.
            The specification covers permission rule format, constraint types, evaluation algorithm,
            delegation chains, audit log format, agent identity tokens, and extension mechanisms.
            The goal is to provide a common language for agent permissions that can be adopted
            independently of any specific runtime, platform, or vendor.
          </div>
        </section>

        {/* 1. Introduction */}
        <section className="mb-14" id="intro">
          <SectionHeading id="intro" number="1">Introduction</SectionHeading>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            AI agents operating through the Model Context Protocol have unrestricted access to every
            tool a server exposes by default. There is no standard mechanism for expressing which
            tools an agent may call, under what conditions, with what parameter constraints, or
            subject to what approval requirements.
          </p>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            This creates three classes of risk:
          </p>
          <ul className="space-y-2 mb-6 text-muted-foreground text-sm">
            <li className="flex gap-2"><span className="text-red-400 mt-0.5">•</span><span><strong className="text-foreground">Over-privilege</strong> — agents can call destructive or sensitive tools they should not have access to</span></li>
            <li className="flex gap-2"><span className="text-red-400 mt-0.5">•</span><span><strong className="text-foreground">Scope ambiguity</strong> — agents infer the broadest valid scope for tool parameters in the absence of constraints</span></li>
            <li className="flex gap-2"><span className="text-red-400 mt-0.5">•</span><span><strong className="text-foreground">Auditability gaps</strong> — there is no standard for logging what an agent did, when, and under whose authority</span></li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            This specification defines a portable, vendor-neutral format for addressing all three.
            A permission policy is a JSON document. An evaluation engine is a pure function. An
            audit log is a hash-chained append-only ledger. Any runtime can implement this spec
            without depending on AgentsID infrastructure.
          </p>

          <SubHeading id="principles">1.1 Design Principles</SubHeading>
          <Table
            headers={["Principle", "Description"]}
            rows={[
              ["Deny-first", "Absent a matching allow rule, all tool calls are denied"],
              ["Least privilege", "Rules grant the minimum necessary access"],
              ["Composable", "Rules combine without conflict via explicit priority"],
              ["Portable", "The spec is a JSON schema, not a platform dependency"],
              ["Auditable", "Every evaluation decision is logged with cryptographic integrity"],
            ]}
          />

          <SubHeading id="mcp-relation">1.2 Relationship to MCP</SubHeading>
          <p className="text-muted-foreground leading-relaxed">
            This specification is a complement to MCP, not a replacement. MCP defines how tools are
            discovered and called. This specification defines who may call them, under what
            conditions, and with what audit trail. It operates as a policy enforcement layer between
            the agent and the MCP server.
          </p>
        </section>

        {/* 2. Terminology */}
        <section className="mb-14" id="terminology">
          <SectionHeading id="terminology" number="2">Terminology</SectionHeading>
          <Table
            headers={["Term", "Definition"]}
            rows={[
              ["Agent", "An LLM-driven process that invokes tools to complete tasks"],
              ["Principal", "A human user or system that authorizes an agent to act on their behalf"],
              ["Tool", "A callable function exposed by an MCP server"],
              ["Permission Rule", "A JSON object expressing whether a tool call is allowed or denied"],
              ["Policy", "An ordered collection of permission rules"],
              ["Constraint", "A condition attached to a rule that must be satisfied for the rule to match"],
              ["Delegation", "The act of a principal granting a subset of their permissions to an agent or sub-agent"],
              ["Chain", "An ordered sequence of delegations from a root principal to a leaf agent"],
              ["Audit Entry", "An immutable record of a tool call evaluation decision"],
            ]}
          />
        </section>

        {/* 3. Permission Rule Format */}
        <section className="mb-14" id="rule-format">
          <SectionHeading id="rule-format" number="3">Permission Rule Format</SectionHeading>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            A permission policy is a JSON object with the following top-level structure:
          </p>
          <CodeBlock>{`{
  "version": "1.0",
  "agentId": "agent_abc123",
  "issuedAt": "2026-03-29T00:00:00Z",
  "expiresAt": "2026-04-29T00:00:00Z",
  "rules": [ ...PermissionRule[] ]
}`}</CodeBlock>

          <SubHeading id="tool-patterns">3.1 Tool Patterns</SubHeading>
          <p className="text-muted-foreground mb-3 leading-relaxed">
            Each rule targets one or more tools using glob patterns:
          </p>
          <CodeBlock>{`{
  "tools": ["github.*", "filesystem.read_*"],
  "action": "allow"
}`}</CodeBlock>
          <Table
            headers={["Pattern", "Matches"]}
            rows={[
              ["*", "Any single tool name segment"],
              ["**", "Any tool name, including namespaced tools"],
              ["github.*", "All tools in the github namespace"],
              ["filesystem.read_file", "Exactly one tool"],
              ["!filesystem.write_*", "Negation — exclude write tools"],
            ]}
          />

          <SubHeading id="actions">3.2 Actions</SubHeading>
          <CodeBlock>{`type Action = "allow" | "deny"`}</CodeBlock>
          <Table
            headers={["Action", "Behavior"]}
            rows={[
              ["allow", "The tool call is permitted (subject to constraints)"],
              ["deny", "The tool call is rejected immediately, no further rules evaluated"],
            ]}
          />

          <SubHeading id="conditions">3.3 Conditions</SubHeading>
          <p className="text-muted-foreground mb-3 leading-relaxed">
            A rule may include a <code className="text-amber-500 text-xs">conditions</code> object
            restricting which parameter values are allowed:
          </p>
          <CodeBlock>{`{
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
}`}</CodeBlock>
          <Table
            headers={["Type", "Description"]}
            rows={[
              ["pattern", "Regex the parameter value must match"],
              ["enum", "Allowed values (exact match)"],
              ["maxLength", "Maximum string length"],
              ["minLength", "Minimum string length"],
              ["max", "Maximum numeric value"],
              ["min", "Minimum numeric value"],
              ["notContains", "Strings the value must not contain"],
              ["allowedKeys", "For object parameters: permitted keys"],
            ]}
          />

          <SubHeading id="priority">3.4 Priority</SubHeading>
          <p className="text-muted-foreground mb-3 leading-relaxed">
            Rules are evaluated in order. The first matching rule determines the outcome.
            Place specific rules before broader ones:
          </p>
          <CodeBlock>{`{
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
}`}</CodeBlock>
        </section>

        {/* 4. Constraint Types */}
        <section className="mb-14" id="constraints">
          <SectionHeading id="constraints" number="4">Constraint Types</SectionHeading>
          <p className="text-muted-foreground mb-4 leading-relaxed">
            Constraints attach runtime conditions to rules beyond parameter validation:
          </p>
          <CodeBlock>{`{
  "tools": ["github.push_files"],
  "action": "allow",
  "constraints": [
    { "type": "rateLimit", "max": 10, "windowSeconds": 3600 },
    { "type": "schedule", "daysOfWeek": [1,2,3,4,5], "hoursUTC": [8, 20] }
  ]
}`}</CodeBlock>

          <SubHeading id="schedule">4.1 Schedule</SubHeading>
          <CodeBlock>{`{ "type": "schedule", "daysOfWeek": [1,2,3,4,5], "hoursUTC": [8,17], "timezone": "America/New_York" }`}</CodeBlock>

          <SubHeading id="rate-limit">4.2 Rate Limit</SubHeading>
          <CodeBlock>{`{ "type": "rateLimit", "max": 100, "windowSeconds": 3600, "scope": "agent" }`}</CodeBlock>
          <Table
            headers={["scope", "Description"]}
            rows={[
              ["agent", "Counter is per agent instance"],
              ["principal", "Counter is shared across all agents of a principal"],
              ["global", "Counter is shared across all agents globally"],
            ]}
          />

          <SubHeading id="data-classification">4.3 Data Classification</SubHeading>
          <CodeBlock>{`{ "type": "dataClassification", "maxLevel": "confidential" }`}</CodeBlock>
          <p className="text-muted-foreground text-sm mt-2">Levels (ascending sensitivity): <code className="text-amber-500">public</code> → <code className="text-amber-500">internal</code> → <code className="text-amber-500">confidential</code> → <code className="text-amber-500">restricted</code> → <code className="text-amber-500">secret</code></p>

          <SubHeading id="budget">4.4 Budget</SubHeading>
          <CodeBlock>{`{ "type": "budget", "currency": "usd", "max": 10.00, "windowSeconds": 86400 }`}</CodeBlock>

          <SubHeading id="sequence">4.5 Sequence</SubHeading>
          <CodeBlock>{`{ "type": "sequence", "requires": ["filesystem.read_file"], "forbids": ["github.push_files"] }`}</CodeBlock>

          <SubHeading id="session-limit">4.6 Session Limit</SubHeading>
          <CodeBlock>{`{ "type": "sessionLimit", "max": 5 }`}</CodeBlock>

          <SubHeading id="risk-score">4.7 Risk Score</SubHeading>
          <CodeBlock>{`{ "type": "riskScore", "maxScore": 0.7 }`}</CodeBlock>

          <SubHeading id="ip-allowlist">4.8 IP Allowlist</SubHeading>
          <CodeBlock>{`{ "type": "ipAllowlist", "cidrs": ["10.0.0.0/8", "192.168.1.0/24"] }`}</CodeBlock>

          <SubHeading id="chain-depth">4.9 Chain Depth</SubHeading>
          <CodeBlock>{`{ "type": "chainDepth", "max": 2 }`}</CodeBlock>

          <SubHeading id="cooldown">4.10 Cooldown</SubHeading>
          <CodeBlock>{`{ "type": "cooldown", "seconds": 300 }`}</CodeBlock>

          <SubHeading id="anomaly">4.11 Anomaly Detection</SubHeading>
          <CodeBlock>{`{ "type": "anomalyDetection", "sensitivity": "medium", "action": "deny" }`}</CodeBlock>
          <Table
            headers={["Sensitivity", "Description"]}
            rows={[
              ["low", "Only flag statistically extreme outliers"],
              ["medium", "Flag deviations from established baseline patterns"],
              ["high", "Block on any deviation from expected behavior"],
            ]}
          />

          <SubHeading id="approval-gate">4.12 Approval Gate</SubHeading>
          <CodeBlock>{`{
  "type": "approvalGate",
  "approvers": ["principal", "admin@example.com"],
  "timeoutSeconds": 300,
  "timeoutAction": "deny"
}`}</CodeBlock>
        </section>

        {/* 5. Evaluation Algorithm */}
        <section className="mb-14" id="evaluation">
          <SectionHeading id="evaluation" number="5">Evaluation Algorithm</SectionHeading>

          <SubHeading id="deny-first">5.1 Deny-First Default</SubHeading>
          <Note>If no rule matches a tool call, the call is <strong>denied</strong>. An explicit <code>allow</code> rule is required for every tool an agent may call.</Note>

          <SubHeading id="pipeline">5.2 Evaluation Pipeline</SubHeading>
          <CodeBlock>{`Input: tool_name, parameters, context

1. For each rule in rules (in order):
   a. Test tool_name against rule.tools patterns
      - If no pattern matches: skip rule
      - If a negation pattern matches: skip rule
   b. Test parameters against rule.conditions
      - If any condition fails: skip rule
   c. Evaluate rule.constraints
      - If any constraint fails: skip rule
   d. Return rule.action ("allow" or "deny")

2. If no rule matched: return "deny"`}</CodeBlock>

          <SubHeading id="wildcard">5.3 Wildcard Resolution</SubHeading>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Exact matches take precedence over glob matches. More specific globs (fewer wildcards)
            take precedence over less specific globs. Negation patterns (<code className="text-amber-500">!</code>) are evaluated before positive patterns at each specificity level.
          </p>

          <SubHeading id="short-circuit">5.4 Short-Circuit on Deny</SubHeading>
          <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
            A <code className="text-amber-500">deny</code> rule with no conditions short-circuits all subsequent evaluation for the matched tool:
          </p>
          <CodeBlock>{`[
  { "tools": ["shell.*"], "action": "deny" },
  { "tools": ["**"], "action": "allow" }
]
// shell.* tools are always denied even though ** would otherwise allow them`}</CodeBlock>
        </section>

        {/* 6. Delegation Protocol */}
        <section className="mb-14" id="delegation">
          <SectionHeading id="delegation" number="6">Delegation Protocol</SectionHeading>

          <SubHeading id="delegation-object">6.1 Delegation Object</SubHeading>
          <CodeBlock>{`{
  "version": "1.0",
  "delegationId": "del_xyz789",
  "issuedBy": "principal_abc",
  "issuedTo": "agent_def456",
  "issuedAt": "2026-03-29T00:00:00Z",
  "expiresAt": "2026-03-30T00:00:00Z",
  "parentDelegationId": null,
  "rules": [ ...PermissionRule[] ],
  "signature": "hmac-sha256:..."
}`}</CodeBlock>

          <SubHeading id="scope-narrowing">6.2 Scope Narrowing Rules</SubHeading>
          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            A delegation may only grant permissions that the issuing principal holds.
          </p>
          <p className="text-muted-foreground text-sm font-mono bg-bg-code rounded px-3 py-2 border border-border">
            delegate.rules ⊆ principal.rules<br />
            sub_delegate.rules ⊆ delegate.rules
          </p>

          <SubHeading id="revocation">6.3 Cascading Revocation</SubHeading>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Revoking a delegation automatically revokes all sub-delegations issued from it.
            Revocation is recorded as an audit entry and enforcement is immediate.
          </p>
        </section>

        {/* 7. Audit Log Format */}
        <section className="mb-14" id="audit">
          <SectionHeading id="audit" number="7">Audit Log Format</SectionHeading>

          <SubHeading id="entry-schema">7.1 Entry Schema</SubHeading>
          <CodeBlock>{`{
  "entryId": "entry_abc123",
  "timestamp": "2026-03-29T12:34:56.789Z",
  "agentId": "agent_def456",
  "delegationId": "del_xyz789",
  "tool": "github.push_files",
  "parameters": { "owner": "myorg", "repo": "myrepo", "branch": "main" },
  "decision": "allow",
  "matchedRule": 2,
  "constraintsEvaluated": ["rateLimit", "schedule"],
  "durationMs": 3,
  "prevEntryHash": "sha256:e3b0c44298fc1c149afb...",
  "entryHash": "sha256:a665a45920422f9d417e..."
}`}</CodeBlock>

          <SubHeading id="hash-chain">7.2 Hash Chain Integrity</SubHeading>
          <CodeBlock>{`entryHash = SHA-256(canonicalize(entry with entryHash=null))
// First entry uses prevEntryHash: "genesis"`}</CodeBlock>

          <SubHeading id="verification">7.3 Verification</SubHeading>
          <CodeBlock>{`function verifyChain(entries: AuditEntry[]): boolean {
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1]
    const curr = entries[i]
    if (curr.prevEntryHash !== prev.entryHash) return false
    const computed = sha256(canonicalize({ ...curr, entryHash: null }))
    if (computed !== curr.entryHash) return false
  }
  return true
}`}</CodeBlock>
        </section>

        {/* 8. Agent Identity Format */}
        <section className="mb-14" id="identity">
          <SectionHeading id="identity" number="8">Agent Identity Format</SectionHeading>

          <SubHeading id="agent-id">8.1 Agent ID Structure</SubHeading>
          <CodeBlock>{`agent_[a-zA-Z0-9]{16}
// Example: agent_dK9mPqR2xL4wNv8j`}</CodeBlock>

          <SubHeading id="token-format">8.2 Token Format</SubHeading>
          <CodeBlock>{`// Payload
{
  "agentId": "agent_dK9mPqR2xL4wNv8j",
  "principalId": "principal_abc123",
  "issuedAt": 1743206400,
  "expiresAt": 1743292800,
  "scope": ["github.*", "filesystem.read_*"],
  "delegationId": "del_xyz789"
}

// Encoded as:
base64url(header).base64url(payload).hmac-sha256-signature`}</CodeBlock>

          <SubHeading id="token-lifecycle">8.3 Token Lifecycle</SubHeading>
          <Table
            headers={["State", "Description"]}
            rows={[
              ["active", "Valid, within expiry, not revoked"],
              ["expired", "Past expiresAt"],
              ["revoked", "Explicitly invalidated before expiry"],
              ["suspended", "Temporarily blocked (anomaly detection)"],
            ]}
          />
        </section>

        {/* 9. Extensions */}
        <section className="mb-14" id="extensions">
          <SectionHeading id="extensions" number="9">Extension Mechanism</SectionHeading>
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
            Implementors may define custom constraint types using the <code className="text-amber-500">x-</code> prefix.
            Custom constraints must fail closed (deny) if the evaluator does not recognize the type.
          </p>
          <CodeBlock>{`{
  "version": "1.0",
  "extensions": {
    "x-geofence": {
      "spec": "https://example.com/specs/geofence-constraint-v1",
      "failBehavior": "deny"
    }
  },
  "rules": [
    {
      "tools": ["**"],
      "action": "allow",
      "constraints": [
        { "type": "x-geofence", "allowedCountries": ["US", "CA", "GB"] }
      ]
    }
  ]
}`}</CodeBlock>
        </section>

        {/* 10. Security Considerations */}
        <section className="mb-14" id="security">
          <SectionHeading id="security" number="10">Security Considerations</SectionHeading>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div>
              <strong className="text-foreground">Policy Storage.</strong> Permission policies contain authorization decisions and must be stored with appropriate access controls. Policies should not be stored in plaintext in public version control.
            </div>
            <div>
              <strong className="text-foreground">Secret Redaction.</strong> Parameters that match common secret patterns (tokens, passwords, keys) must be redacted before writing to the audit log. Redaction uses <code className="text-amber-500">[REDACTED]</code> as the replacement value.
            </div>
            <div>
              <strong className="text-foreground">Clock Skew.</strong> Implementations should reject tokens or evaluate schedule constraints with a maximum clock skew tolerance of 60 seconds.
            </div>
            <div>
              <strong className="text-foreground">Delegation Forgery.</strong> Delegation signatures must be verified before processing. An unverified delegation must be treated as if it does not exist (default deny).
            </div>
            <div>
              <strong className="text-foreground">Prompt Injection.</strong> This specification does not prevent prompt injection at the LLM layer. However, deny-first evaluation at the tool call layer limits the impact of a successful injection: even if an agent is manipulated into calling a tool, the policy engine will deny the call if no matching allow rule exists.
            </div>
          </div>
        </section>

        {/* 11. Reference Implementation */}
        <section className="mb-14" id="reference-impl">
          <SectionHeading id="reference-impl" number="11">Reference Implementation</SectionHeading>
          <Table
            headers={["Component", "Package", "Description"]}
            rows={[
              ["Policy evaluator", "@agentsid/sdk", "Core evaluation engine (TypeScript)"],
              ["MCP middleware", "@agentsid/guard", "Drop-in MCP server with 50 tools"],
              ["Audit log", "@agentsid/sdk", "Hash-chained ledger with verification"],
              ["Agent identity", "@agentsid/sdk", "Token issuance and verification"],
              ["Scanner", "@agentsid/scanner", "Static analysis of MCP tool definitions"],
            ]}
          />
          <CodeBlock>{`npm install @agentsid/sdk`}</CodeBlock>
          <CodeBlock>{`import { AgentsID } from "@agentsid/sdk"

const client = new AgentsID({ apiKey: process.env.AGENTSID_API_KEY })

const result = await client.validate({
  agentId: "agent_abc123",
  tool: "github.push_files",
  parameters: { owner: "myorg", repo: "myrepo", branch: "main" }
})

if (!result.allowed) {
  throw new Error(\`Tool call denied: \${result.reason}\`)
}`}</CodeBlock>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-4 justify-between">
          <span>AgentsID Permission Specification v1.0 — March 2026</span>
          <span>Published under Creative Commons Attribution 4.0</span>
        </footer>

      </article>
    </div>
  );
}
