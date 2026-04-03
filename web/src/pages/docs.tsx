import { useState, useEffect, useCallback, useRef } from "react";
import { CodeTabs } from "../components/shared/code-tabs";
import type { CodeTab } from "../components/shared/code-tabs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SidebarSection {
  readonly title: string;
  readonly items: ReadonlyArray<SidebarItem>;
}

interface SidebarItem {
  readonly label: string;
  readonly href: string;
  readonly method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

interface EndpointDef {
  readonly id: string;
  readonly method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  readonly path: string;
  readonly description: string;
  readonly body: React.ReactNode;
  readonly tryIt?: React.ReactNode;
}

interface TableRow {
  readonly cells: readonly React.ReactNode[];
}

// ---------------------------------------------------------------------------
// Sidebar Data
// ---------------------------------------------------------------------------

const SIDEBAR_SECTIONS: ReadonlyArray<SidebarSection> = [
  {
    title: "Getting Started",
    items: [
      { label: "Overview", href: "#getting-started" },
      { label: "Installation", href: "#installation" },
      { label: "Quick Start", href: "#quickstart" },
    ],
  },
  {
    title: "MCP Registry",
    items: [
      { label: "Trust Score", href: "#trust-score" },
      { label: "How the Scan Works", href: "#how-it-works" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { label: "Agent Identity", href: "#agent-identity" },
      { label: "Permissions", href: "#permissions" },
      { label: "Advanced Permissions", href: "#advanced-permissions" },
      { label: "Permission Specification", href: "#permission-specification" },
      { label: "Delegation Chains", href: "#delegation" },
      { label: "Audit Trail", href: "#audit-trail" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { label: "Create Project", href: "#api-projects", method: "POST" },
      { label: "Register Agent", href: "#api-register-agent", method: "POST" },
      { label: "List Agents", href: "#api-list-agents", method: "GET" },
      { label: "Get Agent", href: "#api-get-agent", method: "GET" },
      { label: "Update Agent", href: "#api-update-agent", method: "PATCH" },
      { label: "Refresh Token", href: "#api-refresh-token", method: "POST" },
      { label: "Delegate", href: "#api-delegate", method: "POST" },
      { label: "Revoke Agent", href: "#api-revoke-agent", method: "DELETE" },
      { label: "Set Permissions", href: "#api-set-permissions", method: "PUT" },
      { label: "Get Permissions", href: "#api-get-permissions", method: "GET" },
      { label: "Check Permission", href: "#api-check-permission", method: "POST" },
      { label: "Validate Token", href: "#api-validate", method: "POST" },
      { label: "Introspect", href: "#api-introspect", method: "POST" },
      { label: "Audit Log", href: "#api-audit-log", method: "GET" },
      { label: "Audit Stats", href: "#api-audit-stats", method: "GET" },
      { label: "Verify Chain", href: "#api-audit-verify", method: "GET" },
      { label: "Usage", href: "#api-usage", method: "GET" },
      { label: "List Approvals", href: "#api-list-approvals", method: "GET" },
      { label: "Approve", href: "#api-approve", method: "POST" },
      { label: "Reject", href: "#api-reject", method: "POST" },
      { label: "Approval Count", href: "#api-approval-count", method: "GET" },
      { label: "Create Webhook", href: "#api-create-webhook", method: "POST" },
      { label: "List Webhooks", href: "#api-list-webhooks", method: "GET" },
      { label: "Delete Webhook", href: "#api-delete-webhook", method: "DELETE" },
      { label: "Test Webhook", href: "#api-test-webhook", method: "POST" },
    ],
  },
  {
    title: "SDK Reference",
    items: [
      { label: "Initialization", href: "#sdk-init" },
      { label: "Agent Methods", href: "#sdk-agents" },
      { label: "Permission Methods", href: "#sdk-permissions" },
      { label: "Validation Methods", href: "#sdk-validation" },
      { label: "Audit Methods", href: "#sdk-audit" },
    ],
  },
  {
    title: "CLI Reference",
    items: [
      { label: "init", href: "#cli-init" },
      { label: "register-agent", href: "#cli-register" },
      { label: "list-agents", href: "#cli-list" },
      { label: "revoke", href: "#cli-revoke" },
      { label: "audit", href: "#cli-audit" },
    ],
  },
  {
    title: "Security",
    items: [
      { label: "Token Format", href: "#security-tokens" },
      { label: "Validation Pipeline", href: "#security-validation" },
      { label: "Permission Engine", href: "#security-permissions" },
      { label: "Hash Chain Integrity", href: "#security-hash-chain" },
      { label: "Key Rotation", href: "#security-key-rotation" },
    ],
  },
  {
    title: "Pricing",
    items: [
      { label: "Plans", href: "#pricing" },
      { label: "FAQ", href: "#pricing-faq" },
    ],
  },
];

const ALL_SECTION_IDS = SIDEBAR_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.href.replace("#", ""))
);

// ---------------------------------------------------------------------------
// Method badge colors
// ---------------------------------------------------------------------------

const METHOD_BADGE_COLORS: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-500",
  POST: "bg-green-500/10 text-green-600 dark:text-green-400",
  PUT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  PATCH: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const METHOD_BADGE_SM: Record<string, string> = {
  GET: "bg-blue-500/10 text-blue-500",
  POST: "bg-green-500/10 text-green-600",
  PUT: "bg-amber-500/10 text-amber-600",
  PATCH: "bg-amber-500/10 text-amber-600",
  DELETE: "bg-red-500/10 text-red-600",
};

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function CopyButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const cleaned = text.replace(/^\$\s*/gm, "").replace(/^>\s*/gm, "").trim();
    navigator.clipboard.writeText(cleaned).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`absolute top-2 right-2 px-2.5 py-1 text-xs rounded border transition-colors opacity-0 group-hover:opacity-100 ${
        copied
          ? "text-green-500 border-green-500 bg-[#1e1e2a]"
          : "text-muted-foreground border-border bg-card hover:text-foreground hover:border-primary"
      }`}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CodeBlock({ children }: { readonly children: string }) {
  return (
    <div className="relative mb-5 group">
      <pre className="bg-[#1e1e2a] text-[#e4e4ef] rounded-lg p-4 font-mono text-sm leading-relaxed overflow-x-auto">
        <code>{children}</code>
      </pre>
      <CopyButton text={children} />
    </div>
  );
}

function InlineCode({ children }: { readonly children: string }) {
  return (
    <code className="font-mono text-[0.85em] bg-primary/5 px-1.5 py-0.5 rounded border border-border text-primary">
      {children}
    </code>
  );
}

function Callout({
  title,
  children,
  variant = "default",
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly variant?: "default" | "info" | "warning" | "danger";
}) {
  const styles = {
    default: "bg-primary/5 border-primary/20",
    info: "bg-blue-500/5 border-blue-500/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    danger: "bg-red-500/5 border-red-500/20",
  } as const;
  const titleColors = {
    default: "text-primary",
    info: "text-blue-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  } as const;

  return (
    <div className={`border rounded-lg p-3.5 my-3.5 text-sm leading-relaxed ${styles[variant]}`}>
      <div className={`font-semibold text-xs uppercase tracking-wide mb-1 ${titleColors[variant]}`}>
        {title}
      </div>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

function DocTable({
  headers,
  rows,
}: {
  readonly headers: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<TableRow>;
}) {
  return (
    <div className="overflow-x-auto mb-5">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left p-2.5 font-semibold text-foreground border-b-2 border-border text-xs uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-primary/[0.02]">
              {row.cells.map((cell, j) => (
                <td key={j} className="p-2.5 border-b border-border text-muted-foreground">
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

function DiagramFlow({
  nodes,
  caption,
}: {
  readonly nodes: ReadonlyArray<{ label: string; value: string; variant?: string; sub?: string }>;
  readonly caption: string;
}) {
  const variantMap: Record<string, string> = {
    user: "border-blue-500 bg-blue-500/10",
    agent: "border-primary bg-primary/10",
    token: "border-green-500 bg-green-500/10",
    deny: "border-red-500 bg-red-500/10",
    allow: "border-green-500 bg-green-500/10",
    default: "border-amber-500 bg-amber-500/10",
    neutral: "border-muted-foreground bg-muted",
  };

  return (
    <div className="bg-card border border-border rounded-xl p-8 my-5 text-center">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {nodes.map((node, i) => (
          <div key={i} className="contents">
            {i > 0 && (
              <div className="text-muted-foreground text-lg shrink-0">&rarr;</div>
            )}
            <div
              className={`border rounded-lg px-5 py-3 text-sm font-medium text-foreground min-w-[100px] text-center ${
                variantMap[node.variant ?? "neutral"] ?? variantMap.neutral
              }`}
            >
              <span className="block text-[0.68rem] text-muted-foreground uppercase tracking-wider mb-1">
                {node.label}
              </span>
              {node.value}
              {node.sub && (
                <small className="block text-muted-foreground text-[0.7rem] mt-0.5">
                  {node.sub}
                </small>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground italic">{caption}</p>
    </div>
  );
}

function EndpointCard({ endpoint }: { readonly endpoint: EndpointDef }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-card border border-border rounded-xl mb-4 overflow-hidden transition-colors hover:border-primary/20"
      id={endpoint.id}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-primary/[0.03] select-none"
      >
        <span
          className={`inline-flex items-center justify-center font-mono text-[0.72rem] font-bold px-2.5 py-0.5 rounded min-w-[54px] text-center ${
            METHOD_BADGE_COLORS[endpoint.method]
          }`}
        >
          {endpoint.method}
        </span>
        <span className="font-mono text-sm text-foreground font-medium">
          {endpoint.path}
        </span>
        <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
          {endpoint.description}
        </span>
        <span
          className={`text-muted-foreground text-[0.7rem] transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        >
          &#9656;
        </span>
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-4 border-t border-primary/5">
          {endpoint.body}
          {endpoint.tryIt}
        </div>
      )}
    </div>
  );
}

function TerminalBlock({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <div className="bg-muted border border-border rounded-lg overflow-hidden mb-5">
      <div className="bg-muted/80 px-3.5 py-2 flex items-center gap-1.5 border-b border-border">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
        <span className="ml-2 text-[0.72rem] text-muted-foreground font-mono">Terminal</span>
      </div>
      <div className="p-3.5 font-mono text-sm leading-7 text-foreground">
        {children}
      </div>
    </div>
  );
}

function SectionDivider() {
  return <hr className="border-t border-border my-12" />;
}

// ---------------------------------------------------------------------------
// Try It Panel Component
// ---------------------------------------------------------------------------

function TryItPanel({
  fields,
  onRun,
  responseId,
}: {
  readonly fields: ReadonlyArray<{
    label: string;
    id: string;
    placeholder: string;
    defaultValue?: string;
    textarea?: boolean;
  }>;
  readonly onRun: () => void;
  readonly responseId: string;
}) {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const wrappedRun = async () => {
    setLoading(true);
    setResponse(null);
    try {
      onRun();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5 mt-4">
      <h4 className="text-sm font-semibold text-foreground mb-3">Try It</h4>
      {fields.map((f) => (
        <div key={f.id} className="mb-2.5">
          <label className="block text-[0.75rem] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
            {f.label}
          </label>
          {f.textarea ? (
            <textarea
              id={f.id}
              className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground font-mono text-sm focus:border-primary focus:outline-none min-h-[80px] resize-y"
              placeholder={f.placeholder}
              defaultValue={f.defaultValue}
            />
          ) : (
            <input
              id={f.id}
              type="text"
              className="w-full px-3 py-2 bg-muted border border-border rounded text-foreground font-mono text-sm focus:border-primary focus:outline-none"
              placeholder={f.placeholder}
              defaultValue={f.defaultValue}
            />
          )}
        </div>
      ))}
      <button
        onClick={wrappedRun}
        disabled={loading}
        className="mt-1 px-5 py-2 bg-gradient-to-r from-primary to-blue-400 text-white rounded text-sm font-semibold hover:-translate-y-px hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Running..." : "Run Request"}
      </button>
      <div id={responseId} className="mt-3">
        {response && (
          <pre className="bg-[#1e1e2a] text-[#e4e4ef] rounded-lg p-3 font-mono text-xs max-h-72 overflow-y-auto">
            {response}
          </pre>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Code Tab Data Helpers
// ---------------------------------------------------------------------------

const INSTALL_TABS: readonly CodeTab[] = [
  { label: "npm", language: "bash", code: "npm install @agentsid/sdk" },
  { label: "pip", language: "bash", code: "pip install agentsid" },
  { label: "gem", language: "bash", code: "gem install agentsid" },
  {
    label: "maven",
    language: "xml",
    code: `<dependency>
  <groupId>dev.agentsid</groupId>
  <artifactId>agentsid-sdk</artifactId>
</dependency>`,
  },
];

const REGISTER_TABS: readonly CodeTab[] = [
  {
    label: "TypeScript",
    language: "typescript",
    code: `import { AgentsID } from '@agentsid/sdk';

const aid = new AgentsID({
  projectKey: 'aid_proj_...'
});

const { agent, token } = await aid.registerAgent({
  name: 'research-assistant',
  onBehalfOf: 'user_abc',
  permissions: ['search_memories', 'save_memory'],
  ttlHours: 24
});

console.log('Agent ID:', agent.id);
console.log('Token:', token);`,
  },
  {
    label: "Python",
    language: "python",
    code: `from agentsid import AgentsID

aid = AgentsID(project_key="aid_proj_...")

agent = await aid.register_agent(
    name="research-assistant",
    on_behalf_of="user_abc",
    permissions=["search_memories", "save_memory"],
    ttl="24h",
)

print("Agent ID:", agent.id)
print("Token:", agent.token)`,
  },
  {
    label: "Ruby",
    language: "ruby",
    code: `require 'agentsid'

aid = AgentsID::Client.new(project_key: 'aid_proj_...')

result = aid.register_agent(
  name: 'research-assistant',
  on_behalf_of: 'user_abc',
  permissions: ['search_memories', 'save_memory'],
  ttl_hours: 24
)

puts "Agent ID: #{result.agent.id}"
puts "Token: #{result.token}"`,
  },
  {
    label: "Java",
    language: "java",
    code: `import dev.agentsid.sdk.AgentsID;

AgentsID aid = new AgentsID("aid_proj_...");

RegisterResult result = aid.registerAgent(
    "research-assistant",
    "user_abc",
    List.of("search_memories", "save_memory"),
    24
);

System.out.println("Agent ID: " + result.getAgentId());
System.out.println("Token: " + result.getToken());`,
  },
];

const MIDDLEWARE_TABS: readonly CodeTab[] = [
  {
    label: "TypeScript",
    language: "typescript",
    code: `import { agentsIdMiddleware } from '@agentsid/sdk/mcp';

// Wrap your MCP server's tool handler
server.use(agentsIdMiddleware({
  projectKey: 'aid_proj_...',
  // Extracts the agent token from the request context
  getToken: (req) => req.headers['x-agent-token'],
}));

// Every tool call is now validated:
// 1. Token signature verified
// 2. Permissions checked
// 3. Action logged to audit trail`,
  },
  {
    label: "Python",
    language: "python",
    code: `from agentsid.mcp import agentsid_middleware

# Wrap your MCP server's tool handler
app.add_middleware(agentsid_middleware(
    project_key="aid_proj_...",
    # Extracts the agent token from the request context
    get_token=lambda req: req.headers.get("x-agent-token"),
))

# Every tool call is now validated:
# 1. Token signature verified
# 2. Permissions checked
# 3. Action logged to audit trail`,
  },
  {
    label: "Ruby",
    language: "ruby",
    code: `require 'agentsid/mcp'

# Wrap your MCP server's tool handler
use AgentsID::MCP::Middleware,
  project_key: 'aid_proj_...',
  get_token: ->(req) { req.headers['X-Agent-Token'] }

# Every tool call is now validated:
# 1. Token signature verified
# 2. Permissions checked
# 3. Action logged to audit trail`,
  },
  {
    label: "Java",
    language: "java",
    code: `import dev.agentsid.sdk.mcp.AgentsIdMiddleware;

// Add middleware to your MCP server
server.addMiddleware(new AgentsIdMiddleware(
    "aid_proj_...",
    req -> req.getHeader("X-Agent-Token")
));

// Every tool call is now validated:
// 1. Token signature verified
// 2. Permissions checked
// 3. Action logged to audit trail`,
  },
];

const IDENTITY_TABS: readonly CodeTab[] = [
  {
    label: "TypeScript",
    language: "typescript",
    code: `const { agent, token } = await aid.registerAgent({
  name: 'research-assistant',
  onBehalfOf: 'user_abc',
  permissions: ['search_memories', 'save_memory'],
  ttlHours: 24,
  metadata: { framework: 'langchain', model: 'claude-sonnet-4' }
});

// agent.id = "agt_7x9k2mNpQ4rS1tUv"
// agent.status = "active"
// agent.expiresAt = "2026-03-26T14:30:00Z"`,
  },
  {
    label: "Python",
    language: "python",
    code: `agent = await aid.register_agent(
    name="research-assistant",
    on_behalf_of="user_abc",
    permissions=["search_memories", "save_memory"],
    ttl="24h",
    metadata={"framework": "langchain", "model": "claude-sonnet-4"}
)

# agent.id = "agt_7x9k2mNpQ4rS1tUv"
# agent.status = "active"
# agent.expires_at = "2026-03-26T14:30:00Z"`,
  },
  {
    label: "Ruby",
    language: "ruby",
    code: `result = aid.register_agent(
  name: 'research-assistant',
  on_behalf_of: 'user_abc',
  permissions: ['search_memories', 'save_memory'],
  ttl_hours: 24,
  metadata: { framework: 'langchain', model: 'claude-sonnet-4' }
)

# result.agent.id = "agt_7x9k2mNpQ4rS1tUv"`,
  },
  {
    label: "Java",
    language: "java",
    code: `RegisterResult result = aid.registerAgent(
    "research-assistant",
    "user_abc",
    List.of("search_memories", "save_memory"),
    24,
    Map.of("framework", "langchain")
);

// result.getAgentId() = "agt_7x9k2mNpQ4rS1tUv"`,
  },
];

const PERMISSIONS_TABS: readonly CodeTab[] = [
  {
    label: "TypeScript",
    language: "typescript",
    code: `await aid.setPermissions(agent.id, [
  { toolPattern: 'search_*',  action: 'allow' },
  { toolPattern: 'save_memory', action: 'allow',
    conditions: { category: ['note', 'preference'] } },
  { toolPattern: 'delete_*',  action: 'deny', priority: 10 },
]);

// Check a permission
const result = await aid.checkPermission(agent.id, 'delete_memory');
// result.allowed = false
// result.reason = "Denied by rule: delete_*"`,
  },
  {
    label: "Python",
    language: "python",
    code: `await aid.set_permissions(agent.id, [
    {"tool_pattern": "search_*",  "action": "allow"},
    {"tool_pattern": "save_memory", "action": "allow",
     "conditions": {"category": ["note", "preference"]}},
    {"tool_pattern": "delete_*",  "action": "deny", "priority": 10},
])

# Check a permission
result = await aid.check_permission(agent.id, "delete_memory")
# result.allowed = False
# result.reason = "Denied by rule: delete_*"`,
  },
  {
    label: "Ruby",
    language: "ruby",
    code: `aid.set_permissions(agent.id, [
  { tool_pattern: 'search_*',  action: 'allow' },
  { tool_pattern: 'save_memory', action: 'allow',
    conditions: { category: ['note', 'preference'] } },
  { tool_pattern: 'delete_*',  action: 'deny', priority: 10 },
])

# Check a permission
result = aid.check_permission(agent.id, 'delete_memory')
# result.allowed = false`,
  },
  {
    label: "Java",
    language: "java",
    code: `aid.setPermissions(agentId, List.of(
    new Rule("search_*",  "allow"),
    new Rule("save_memory", "allow",
        Map.of("category", List.of("note", "preference"))),
    new Rule("delete_*",  "deny", 10)
));

// Check a permission
CheckResult result = aid.checkPermission(agentId, "delete_memory");
// result.isAllowed() = false`,
  },
];

const DELEGATION_TABS: readonly CodeTab[] = [
  {
    label: "TypeScript",
    language: "typescript",
    code: `// Parent agent delegates to a child with narrowed permissions
const child = await aid.delegate({
  parentAgentId: 'agt_7x9k2mNpQ4rS1tUv',
  parentToken: 'aid_tok_...',
  childName: 'sub-researcher',
  childPermissions: ['search_memories'], // subset of parent's
  ttlHours: 12
});

// child.agent.id = "agt_newChildId"
// child.token = "aid_tok_childToken..."`,
  },
  {
    label: "Python",
    language: "python",
    code: `# Parent agent delegates to a child with narrowed permissions
child = await aid.delegate(
    parent_agent_id="agt_7x9k2mNpQ4rS1tUv",
    parent_token="aid_tok_...",
    child_name="sub-researcher",
    child_permissions=["search_memories"],  # subset of parent's
    ttl_hours=12,
)

# child.agent.id = "agt_newChildId"
# child.token = "aid_tok_childToken..."`,
  },
  {
    label: "Ruby",
    language: "ruby",
    code: `# Parent agent delegates to a child with narrowed permissions
child = aid.delegate(
  parent_agent_id: 'agt_7x9k2mNpQ4rS1tUv',
  parent_token: 'aid_tok_...',
  child_name: 'sub-researcher',
  child_permissions: ['search_memories'],
  ttl_hours: 12
)`,
  },
  {
    label: "Java",
    language: "java",
    code: `DelegateResult child = aid.delegate(
    "agt_7x9k2mNpQ4rS1tUv",
    "aid_tok_...",
    "sub-researcher",
    List.of("search_memories"),
    12
);`,
  },
];

const AUDIT_TABS: readonly CodeTab[] = [
  {
    label: "TypeScript",
    language: "typescript",
    code: `// Query audit log for a specific agent
const logs = await aid.getAuditLog({
  agentId: 'agt_7x9k2mNpQ4rS1tUv',
  action: 'deny',
  since: '2026-03-25T00:00:00Z',
  limit: 50
});

// Get aggregate stats
const stats = await aid.getAuditStats({ days: 7 });
// stats.totalEvents = 1523
// stats.denyRatePct = 8.1

// Verify chain integrity
const verification = await aid.verifyAuditChain();
// verification.verified = true`,
  },
  {
    label: "Python",
    language: "python",
    code: `# Query audit log for a specific agent
logs = await aid.get_audit_log(
    agent_id="agt_7x9k2mNpQ4rS1tUv",
    action="deny",
    since="2026-03-25",
    limit=50
)

# Get aggregate stats
stats = await aid.get_audit_stats(days=7)
# stats.total_events = 1523
# stats.deny_rate_pct = 8.1

# Verify chain integrity
verification = await aid.verify_audit_chain()
# verification.verified = True`,
  },
  {
    label: "Ruby",
    language: "ruby",
    code: `# Query audit log for a specific agent
logs = aid.get_audit_log(
  agent_id: 'agt_7x9k2mNpQ4rS1tUv',
  action: 'deny',
  since: '2026-03-25',
  limit: 50
)

# Get aggregate stats
stats = aid.get_audit_stats(days: 7)

# Verify chain integrity
verification = aid.verify_audit_chain`,
  },
  {
    label: "Java",
    language: "java",
    code: `// Query audit log for a specific agent
AuditLog logs = aid.getAuditLog(
    "agt_7x9k2mNpQ4rS1tUv",
    "deny",
    "2026-03-25T00:00:00Z",
    50
);

// Get aggregate stats
AuditStats stats = aid.getAuditStats(7);

// Verify chain integrity
VerifyResult v = aid.verifyAuditChain();`,
  },
];

const SDK_INIT_TABS: readonly CodeTab[] = [
  {
    label: "TypeScript",
    language: "typescript",
    code: `import { AgentsID } from '@agentsid/sdk';

const aid = new AgentsID({
  projectKey: 'aid_proj_...',
  baseUrl: 'https://api.agentsid.dev',  // optional, defaults to hosted
});`,
  },
  {
    label: "Python",
    language: "python",
    code: `from agentsid import AgentsID

aid = AgentsID(
    project_key="aid_proj_...",
    base_url="https://api.agentsid.dev",  # optional
)`,
  },
  {
    label: "Ruby",
    language: "ruby",
    code: `require 'agentsid'

aid = AgentsID::Client.new(
  project_key: 'aid_proj_...',
  base_url: 'https://api.agentsid.dev'  # optional
)`,
  },
  {
    label: "Java",
    language: "java",
    code: `import dev.agentsid.sdk.AgentsID;

AgentsID aid = new AgentsID.Builder("aid_proj_...")
    .baseUrl("https://api.agentsid.dev")  // optional
    .build();`,
  },
];

// ---------------------------------------------------------------------------
// Try It Handlers
// ---------------------------------------------------------------------------

const API_BASE = "https://api.agentsid.dev/api/v1";


function runTryIt(
  responseContainerId: string,
  fetcher: () => Promise<Response>
) {
  const container = document.getElementById(responseContainerId);
  if (!container) return;
  container.textContent = "Loading...";

  fetcher()
    .then(async (res) => {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        const pre = document.createElement("pre");
        pre.className = "bg-[#1e1e2a] text-[#e4e4ef] rounded-lg p-3 font-mono text-xs max-h-72 overflow-y-auto";
        pre.textContent = JSON.stringify(json, null, 2);
        container.replaceChildren(pre);
      } catch {
        const pre = document.createElement("pre");
        pre.className = "bg-[#1e1e2a] text-[#e4e4ef] rounded-lg p-3 font-mono text-xs max-h-72 overflow-y-auto";
        pre.textContent = `${res.status} ${res.statusText}\n\n${text}`;
        container.replaceChildren(pre);
      }
    })
    .catch((err: Error) => {
      const pre = document.createElement("pre");
      pre.className = "bg-red-500/10 text-red-500 rounded-lg p-3 font-mono text-xs";
      pre.textContent = `Error: ${err.message}`;
      container.replaceChildren(pre);
    });
}

// ---------------------------------------------------------------------------
// Sidebar components
// ---------------------------------------------------------------------------

function SidebarGroup({
  section,
  activeSection,
  onItemClick,
}: {
  readonly section: SidebarSection;
  readonly activeSection: string;
  readonly onItemClick: (href: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground select-none"
      >
        {section.title}
        <span className={`text-[0.6rem] transition-transform ${collapsed ? "-rotate-90" : ""}`}>
          &#9656;
        </span>
      </button>
      {!collapsed && (
        <div className="py-0.5">
          {section.items.map((item) => {
            const isActive = activeSection === item.href.replace("#", "");
            return (
              <button
                key={item.href}
                onClick={() => onItemClick(item.href)}
                className={`block w-full text-left px-5 pl-7 py-1.5 text-sm border-l-2 transition-colors ${
                  isActive
                    ? "text-primary bg-primary/5 border-l-primary font-medium"
                    : "text-muted-foreground border-l-transparent hover:text-foreground hover:bg-primary/[0.03] hover:border-l-primary"
                }`}
              >
                {item.method && (
                  <span
                    className={`inline-block text-[0.6rem] font-bold font-mono px-1 py-px rounded mr-1.5 min-w-[32px] text-center align-middle ${
                      METHOD_BADGE_SM[item.method]
                    }`}
                  >
                    {item.method === "DELETE" ? "DEL" : item.method}
                  </span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function HeroSection() {
  const steps = [
    {
      number: 1,
      title: "Install",
      desc: "Add the SDK to your project with one command.",
      code: "npm install @agentsid/sdk",
    },
    {
      number: 2,
      title: "Init",
      desc: "Create a project and get your API key.",
      code: 'npx agentsid init "My App"',
    },
    {
      number: 3,
      title: "Protect",
      desc: "Register agents and add middleware to your MCP server.",
      code: "aid.registerAgent({...})",
    },
  ] as const;

  return (
    <section className="text-center py-16 pb-12 border-b border-border mb-12" id="getting-started">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4 bg-gradient-to-r from-foreground via-primary to-blue-400 bg-clip-text text-transparent">
        Get your agents authenticated
        <br />
        in 5 minutes
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-9">
        Identity, permissions, and audit for AI agents. Drop-in SDK for any MCP server.
      </p>
      <div className="flex justify-center gap-8 flex-wrap">
        {steps.map((s) => (
          <div
            key={s.number}
            className="bg-card border border-border rounded-xl px-7 py-6 w-[220px] text-left transition-all hover:border-primary hover:shadow-[0_0_40px_rgba(124,91,240,0.08)] hover:-translate-y-0.5"
          >
            <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-400 text-white text-xs font-bold mb-3">
              {s.number}
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1.5">{s.title}</h3>
            <p className="text-xs text-muted-foreground mb-2.5">{s.desc}</p>
            <div className="font-mono text-xs text-green-600 bg-muted px-2.5 py-1.5 rounded border border-border">
              {s.code}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InstallationSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="installation">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Installation
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Choose your language and install the AgentsID SDK.
      </p>
      <CodeTabs tabs={INSTALL_TABS} />
    </section>
  );
}

function QuickStartSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="quickstart">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Quick Start
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Follow these five steps to go from zero to fully protected MCP server.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Step 1: Install the SDK</h3>
      <p className="text-muted-foreground mb-3">
        See the <a href="#installation" className="text-primary hover:underline">Installation</a> section above for your language.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Step 2: Create a project</h3>
      <CodeBlock>{`npx agentsid init "My App"`}</CodeBlock>
      <p className="text-muted-foreground mb-3">
        This creates a project and prints your API key. Store it securely -- you will not see it again.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Step 3: Register an agent</h3>
      <CodeTabs tabs={REGISTER_TABS} />

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Step 4: Add middleware to your MCP server</h3>
      <CodeTabs tabs={MIDDLEWARE_TABS} />

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Step 5: Check the dashboard</h3>
      <p className="text-muted-foreground mb-3">
        Open your <a href="/dashboard" className="text-primary hover:underline">AgentsID Dashboard</a> to see agents, permissions, and the real-time audit log. Every tool call your agents make is tracked and visible.
      </p>

      <Callout title="That is it.">
        Your agents now have verifiable identities, per-tool permissions, and a complete audit trail. Every action is traceable to a human.
      </Callout>
    </section>
  );
}

function AgentIdentitySection() {
  return (
    <section className="scroll-mt-20 mb-14" id="agent-identity">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Agent Identity
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Every agent gets a unique, verifiable identity backed by an HMAC-signed token. This is not a shared API key -- it is a specific identity for a specific agent instance, traceable to the human who authorized it.
      </p>

      <DiagramFlow
        nodes={[
          { label: "Human", value: "user_abc", variant: "user" },
          { label: "Agent", value: "research-assistant", variant: "agent" },
          { label: "Token", value: "aid_tok_...", variant: "token" },
          { label: "Validate", value: "HMAC-SHA256", variant: "neutral" },
        ]}
        caption="Agent tokens are self-validating -- signature verification requires no database call."
      />

      <CodeTabs tabs={IDENTITY_TABS} />
    </section>
  );
}

function PermissionsSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="permissions">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Permissions
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        AgentsID uses a deny-first permission engine. If no rule explicitly allows an action, it is denied. Deny rules always take priority over allow rules.
      </p>

      <DiagramFlow
        nodes={[
          { label: "Step 1", value: "Check Deny Rules", variant: "deny" },
          { label: "Step 2", value: "Check Allow Rules", variant: "allow" },
          { label: "Step 3", value: "Default Deny", variant: "default" },
        ]}
        caption="Deny rules are always evaluated first. If nothing explicitly allows, the action is denied."
      />

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Pattern Matching</h3>
      <p className="text-muted-foreground mb-3">
        Tool patterns support Unix-style wildcard matching. Use <InlineCode>{"*"}</InlineCode> to match any characters.
      </p>
      <DocTable
        headers={["Pattern", "Matches", "Does Not Match"]}
        rows={[
          { cells: [<InlineCode>save_memory</InlineCode>, "save_memory", "save_note, delete_memory"] },
          { cells: [<InlineCode>{"save_*"}</InlineCode>, "save_memory, save_note, save_file", "delete_memory"] },
          { cells: [<InlineCode>{"*_memory"}</InlineCode>, "save_memory, delete_memory", "save_note"] },
          { cells: [<InlineCode>{"*"}</InlineCode>, "Everything", "(nothing excluded)"] },
        ]}
      />

      <CodeTabs tabs={PERMISSIONS_TABS} />
    </section>
  );
}

function AdvancedPermissionsSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="advanced-permissions">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Advanced Permission Controls
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Permission rules support optional advanced fields for fine-grained control beyond simple allow/deny. These fields are set via the <a href="#api-set-permissions" className="text-primary hover:underline">Set Permissions</a> endpoint.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Resource Scoping</h3>
      <p className="text-muted-foreground mb-3">
        Use the <InlineCode>conditions</InlineCode> field to constrain which parameters a tool call can use. All conditions must match (AND logic).
      </p>
      <CodeBlock>{`{
  "tool_pattern": "save_memory",
  "action": "allow",
  "conditions": { "category": ["note", "preference"] }
}`}</CodeBlock>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Time-based Permissions</h3>
      <p className="text-muted-foreground mb-3">
        Use the <InlineCode>schedule</InlineCode> field to restrict a rule to specific hours and days.
      </p>
      <DocTable
        headers={["Field", "Type", "Description"]}
        rows={[
          { cells: [<InlineCode>hours_start</InlineCode>, "integer", "Start hour, inclusive (0-23)"] },
          { cells: [<InlineCode>hours_end</InlineCode>, "integer", "End hour, exclusive (0-24)"] },
          { cells: [<InlineCode>timezone</InlineCode>, "string", <>IANA timezone name (default: <InlineCode>UTC</InlineCode>)</>] },
          { cells: [<InlineCode>days</InlineCode>, "string[]", <>Days of week: <InlineCode>mon</InlineCode>, <InlineCode>tue</InlineCode>, etc.</>] },
        ]}
      />

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Rate Limiting</h3>
      <p className="text-muted-foreground mb-3">
        Apply a sliding-window rate limit using the <InlineCode>rate_limit</InlineCode> field.
      </p>
      <DocTable
        headers={["Field", "Type", "Description"]}
        rows={[
          { cells: [<InlineCode>max</InlineCode>, "integer", "Maximum calls in window (1-100,000)"] },
          { cells: [<InlineCode>per</InlineCode>, "string", <>Window size: <InlineCode>second</InlineCode>, <InlineCode>minute</InlineCode>, <InlineCode>hour</InlineCode>, or <InlineCode>day</InlineCode></>] },
        ]}
      />

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Data Classification</h3>
      <p className="text-muted-foreground mb-3">
        Use the <InlineCode>data_level</InlineCode> field to restrict classification levels. Valid levels: <InlineCode>public</InlineCode>, <InlineCode>internal</InlineCode>, <InlineCode>confidential</InlineCode>, <InlineCode>restricted</InlineCode>.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Approval Gates</h3>
      <p className="text-muted-foreground mb-3">
        Set <InlineCode>{"requires_approval: true"}</InlineCode> to hold matching actions for human review. Use the <a href="#api-list-approvals" className="text-primary hover:underline">Approvals</a> endpoints to approve or reject.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Combined Example</h3>
      <CodeBlock>{`{
  "tool_pattern": "transfer_funds",
  "action": "allow",
  "conditions": { "currency": ["USD", "EUR"] },
  "schedule": {
    "hours_start": 9,
    "hours_end": 17,
    "timezone": "US/Eastern",
    "days": ["mon", "tue", "wed", "thu", "fri"]
  },
  "rate_limit": { "max": 5, "per": "hour" },
  "data_level": ["confidential"],
  "requires_approval": true,
  "priority": 100
}`}</CodeBlock>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">IP Allowlists</h3>
      <p className="text-muted-foreground mb-3">
        Restrict an agent to specific IP addresses or CIDR ranges using the <InlineCode>ip_allowlist</InlineCode> field. Requests from IPs outside the allowlist are denied immediately.
      </p>
      <CodeBlock>{`{
  "tool_pattern": "*",
  "action": "allow",
  "ip_allowlist": {
    "cidrs": ["10.0.0.0/8", "172.16.0.0/12"],
    "ips": ["203.0.113.42"]
  }
}`}</CodeBlock>
      <p className="text-muted-foreground mb-3 text-sm">
        <strong>Use case:</strong> Lock a production agent to your VPC IP range so it cannot be used from outside your infrastructure. Combines with schedule rules to limit both when and where an agent can operate.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Chain Depth Limits</h3>
      <p className="text-muted-foreground mb-3">
        Set <InlineCode>max_chain_depth</InlineCode> to cap how many delegation hops an agent can create. This prevents unbounded delegation chains where Agent A delegates to B, B to C, and so on.
      </p>
      <CodeBlock>{`{
  "tool_pattern": "*",
  "action": "allow",
  "max_chain_depth": 3
}`}</CodeBlock>
      <p className="text-muted-foreground mb-3 text-sm">
        <strong>Use case:</strong> Ensure that orchestrator agents cannot create deeply nested delegation trees that become impossible to audit. Works with the delegation chain&apos;s built-in scope narrowing to bound the blast radius.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Budget Caps</h3>
      <p className="text-muted-foreground mb-3">
        Use the <InlineCode>budget</InlineCode> field to set spending or resource consumption limits. When the budget is exhausted, further calls matching this rule are denied until the window resets.
      </p>
      <CodeBlock>{`{
  "tool_pattern": "call_llm",
  "action": "allow",
  "budget": { "max": 100.0, "unit": "usd", "per": "day" }
}`}</CodeBlock>
      <p className="text-muted-foreground mb-3 text-sm">
        <strong>Use case:</strong> Prevent an agent from burning through your OpenAI budget by capping daily spend. Pairs with rate limits for both cost and frequency control.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Cooldown Periods</h3>
      <p className="text-muted-foreground mb-3">
        Use the <InlineCode>cooldown</InlineCode> field to enforce a waiting period after a denied action before the agent can retry. This prevents rapid-fire retry loops that waste resources or trigger abuse detection.
      </p>
      <CodeBlock>{`{
  "tool_pattern": "send_email",
  "action": "allow",
  "cooldown": { "seconds": 30 }
}`}</CodeBlock>
      <p className="text-muted-foreground mb-3 text-sm">
        <strong>Use case:</strong> After denying an email send (e.g., due to rate limit), force a 30-second pause before retry. Combines with rate limits to create smooth back-pressure instead of hard walls.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Sequence Requirements</h3>
      <p className="text-muted-foreground mb-3">
        Use <InlineCode>sequence_requirements</InlineCode> to require that an agent calls specific tools before a given action is allowed. This enforces operational workflows (e.g., &quot;always search before writing&quot;).
      </p>
      <CodeBlock>{`{
  "tool_pattern": "save_memory",
  "action": "allow",
  "sequence_requirements": {
    "requires_prior": ["search_*"],
    "within_seconds": 300
  }
}`}</CodeBlock>
      <p className="text-muted-foreground mb-3 text-sm">
        <strong>Use case:</strong> Require agents to search for duplicates before saving a new memory. The prerequisite must have been called within the last 300 seconds. Works with the audit trail to verify the sequence was followed.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Session Limits</h3>
      <p className="text-muted-foreground mb-3">
        Use <InlineCode>session_limits</InlineCode> to constrain per-session behavior: total duration, idle timeout, and maximum number of calls.
      </p>
      <CodeBlock>{`{
  "tool_pattern": "*",
  "action": "allow",
  "session_limits": {
    "max_duration_minutes": 60,
    "max_idle_minutes": 10,
    "max_calls": 500
  }
}`}</CodeBlock>
      <p className="text-muted-foreground mb-3 text-sm">
        <strong>Use case:</strong> Prevent runaway agent sessions by capping total runtime and idle time. If an agent sits idle for 10 minutes or exceeds 500 calls, the session is terminated. Complements budget caps for both cost and operational control.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Risk Score Threshold</h3>
      <p className="text-muted-foreground mb-3">
        Set <InlineCode>risk_score_threshold</InlineCode> to block tool calls whose computed risk score exceeds the threshold. Risk scores (0-100) are calculated from tool sensitivity, parameter values, and agent history.
      </p>
      <CodeBlock>{`{
  "tool_pattern": "*",
  "action": "allow",
  "risk_score_threshold": 50
}`}</CodeBlock>
      <p className="text-muted-foreground mb-3 text-sm">
        <strong>Use case:</strong> Allow routine operations (risk &lt; 50) to proceed automatically while blocking high-risk calls that need manual review. Combine with approval gates: calls above the threshold are routed to human reviewers instead of being hard-denied.
      </p>

      <Callout title="Evaluation order." variant="info">
        Advanced fields are evaluated after pattern matching: IP allowlist is checked first, then session limits, schedule, rate limit, cooldown, sequence requirements, risk score, data level, budget, and finally approval gate. If any check fails, the rule does not apply.
      </Callout>
    </section>
  );
}

function PermissionSpecificationSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="permission-specification">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        The AgentsID Permission Specification
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        AgentsID defines the most complete permission model for AI agents available today. The specification covers 13 distinct constraint types organized into 5 categories. Every constraint type can be combined on a single rule, giving you precise control over what agents can do, when, where, and how much.
      </p>

      <DocTable
        headers={["Category", "Constraint Types"]}
        rows={[
          { cells: [<strong>Access</strong>, "Tool Patterns, Conditions, Data Classification, IP Allowlists"] },
          { cells: [<strong>Time & Rate</strong>, "Schedule, Rate Limits, Cooldown"] },
          { cells: [<strong>Behavioral</strong>, "Sequence Requirements, Risk Score"] },
          { cells: [<strong>Resource</strong>, "Budget Caps, Session Limits"] },
          { cells: [<strong>Governance</strong>, "Approval Gates, Chain Depth Limits"] },
        ]}
      />

      <p className="text-muted-foreground mt-5 mb-3 leading-relaxed">
        All 13 types compose freely. A single permission rule can combine IP restrictions, budget caps, schedule windows, and approval gates -- the engine evaluates them all in sequence and short-circuits on the first failure. This lets you express policies like &quot;allow fund transfers only from the VPC, during business hours, under $1000/day, with human approval&quot; in a single rule.
      </p>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Full Rule Example</h3>
      <CodeBlock>{`{
  "tool_pattern": "transfer_funds",
  "action": "allow",
  "conditions": { "currency": ["USD", "EUR"] },
  "schedule": {
    "hours_start": 9,
    "hours_end": 17,
    "timezone": "US/Eastern",
    "days": ["mon", "tue", "wed", "thu", "fri"]
  },
  "rate_limit": { "max": 5, "per": "hour" },
  "budget": { "max": 1000.0, "unit": "usd", "per": "day" },
  "data_level": ["confidential"],
  "ip_allowlist": { "cidrs": ["10.0.0.0/8"] },
  "max_chain_depth": 2,
  "cooldown": { "seconds": 10 },
  "sequence_requirements": {
    "requires_prior": ["verify_balance"],
    "within_seconds": 60
  },
  "session_limits": {
    "max_duration_minutes": 120,
    "max_idle_minutes": 15,
    "max_calls": 200
  },
  "risk_score_threshold": 40,
  "requires_approval": true,
  "priority": 100
}`}</CodeBlock>

      <Callout title="Fail-closed by design." variant="info">
        Every constraint type is fail-closed. If the IP allowlist cannot be evaluated (e.g., missing IP header), the check fails. If the budget service is unreachable, the check fails. This ensures that partial outages never result in over-permissioning.
      </Callout>
    </section>
  );
}

function DelegationSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="delegation">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Delegation Chains
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Every agent action is traceable to a human. When agents delegate to sub-agents, permissions can only narrow at each hop -- they can never expand.
      </p>

      <DiagramFlow
        nodes={[
          { label: "Human", value: "user_abc", variant: "user", sub: "read, write, delete" },
          { label: "Agent A", value: "coordinator", variant: "agent", sub: "read, write" },
          { label: "Agent B", value: "sub-researcher", variant: "agent", sub: "read" },
        ]}
        caption="Permissions narrow at each delegation hop. Agent B cannot receive 'write' because Agent A chose not to delegate it."
      />

      <CodeTabs tabs={DELEGATION_TABS} />

      <Callout title="Scope narrowing is enforced server-side." variant="warning">
        If a child requests a permission the parent does not have, the delegation is rejected with HTTP 403.
      </Callout>
    </section>
  );
}

function AuditTrailSection() {
  const entries = [
    { action: "ALLOW", tool: "search_memories", agent: "agt_7x9k...Q4rS", time: "14:35:00", allowed: true },
    { action: "ALLOW", tool: "save_memory", agent: "agt_7x9k...Q4rS", time: "14:35:12", allowed: true },
    { action: "DENY", tool: "delete_memory", agent: "agt_7x9k...Q4rS", time: "14:35:28", allowed: false },
    { action: "ALLOW", tool: "list_categories", agent: "agt_abc1...f456", time: "14:36:01", allowed: true },
    { action: "DENY", tool: "save_memory", agent: "agt_abc1...f456", time: "14:36:15", allowed: false },
  ] as const;

  return (
    <section className="scroll-mt-20 mb-14" id="audit-trail">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Audit Trail
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Every token validation and permission check is recorded in an append-only audit log. The log is cryptographically chained using SHA-256, making tampering detectable.
      </p>

      <div className="flex flex-col gap-2 my-4">
        {entries.map((e, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2.5 bg-card rounded-lg border font-mono text-sm ${
              e.allowed ? "border-l-4 border-l-green-500 border-border" : "border-l-4 border-l-red-500 border-border"
            }`}
          >
            <span
              className={`text-[0.7rem] font-bold uppercase min-w-[44px] text-center ${
                e.allowed ? "text-green-600" : "text-red-600"
              }`}
            >
              {e.action}
            </span>
            <span className="text-foreground">{e.tool}</span>
            <span className="text-muted-foreground ml-auto text-xs">{e.agent}</span>
            <span className="text-muted-foreground text-xs">{e.time}</span>
          </div>
        ))}
      </div>

      <CodeTabs tabs={AUDIT_TABS} />

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Hash Chain Integrity</h3>
      <DiagramFlow
        nodes={[
          { label: "Entry 1", value: "hash(genesis + data)", variant: "neutral" },
          { label: "Entry 2", value: "hash(prev + data)", variant: "neutral" },
          { label: "Entry 3", value: "hash(prev + data)", variant: "neutral" },
          { label: "Entry N", value: "hash(prev + data)", variant: "neutral" },
        ]}
        caption="Each entry's hash covers the previous entry's hash, forming a tamper-evident chain."
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// API Reference Section
// ---------------------------------------------------------------------------

function ApiReferenceSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="api-reference">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        API Reference
      </h2>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Base URL: <InlineCode>{"https://api.agentsid.dev/api/v1"}</InlineCode> (hosted) or <InlineCode>{"http://localhost:8000/api/v1"}</InlineCode> (self-hosted).
      </p>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        All endpoints (except project creation and health) require a project API key in the <InlineCode>Authorization</InlineCode> header:
      </p>
      <CodeBlock>{"Authorization: Bearer aid_proj_<your_project_key>"}</CodeBlock>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Projects</h3>
      {API_ENDPOINTS_PROJECTS.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Agents</h3>
      {API_ENDPOINTS_AGENTS.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Permissions</h3>
      {API_ENDPOINTS_PERMISSIONS.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Validation</h3>
      {API_ENDPOINTS_VALIDATION.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Audit</h3>
      {API_ENDPOINTS_AUDIT.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Approvals</h3>
      <p className="text-muted-foreground mb-4 leading-relaxed">
        Human-in-the-loop authorization for sensitive agent actions. When a permission rule has <InlineCode>{"requires_approval: true"}</InlineCode>, matching tool calls are held for human review.
      </p>
      {API_ENDPOINTS_APPROVALS.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Webhooks</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Subscribe to real-time event notifications. AgentsID sends HTTP POST requests to your configured URLs when events occur.
      </p>
      <Callout title="Supported events:" variant="info">
        <InlineCode>agent.created</InlineCode>, <InlineCode>agent.revoked</InlineCode>, <InlineCode>agent.denied</InlineCode>, <InlineCode>limit.approaching</InlineCode>, <InlineCode>limit.reached</InlineCode>, <InlineCode>approval.requested</InlineCode>, <InlineCode>approval.decided</InlineCode>, <InlineCode>chain.broken</InlineCode>
      </Callout>
      {API_ENDPOINTS_WEBHOOKS.map((ep) => (
        <EndpointCard key={ep.id} endpoint={ep} />
      ))}

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-4">Common Error Responses</h3>
      <p className="text-muted-foreground mb-3">All errors follow this format:</p>
      <CodeBlock>{`{ "detail": "Error description" }`}</CodeBlock>
      <DocTable
        headers={["Code", "Meaning"]}
        rows={[
          { cells: [<InlineCode>400</InlineCode>, "Bad request"] },
          { cells: [<InlineCode>401</InlineCode>, "Invalid or missing API key"] },
          { cells: [<InlineCode>404</InlineCode>, "Resource not found"] },
          { cells: [<InlineCode>422</InlineCode>, "Validation error (request body failed schema validation)"] },
          { cells: [<InlineCode>429</InlineCode>, "Rate limit exceeded"] },
          { cells: [<InlineCode>500</InlineCode>, "Internal server error (details logged server-side)"] },
        ]}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// API Endpoint Data
// ---------------------------------------------------------------------------

const API_ENDPOINTS_PROJECTS: readonly EndpointDef[] = [
  {
    id: "api-projects",
    method: "POST",
    path: "/api/v1/projects/",
    description: "Create a new project and receive an API key",
    body: (
      <>
        <p className="text-muted-foreground mb-3"><strong className="text-foreground">Rate limit:</strong> 5 requests per minute per IP. No authentication required.</p>
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Request Body</h4>
        <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
          { cells: [<InlineCode>name</InlineCode>, "string", "Yes", "Project name (1-255 characters)"] },
          { cells: [<InlineCode>email</InlineCode>, "string", "No", "Owner email address"] },
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>201 Created</InlineCode></h4>
        <CodeBlock>{`{
  "project": {
    "id": "proj_a1b2c3d4e5f6",
    "name": "my-app",
    "plan": "free",
    "created_at": "2026-03-25 14:30:00+00:00"
  },
  "api_key": "aid_proj_xR7kM2pQ9..."
}`}</CodeBlock>
        <Callout title="Store the api_key securely." variant="warning">The API key is shown once and cannot be retrieved again.</Callout>
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
        <CodeBlock>{`curl -X POST https://api.agentsid.dev/api/v1/projects/ \\
  -H "Content-Type: application/json" \\
  -d '{"name": "my-app", "email": "dev@example.com"}'`}</CodeBlock>
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Errors</h4>
        <DocTable headers={["Code", "Reason"]} rows={[
          { cells: [<InlineCode>422</InlineCode>, "Invalid name or email format"] },
          { cells: [<InlineCode>429</InlineCode>, "Rate limit exceeded"] },
        ]} />
      </>
    ),
    tryIt: (
      <TryItPanel
        fields={[
          { label: "Project Name", id: "tryit-project-name", placeholder: "my-app", defaultValue: "my-test-project" },
          { label: "Email (optional)", id: "tryit-project-email", placeholder: "dev@example.com" },
        ]}
        onRun={() => {
          const name = (document.getElementById("tryit-project-name") as HTMLInputElement)?.value;
          const email = (document.getElementById("tryit-project-email") as HTMLInputElement)?.value;
          const body: Record<string, string> = { name };
          if (email) body.email = email;
          runTryIt("tryit-project-resp", () =>
            fetch(`${API_BASE}/projects/`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          );
        }}
        responseId="tryit-project-resp"
      />
    ),
  },
];

const API_ENDPOINTS_AGENTS: readonly EndpointDef[] = [
  {
    id: "api-register-agent",
    method: "POST",
    path: "/api/v1/agents/",
    description: "Register a new agent identity",
    body: (
      <>
        <p className="text-muted-foreground mb-3">Create a new agent identity, issue its first token, set up delegation chain and permission rules.</p>
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Request Body</h4>
        <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
          { cells: [<InlineCode>name</InlineCode>, "string", "Yes", "Agent name (1-255 characters)"] },
          { cells: [<InlineCode>on_behalf_of</InlineCode>, "string", "Yes", "Human user ID who authorized this agent"] },
          { cells: [<InlineCode>permissions</InlineCode>, "string[]", "No", "Tool patterns to allow (max 100). Default: none."] },
          { cells: [<InlineCode>ttl_hours</InlineCode>, "integer", "No", "Token lifetime in hours (1-720)"] },
          { cells: [<InlineCode>metadata</InlineCode>, "object", "No", "Arbitrary key-value pairs (max 10KB)"] },
        ]} />
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>201 Created</InlineCode></h4>
        <CodeBlock>{`{
  "agent": {
    "id": "agt_7x9k2mNpQ4rS1tUv",
    "name": "research-assistant",
    "status": "active",
    "created_by": "user_abc",
    "expires_at": "2026-03-26 14:30:00+00:00",
    "created_at": "2026-03-25 14:30:00+00:00"
  },
  "token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
  "token_id": "tok_a1b2c3d4e5f6",
  "expires_at": "2026-03-26 14:30:00+00:00"
}`}</CodeBlock>
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
        <CodeBlock>{`curl -X POST https://api.agentsid.dev/api/v1/agents/ \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "research-assistant",
    "on_behalf_of": "user_abc",
    "permissions": ["search_memories", "save_memory"],
    "ttl_hours": 24
  }'`}</CodeBlock>
        <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Errors</h4>
        <DocTable headers={["Code", "Reason"]} rows={[
          { cells: [<InlineCode>401</InlineCode>, "Invalid or missing API key"] },
          { cells: [<InlineCode>422</InlineCode>, "Validation error (name too long, ttl out of range, metadata over 10KB)"] },
        ]} />
      </>
    ),
    tryIt: (
      <TryItPanel
        fields={[
          { label: "API Key", id: "tryit-register-key", placeholder: "aid_proj_..." },
          { label: "Request Body", id: "tryit-register-body", placeholder: "{}", defaultValue: `{\n  "name": "test-agent",\n  "on_behalf_of": "user_123",\n  "permissions": ["search_*"],\n  "ttl_hours": 24\n}`, textarea: true },
        ]}
        onRun={() => {
          const key = (document.getElementById("tryit-register-key") as HTMLInputElement)?.value;
          const body = (document.getElementById("tryit-register-body") as HTMLTextAreaElement)?.value;
          runTryIt("tryit-register-resp", () =>
            fetch(`${API_BASE}/agents/`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
              body,
            })
          );
        }}
        responseId="tryit-register-resp"
      />
    ),
  },
  {
    id: "api-list-agents", method: "GET", path: "/api/v1/agents/", description: "List all agents in the project",
    body: (<>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Query Parameters</h4>
      <DocTable headers={["Parameter", "Type", "Default", "Description"]} rows={[
        { cells: [<InlineCode>status</InlineCode>, "string", "(all)", <>Filter by: <InlineCode>active</InlineCode>, <InlineCode>revoked</InlineCode>, <InlineCode>expired</InlineCode></>] },
        { cells: [<InlineCode>limit</InlineCode>, "integer", "50", "Results per page (1-200)"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode></h4>
      <CodeBlock>{`[
  {
    "id": "agt_7x9k2mNpQ4rS1tUv",
    "name": "research-assistant",
    "project_id": "proj_a1b2c3d4e5f6",
    "created_by": "user_abc",
    "status": "active",
    "expires_at": "2026-03-26 14:30:00+00:00",
    "metadata": {"framework": "langchain"},
    "created_at": "2026-03-25 14:30:00+00:00",
    "revoked_at": null
  }
]`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/agents/?status=active&limit=10" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-get-agent", method: "GET", path: "/api/v1/agents/{agent_id}", description: "Get details for a specific agent",
    body: (<>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode></h4>
      <CodeBlock>{`{
  "id": "agt_7x9k2mNpQ4rS1tUv",
  "name": "research-assistant",
  "project_id": "proj_a1b2c3d4e5f6",
  "created_by": "user_abc",
  "status": "active",
  "expires_at": "2026-03-26 14:30:00+00:00",
  "metadata": {"framework": "langchain"},
  "created_at": "2026-03-25 14:30:00+00:00",
  "revoked_at": null
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
      <DocTable headers={["Code", "Reason"]} rows={[
        { cells: [<InlineCode>401</InlineCode>, "Invalid or missing API key"] },
        { cells: [<InlineCode>404</InlineCode>, "Agent not found or does not belong to this project"] },
      ]} />
    </>),
  },
  {
    id: "api-update-agent", method: "PATCH", path: "/api/v1/agents/{agent_id}", description: "Update agent name or metadata",
    body: (<>
      <p className="text-muted-foreground mb-3">Update an agent's name or metadata. Does not affect tokens or permissions.</p>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>name</InlineCode>, "string", "No", "New agent name (1-255 characters)"] },
        { cells: [<InlineCode>metadata</InlineCode>, "object", "No", "Replace metadata (max 10KB JSON)"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X PATCH https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{"name": "updated-agent-name"}'`}</CodeBlock>
    </>),
  },
  {
    id: "api-refresh-token", method: "POST", path: "/api/v1/agents/{agent_id}/refresh", description: "Issue a new token, revoking all previous tokens",
    body: (<>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>ttl_hours</InlineCode>, "integer", "No", "New token lifetime in hours (1-720)"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode></h4>
      <CodeBlock>{`{
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "token": "aid_tok_newtoken...",
  "token_id": "tok_f6e5d4c3b2a1",
  "expires_at": "2026-03-27 14:30:00+00:00"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv/refresh \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{"ttl_hours": 48}'`}</CodeBlock>
    </>),
  },
  {
    id: "api-delegate", method: "POST", path: "/api/v1/agents/delegate", description: "Create a child agent with narrowed permissions",
    body: (<>
      <p className="text-muted-foreground mb-3">The parent agent's token is validated and child permissions must be a subset of the parent's permissions.</p>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>parent_agent_id</InlineCode>, "string", "Yes", "ID of the parent agent"] },
        { cells: [<InlineCode>parent_token</InlineCode>, "string", "Yes", "Valid token belonging to the parent"] },
        { cells: [<InlineCode>child_name</InlineCode>, "string", "Yes", "Name for the child agent"] },
        { cells: [<InlineCode>child_permissions</InlineCode>, "string[]", "Yes", "Permissions (must be subset of parent's)"] },
        { cells: [<InlineCode>ttl_hours</InlineCode>, "integer", "No", "Token lifetime in hours (1-720)"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>201 Created</InlineCode></h4>
      <p className="text-muted-foreground mb-3">Same response format as Register Agent.</p>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST https://api.agentsid.dev/api/v1/agents/delegate \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "parent_agent_id": "agt_7x9k2mNpQ4rS1tUv",
    "parent_token": "aid_tok_eyJzdWIiOi...",
    "child_name": "sub-researcher",
    "child_permissions": ["search_memories"],
    "ttl_hours": 12
  }'`}</CodeBlock>
      <DocTable headers={["Code", "Reason"]} rows={[
        { cells: [<InlineCode>401</InlineCode>, "Invalid or missing API key"] },
        { cells: [<InlineCode>403</InlineCode>, "Permission scope violation -- child permissions exceed parent's scope"] },
        { cells: [<InlineCode>404</InlineCode>, "Parent agent not found"] },
      ]} />
    </>),
  },
  {
    id: "api-revoke-agent", method: "DELETE", path: "/api/v1/agents/{agent_id}", description: "Permanently revoke an agent",
    body: (<>
      <p className="text-muted-foreground mb-3">All tokens are immediately invalidated. This action cannot be undone.</p>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>204 No Content</InlineCode></h4>
      <p className="text-muted-foreground mb-3">No response body.</p>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X DELETE https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
];

const API_ENDPOINTS_PERMISSIONS: readonly EndpointDef[] = [
  {
    id: "api-set-permissions", method: "PUT", path: "/api/v1/agents/{agent_id}/permissions", description: "Replace all permission rules for an agent",
    body: (<>
      <p className="text-muted-foreground mb-3">Any existing rules are deleted and replaced with the provided set.</p>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>tool_pattern</InlineCode>, "string", "Yes", <>Tool name or wildcard pattern. Supports <InlineCode>*</InlineCode> wildcards.</>] },
        { cells: [<InlineCode>action</InlineCode>, "string", "No", <>allow or deny. Defaults to allow.</>] },
        { cells: [<InlineCode>conditions</InlineCode>, "object", "No", "Key-value constraints on tool parameters (AND logic)."] },
        { cells: [<InlineCode>priority</InlineCode>, "integer", "No", "Rule priority (0-1000). Higher = evaluated first."] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode></h4>
      <CodeBlock>{`{
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "rules": [
    {"tool_pattern": "search_memories", "action": "allow", "conditions": null, "priority": 0},
    {"tool_pattern": "save_memory", "action": "allow",
     "conditions": {"category": ["note", "preference"]}, "priority": 1},
    {"tool_pattern": "delete_*", "action": "deny", "conditions": null, "priority": 10}
  ]
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X PUT https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv/permissions \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '[
    {"tool_pattern": "search_*", "action": "allow"},
    {"tool_pattern": "delete_*", "action": "deny", "priority": 10}
  ]'`}</CodeBlock>
    </>),
  },
  {
    id: "api-get-permissions", method: "GET", path: "/api/v1/agents/{agent_id}/permissions", description: "Get current permission rules for an agent",
    body: (<>
      <p className="text-muted-foreground mb-3">Returns rules ordered by priority (highest first).</p>
      <CodeBlock>{`{
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "rules": [
    {"tool_pattern": "delete_*", "action": "deny", "priority": 10},
    {"tool_pattern": "save_memory", "action": "allow", "priority": 1},
    {"tool_pattern": "search_memories", "action": "allow", "priority": 0}
  ]
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl https://api.agentsid.dev/api/v1/agents/agt_7x9k2mNpQ4rS1tUv/permissions \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-check-permission", method: "POST", path: "/api/v1/check", description: "Check if an agent can call a specific tool",
    body: (<>
      <p className="text-muted-foreground mb-3">Does not log to the audit trail. Use <InlineCode>/validate</InlineCode> for audited checks.</p>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>agent_id</InlineCode>, "string", "Yes", "Agent ID to check"] },
        { cells: [<InlineCode>tool</InlineCode>, "string", "Yes", "Tool name to check"] },
        { cells: [<InlineCode>params</InlineCode>, "object", "No", "Tool parameters for condition evaluation"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode> (allowed)</h4>
      <CodeBlock>{`{
  "allowed": true,
  "reason": "Allowed by rule: save_memory",
  "matched_rule": {
    "tool_pattern": "save_memory",
    "action": "allow"
  }
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode> (denied)</h4>
      <CodeBlock>{`{
  "allowed": false,
  "reason": "No matching rule -- default deny",
  "matched_rule": null
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST https://api.agentsid.dev/api/v1/check \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "agt_7x9k2mNpQ4rS1tUv", "tool": "delete_memory"}'`}</CodeBlock>
    </>),
    tryIt: (
      <TryItPanel
        fields={[
          { label: "API Key", id: "tryit-check-key", placeholder: "aid_proj_..." },
          { label: "Agent ID", id: "tryit-check-agent", placeholder: "agt_..." },
          { label: "Tool Name", id: "tryit-check-tool", placeholder: "delete_memory", defaultValue: "delete_memory" },
        ]}
        onRun={() => {
          const key = (document.getElementById("tryit-check-key") as HTMLInputElement)?.value;
          const agentId = (document.getElementById("tryit-check-agent") as HTMLInputElement)?.value;
          const tool = (document.getElementById("tryit-check-tool") as HTMLInputElement)?.value;
          runTryIt("tryit-check-resp", () =>
            fetch(`${API_BASE}/check`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({ agent_id: agentId, tool }),
            })
          );
        }}
        responseId="tryit-check-resp"
      />
    ),
  },
];

const API_ENDPOINTS_VALIDATION: readonly EndpointDef[] = [
  {
    id: "api-validate", method: "POST", path: "/api/v1/validate", description: "Validate an agent token and optionally check permission",
    body: (<>
      <p className="text-muted-foreground mb-3">Validates signature, expiry, and revocation status. Every call is logged to the audit trail.</p>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>token</InlineCode>, "string", "Yes", "Agent token to validate (max 5000 chars)"] },
        { cells: [<InlineCode>tool</InlineCode>, "string", "No", "Tool name to check permission for"] },
        { cells: [<InlineCode>params</InlineCode>, "object", "No", "Tool parameters for condition evaluation"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode> (valid, tool allowed)</h4>
      <CodeBlock>{`{
  "valid": true,
  "agent_id": "agt_7x9k2mNpQ4rS1tUv",
  "project_id": "proj_a1b2c3d4e5f6",
  "delegated_by": "user_abc",
  "expires_at": 1711411200,
  "permission": {
    "allowed": true,
    "reason": "Allowed by rule: save_memory",
    "matched_rule": {"tool_pattern": "save_memory", "action": "allow"}
  }
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode> (invalid token)</h4>
      <CodeBlock>{`{
  "valid": false,
  "reason": "Token validation failed"
}`}</CodeBlock>
      <Callout title="Intentionally generic error.">
        The same message is returned for expired tokens, invalid signatures, revoked tokens, and project mismatches to prevent information leakage.
      </Callout>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST https://api.agentsid.dev/api/v1/validate \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "aid_tok_eyJzdWIiOiJhZ3RfN3g5azJt...",
    "tool": "save_memory",
    "params": {"category": "note"}
  }'`}</CodeBlock>
    </>),
    tryIt: (
      <TryItPanel
        fields={[
          { label: "API Key", id: "tryit-validate-key", placeholder: "aid_proj_..." },
          { label: "Agent Token", id: "tryit-validate-token", placeholder: "aid_tok_..." },
          { label: "Tool (optional)", id: "tryit-validate-tool", placeholder: "save_memory" },
        ]}
        onRun={() => {
          const key = (document.getElementById("tryit-validate-key") as HTMLInputElement)?.value;
          const token = (document.getElementById("tryit-validate-token") as HTMLInputElement)?.value;
          const tool = (document.getElementById("tryit-validate-tool") as HTMLInputElement)?.value;
          const body: Record<string, string> = { token };
          if (tool) body.tool = tool;
          runTryIt("tryit-validate-resp", () =>
            fetch(`${API_BASE}/validate`, {
              method: "POST",
              headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          );
        }}
        responseId="tryit-validate-resp"
      />
    ),
  },
  {
    id: "api-introspect", method: "POST", path: "/api/v1/introspect", description: "Full token introspection with decoded claims",
    body: (<>
      <p className="text-muted-foreground mb-3">Returns decoded claims, agent details, permission rules, and delegation chain. Intended for debugging and admin dashboards.</p>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>token</InlineCode>, "string", "Yes", "Agent token to introspect"] },
        { cells: [<InlineCode>tool</InlineCode>, "string", "No", "Tool name to check permission for"] },
        { cells: [<InlineCode>params</InlineCode>, "object", "No", "Tool parameters for condition evaluation"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode></h4>
      <CodeBlock>{`{
  "active": true,
  "agent": {
    "id": "agt_7x9k2mNpQ4rS1tUv",
    "name": "research-assistant",
    "status": "active"
  },
  "claims": {
    "sub": "agt_7x9k2mNpQ4rS1tUv",
    "prj": "proj_a1b2c3d4e5f6",
    "dby": "user_abc",
    "iat": 1711324800,
    "exp": 1711411200,
    "jti": "tok_a1b2c3d4e5f6"
  },
  "permissions": [
    {"tool_pattern": "search_memories", "action": "allow"}
  ],
  "delegation_chain": [
    {"type": "user", "id": "user_abc"},
    {"type": "agent", "id": "agt_7x9k2mNpQ4rS1tUv"}
  ]
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST https://api.agentsid.dev/api/v1/introspect \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{"token": "aid_tok_eyJzdWIiOi..."}'`}</CodeBlock>
    </>),
  },
];

const API_ENDPOINTS_AUDIT: readonly EndpointDef[] = [
  {
    id: "api-audit-log", method: "GET", path: "/api/v1/audit/", description: "Query the audit log with filters",
    body: (<>
      <p className="text-muted-foreground mb-3">Results are ordered newest-first.</p>
      <DocTable headers={["Parameter", "Type", "Default", "Description"]} rows={[
        { cells: [<InlineCode>agent_id</InlineCode>, "string", "(all)", "Filter by agent ID"] },
        { cells: [<InlineCode>tool</InlineCode>, "string", "(all)", "Filter by tool name (exact match)"] },
        { cells: [<InlineCode>action</InlineCode>, "string", "(all)", <>Filter by <InlineCode>allow</InlineCode> or <InlineCode>deny</InlineCode></>] },
        { cells: [<InlineCode>since</InlineCode>, "string", "(all)", "ISO 8601 datetime"] },
        { cells: [<InlineCode>limit</InlineCode>, "integer", "100", "Results per page (1-500)"] },
        { cells: [<InlineCode>offset</InlineCode>, "integer", "0", "Pagination offset"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode></h4>
      <CodeBlock>{`{
  "entries": [
    {
      "id": 42,
      "agent_id": "agt_7x9k2mNpQ4rS1tUv",
      "delegated_by": "user_abc",
      "tool": "save_memory",
      "action": "allow",
      "params": {"category": "note"},
      "result": "success",
      "delegation_chain": [
        {"type": "user", "id": "user_abc"},
        {"type": "agent", "id": "agt_7x9k2mNpQ4rS1tUv"}
      ],
      "created_at": "2026-03-25 14:35:00+00:00"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/audit/?agent_id=agt_7x9k2mNpQ4rS1tUv&action=deny&limit=50" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-audit-stats", method: "GET", path: "/api/v1/audit/stats", description: "Get aggregate audit statistics",
    body: (<>
      <DocTable headers={["Parameter", "Type", "Default", "Description"]} rows={[
        { cells: [<InlineCode>days</InlineCode>, "integer", "30", "Lookback period (1-365)"] },
      ]} />
      <CodeBlock>{`{
  "period_days": 30,
  "total_events": 1523,
  "by_action": { "allow": 1400, "deny": 123 },
  "by_tool": {
    "save_memory": 800,
    "search_memories": 500,
    "delete_memory": 123,
    "list_categories": 100
  },
  "deny_rate_pct": 8.1
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/audit/stats?days=7" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-audit-verify", method: "GET", path: "/api/v1/audit/verify", description: "Verify audit hash chain integrity",
    body: (<>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode> (chain intact)</h4>
      <CodeBlock>{`{
  "verified": true,
  "entries_checked": 1523,
  "message": "All entries verified -- chain intact"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode> (chain broken)</h4>
      <CodeBlock>{`{
  "verified": false,
  "entries_checked": 1523,
  "broken_at_id": 42,
  "message": "Integrity chain broken at entry 42 -- possible tampering"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/audit/verify" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-usage", method: "GET", path: "/api/v1/audit/usage", description: "Get plan limits and current usage",
    body: (<>
      <p className="text-muted-foreground mb-3">Returns current usage stats and plan limits for the authenticated project.</p>
      <CodeBlock>{`{
  "events_this_month": 1200,
  "events_limit": 10000,
  "agents_active": 5,
  "agents_limit": 25,
  "plan": "free"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/audit/usage" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
];

const API_ENDPOINTS_APPROVALS: readonly EndpointDef[] = [
  {
    id: "api-list-approvals", method: "GET", path: "/api/v1/approvals/", description: "List pending approvals",
    body: (<>
      <CodeBlock>{`[
  {
    "id": 1,
    "agent_id": "agt_7x9k2mNpQ4rS1tUv",
    "tool": "delete_user",
    "params": { "user_id": "usr_123" },
    "status": "pending",
    "requested_at": "2026-03-25 14:30:00+00:00"
  }
]`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/approvals/" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-approve", method: "POST", path: "/api/v1/approvals/{id}/approve", description: "Approve a pending action",
    body: (<>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>decided_by</InlineCode>, "string", "Yes", "Identifier of the human approver"] },
        { cells: [<InlineCode>reason</InlineCode>, "string", "No", "Optional reason for the decision"] },
      ]} />
      <CodeBlock>{`{
  "decided_by": "admin@example.com",
  "reason": "Verified with user"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST "https://api.agentsid.dev/api/v1/approvals/1/approve" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{"decided_by": "admin@example.com"}'`}</CodeBlock>
    </>),
  },
  {
    id: "api-reject", method: "POST", path: "/api/v1/approvals/{id}/reject", description: "Reject a pending action",
    body: (<>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>decided_by</InlineCode>, "string", "Yes", "Identifier of the human rejector"] },
        { cells: [<InlineCode>reason</InlineCode>, "string", "No", "Optional reason for the rejection"] },
      ]} />
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST "https://api.agentsid.dev/api/v1/approvals/1/reject" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{"decided_by": "admin@example.com", "reason": "Not authorized"}'`}</CodeBlock>
    </>),
  },
  {
    id: "api-approval-count", method: "GET", path: "/api/v1/approvals/count", description: "Get pending approval count",
    body: (<>
      <p className="text-muted-foreground mb-3">Useful for dashboard badges and polling.</p>
      <CodeBlock>{`{
  "pending_count": 3
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/approvals/count" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
];

const API_ENDPOINTS_WEBHOOKS: readonly EndpointDef[] = [
  {
    id: "api-create-webhook", method: "POST", path: "/api/v1/webhooks/", description: "Create a webhook subscription",
    body: (<>
      <DocTable headers={["Field", "Type", "Required", "Description"]} rows={[
        { cells: [<InlineCode>name</InlineCode>, "string", "Yes", "Webhook name (1-255 characters)"] },
        { cells: [<InlineCode>url</InlineCode>, "string", "Yes", "Destination URL (1-2000 characters)"] },
        { cells: [<InlineCode>events</InlineCode>, "string[]", "Yes", "Events to subscribe to (at least one)"] },
        { cells: [<InlineCode>secret</InlineCode>, "string", "No", "Signing secret for payload verification"] },
      ]} />
      <CodeBlock>{`{
  "name": "slack-alerts",
  "url": "https://hooks.slack.com/services/T00/B00/xxx",
  "events": ["agent.denied", "approval.requested"],
  "secret": "whsec_my_signing_secret"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST "https://api.agentsid.dev/api/v1/webhooks/" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "slack-alerts",
    "url": "https://hooks.slack.com/services/T00/B00/xxx",
    "events": ["agent.denied", "approval.requested"]
  }'`}</CodeBlock>
    </>),
  },
  {
    id: "api-list-webhooks", method: "GET", path: "/api/v1/webhooks/", description: "List all webhooks",
    body: (<>
      <CodeBlock>{`[
  {
    "id": 1,
    "name": "slack-alerts",
    "url": "https://hooks.slack.com/services/T00/B00/xxx",
    "events": ["agent.denied", "approval.requested"],
    "created_at": "2026-03-25 14:30:00+00:00"
  }
]`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl "https://api.agentsid.dev/api/v1/webhooks/" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-delete-webhook", method: "DELETE", path: "/api/v1/webhooks/{id}", description: "Delete a webhook",
    body: (<>
      <p className="text-muted-foreground mb-3">Remove a webhook subscription.</p>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>204 No Content</InlineCode></h4>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X DELETE "https://api.agentsid.dev/api/v1/webhooks/1" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..."`}</CodeBlock>
    </>),
  },
  {
    id: "api-test-webhook", method: "POST", path: "/api/v1/webhooks/test", description: "Send a test webhook payload",
    body: (<>
      <p className="text-muted-foreground mb-3">Send a test payload to verify your webhook endpoint is reachable. Sends a <InlineCode>test.ping</InlineCode> event.</p>
      <CodeBlock>{`{
  "name": "test",
  "url": "https://your-endpoint.com/webhook",
  "events": ["test.ping"],
  "secret": "whsec_optional_secret"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">Response <InlineCode>200 OK</InlineCode></h4>
      <CodeBlock>{`{
  "sent": true,
  "url": "https://your-endpoint.com/webhook"
}`}</CodeBlock>
      <h4 className="text-sm font-semibold text-foreground mt-4 mb-2">curl Example</h4>
      <CodeBlock>{`curl -X POST "https://api.agentsid.dev/api/v1/webhooks/test" \\
  -H "Authorization: Bearer aid_proj_xR7kM2pQ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-endpoint.com/webhook",
    "events": ["test.ping"]
  }'`}</CodeBlock>
    </>),
  },
];

// ---------------------------------------------------------------------------
// SDK Reference Section
// ---------------------------------------------------------------------------

function SdkReferenceSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="sdk-reference">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        SDK Reference
      </h2>

      <div id="sdk-init" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Initialization</h3>
        <CodeTabs tabs={SDK_INIT_TABS} />
      </div>

      <div id="sdk-agents" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Agent Methods</h3>
        <DocTable headers={["Method", "Parameters", "Returns", "Description"]} rows={[
          { cells: [<InlineCode>registerAgent</InlineCode>, "name, onBehalfOf, permissions?, ttlHours?, metadata?", "{ agent, token, tokenId, expiresAt }", "Create a new agent and issue its first token"] },
          { cells: [<InlineCode>getAgent</InlineCode>, "agentId", "Agent", "Get agent details by ID"] },
          { cells: [<InlineCode>listAgents</InlineCode>, "status?, limit?", "Agent[]", "List agents, optionally filtered by status"] },
          { cells: [<InlineCode>updateAgent</InlineCode>, "agentId, name?, metadata?", "Agent", "Update agent name or metadata"] },
          { cells: [<InlineCode>refreshToken</InlineCode>, "agentId, ttlHours?", "{ token, tokenId, expiresAt }", "Issue new token, revoke all previous"] },
          { cells: [<InlineCode>delegate</InlineCode>, "parentAgentId, parentToken, childName, childPermissions, ttlHours?", "{ agent, token, tokenId, expiresAt }", "Create child agent with narrowed permissions"] },
          { cells: [<InlineCode>revokeAgent</InlineCode>, "agentId", "void", "Permanently revoke an agent and all tokens"] },
        ]} />
      </div>

      <div id="sdk-permissions" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Permission Methods</h3>
        <DocTable headers={["Method", "Parameters", "Returns", "Description"]} rows={[
          { cells: [<InlineCode>setPermissions</InlineCode>, "agentId, rules[]", "{ agentId, rules[] }", "Replace all permission rules"] },
          { cells: [<InlineCode>getPermissions</InlineCode>, "agentId", "{ agentId, rules[] }", "Get current permission rules"] },
          { cells: [<InlineCode>checkPermission</InlineCode>, "agentId, tool, params?", "{ allowed, reason, matchedRule }", "Check if agent can call a tool (not audited)"] },
        ]} />
      </div>

      <div id="sdk-validation" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Validation Methods</h3>
        <DocTable headers={["Method", "Parameters", "Returns", "Description"]} rows={[
          { cells: [<InlineCode>validateToken</InlineCode>, "token, tool?, params?", "{ valid, agentId?, permission? }", "Validate token + check permission (audited)"] },
          { cells: [<InlineCode>introspect</InlineCode>, "token, tool?, params?", "{ active, agent?, claims?, permissions?, delegationChain? }", "Full token introspection"] },
        ]} />
      </div>

      <div id="sdk-audit" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Audit Methods</h3>
        <DocTable headers={["Method", "Parameters", "Returns", "Description"]} rows={[
          { cells: [<InlineCode>getAuditLog</InlineCode>, "agentId?, tool?, action?, since?, limit?, offset?", "{ entries[], total, limit, offset }", "Query audit log with filters"] },
          { cells: [<InlineCode>getAuditStats</InlineCode>, "days?", "{ totalEvents, byAction, byTool, denyRatePct }", "Aggregate statistics"] },
          { cells: [<InlineCode>verifyAuditChain</InlineCode>, "(none)", "{ verified, entriesChecked, message }", "Verify hash chain integrity"] },
        ]} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// CLI Reference Section
// ---------------------------------------------------------------------------

function CliReferenceSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="cli-reference">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        CLI Reference
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        The AgentsID CLI is included with the npm package. Use <InlineCode>npx agentsid</InlineCode> to run commands.
      </p>

      <div id="cli-init" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3"><InlineCode>init</InlineCode></h3>
        <p className="text-muted-foreground mb-3">Create a new project and receive your API key.</p>
        <TerminalBlock>
          <span className="text-green-600">$</span> npx agentsid init <span className="text-green-600">"My Production App"</span><br /><br />
          <span className="text-muted-foreground">Creating project "My Production App"...</span><br />
          <span className="text-muted-foreground">Project created successfully!</span><br /><br />
          <span className="text-muted-foreground">  Project ID:  proj_a1b2c3d4e5f6</span><br />
          <span className="text-muted-foreground">  API Key:     aid_proj_xR7kM2pQ9...</span><br />
          <span className="text-muted-foreground">  Plan:        free</span><br /><br />
          <span className="text-muted-foreground">  Store your API key securely. It will not be shown again.</span>
        </TerminalBlock>
      </div>

      <div id="cli-register" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3"><InlineCode>register-agent</InlineCode></h3>
        <p className="text-muted-foreground mb-3">Register a new agent and print its token.</p>
        <TerminalBlock>
          <span className="text-green-600">$</span> npx agentsid register-agent \<br />
          &nbsp;&nbsp;<span className="text-primary">--name</span> <span className="text-green-600">"research-assistant"</span> \<br />
          &nbsp;&nbsp;<span className="text-primary">--on-behalf-of</span> <span className="text-green-600">"user_abc"</span> \<br />
          &nbsp;&nbsp;<span className="text-primary">--permissions</span> <span className="text-green-600">"search_memories,save_memory"</span> \<br />
          &nbsp;&nbsp;<span className="text-primary">--ttl</span> <span className="text-green-600">24</span><br /><br />
          <span className="text-muted-foreground">Agent registered!</span><br /><br />
          <span className="text-muted-foreground">  Agent ID:   agt_7x9k2mNpQ4rS1tUv</span><br />
          <span className="text-muted-foreground">  Token:      aid_tok_eyJzdWIiOi...</span><br />
          <span className="text-muted-foreground">  Expires:    2026-03-26T14:30:00Z</span>
        </TerminalBlock>
        <DocTable headers={["Flag", "Required", "Description"]} rows={[
          { cells: [<InlineCode>--name</InlineCode>, "Yes", "Agent name"] },
          { cells: [<InlineCode>--on-behalf-of</InlineCode>, "Yes", "Human user ID"] },
          { cells: [<InlineCode>--permissions</InlineCode>, "No", "Comma-separated tool patterns"] },
          { cells: [<InlineCode>--ttl</InlineCode>, "No", "Token lifetime in hours"] },
        ]} />
      </div>

      <div id="cli-list" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3"><InlineCode>list-agents</InlineCode></h3>
        <p className="text-muted-foreground mb-3">List all agents in the current project.</p>
        <TerminalBlock>
          <span className="text-green-600">$</span> npx agentsid list-agents <span className="text-primary">--status</span> <span className="text-green-600">active</span><br /><br />
          <span className="text-muted-foreground">ID                       NAME                  STATUS    EXPIRES</span><br />
          <span className="text-muted-foreground">agt_7x9k2mNpQ4rS1tUv    research-assistant    active    2026-03-26T14:30:00Z</span><br />
          <span className="text-muted-foreground">agt_abc123def456         data-processor        active    2026-03-28T10:00:00Z</span>
        </TerminalBlock>
      </div>

      <div id="cli-revoke" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3"><InlineCode>revoke</InlineCode></h3>
        <p className="text-muted-foreground mb-3">Permanently revoke an agent.</p>
        <TerminalBlock>
          <span className="text-green-600">$</span> npx agentsid revoke <span className="text-green-600">agt_7x9k2mNpQ4rS1tUv</span><br /><br />
          <span className="text-muted-foreground">Agent agt_7x9k2mNpQ4rS1tUv revoked. All tokens invalidated.</span>
        </TerminalBlock>
      </div>

      <div id="cli-audit" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3"><InlineCode>audit</InlineCode></h3>
        <p className="text-muted-foreground mb-3">Query the audit log.</p>
        <TerminalBlock>
          <span className="text-green-600">$</span> npx agentsid audit <span className="text-primary">--agent</span> <span className="text-green-600">agt_7x9k2mNpQ4rS1tUv</span> <span className="text-primary">--since</span> <span className="text-green-600">2026-03-25</span> <span className="text-primary">--limit</span> <span className="text-green-600">5</span><br /><br />
          <span className="text-muted-foreground">TIME                  ACTION   TOOL               RESULT</span><br />
          <span className="text-muted-foreground">2026-03-25 14:35:28   DENY     delete_memory      blocked</span><br />
          <span className="text-muted-foreground">2026-03-25 14:35:12   ALLOW    save_memory        success</span><br />
          <span className="text-muted-foreground">2026-03-25 14:35:00   ALLOW    search_memories    success</span>
        </TerminalBlock>
        <DocTable headers={["Flag", "Required", "Description"]} rows={[
          { cells: [<InlineCode>--agent</InlineCode>, "No", "Filter by agent ID"] },
          { cells: [<InlineCode>--tool</InlineCode>, "No", "Filter by tool name"] },
          { cells: [<InlineCode>--action</InlineCode>, "No", <>Filter by <InlineCode>allow</InlineCode> or <InlineCode>deny</InlineCode></>] },
          { cells: [<InlineCode>--since</InlineCode>, "No", "ISO 8601 date/datetime"] },
          { cells: [<InlineCode>--limit</InlineCode>, "No", "Number of results (default 100)"] },
        ]} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Security Model Section
// ---------------------------------------------------------------------------

function SecurityModelSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="security-model">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Security Model
      </h2>

      <div id="security-tokens" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Token Format (HMAC-SHA256)</h3>
        <p className="text-muted-foreground mb-3">
          AgentsID uses HMAC-SHA256 signed tokens rather than JWTs. Tokens are self-validating -- the server can verify authenticity without a database call for the signature and expiry checks.
        </p>
        <CodeBlock>{`aid_tok_<base64url(json_payload)>.<base64url(hmac_signature)>

Token Claims:
{
  "sub": "agt_7x9k2mNpQ4rS1tUv",  // Agent ID
  "prj": "proj_a1b2c3d4e5f6",    // Project ID
  "dby": "user_abc",            // Delegated by (human or parent agent)
  "iat": 1711324800,            // Issued at (Unix timestamp)
  "exp": 1711411200,            // Expires at (Unix timestamp)
  "jti": "tok_a1b2c3d4e5f6"     // Token ID (for revocation)
}`}</CodeBlock>
      </div>

      <div id="security-validation" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Validation Pipeline</h3>
        <p className="text-muted-foreground mb-5">
          Token validation follows a strict five-step pipeline. Every step must pass. Failure at any step short-circuits to denial.
        </p>
        {[
          { num: 1, title: "Signature Verification", tag: "No DB call", tagColor: "bg-green-500/10 text-green-600", desc: "Recompute HMAC-SHA256 using the server's signing secret. Compare with constant-time comparison (hmac.compare_digest) to prevent timing attacks." },
          { num: 2, title: "Expiry Check", tag: "No DB call", tagColor: "bg-green-500/10 text-green-600", desc: "Decode base64url payload and compare the exp claim against current Unix timestamp." },
          { num: 3, title: "Project Ownership Check", tag: "No DB call", tagColor: "bg-green-500/10 text-green-600", desc: "Compare the prj claim against the authenticated API key's project. Prevents cross-project token use." },
          { num: 4, title: "Revocation Check", tag: "DB call", tagColor: "bg-amber-500/10 text-amber-600", desc: "Look up the jti (token ID) in the database. If not found or revoked, reject. Fail-closed: unknown token IDs are treated as revoked." },
          { num: 5, title: "Permission Check (optional)", tag: "DB call", tagColor: "bg-amber-500/10 text-amber-600", desc: "If a tool was specified, evaluate permission rules using the deny-first engine." },
        ].map((step) => (
          <div key={step.num} className="flex items-start gap-4 py-4 relative">
            {step.num < 5 && (
              <div className="absolute left-[17px] top-12 bottom-[-4px] w-0.5 bg-gradient-to-b from-primary to-transparent" />
            )}
            <div className="w-9 h-9 rounded-full flex-shrink-0 bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-white text-sm font-bold">
              {step.num}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">
                {step.title}
                <span className={`inline-block text-[0.68rem] px-2 py-px rounded-full ml-2 font-medium ${step.tagColor}`}>
                  {step.tag}
                </span>
              </h4>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div id="security-permissions" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Permission Engine: Deny-First</h3>
        <p className="text-muted-foreground mb-3">
          The permission engine evaluates rules in three phases. Within each phase, rules are ordered by priority (highest first).
        </p>
        <DocTable headers={["Tool Call", "Params", "Result", "Reason"]} rows={[
          { cells: [<InlineCode>delete_memory</InlineCode>, "any", <span className="text-red-500 font-semibold">Denied</span>, <>Matches <InlineCode>{"delete_*"}</InlineCode> deny rule</>] },
          { cells: [<InlineCode>save_memory</InlineCode>, <>{`{"category":"note"}`}</>, <span className="text-green-600 font-semibold">Allowed</span>, <>Matches <InlineCode>save_memory</InlineCode> with valid condition</>] },
          { cells: [<InlineCode>save_memory</InlineCode>, <>{`{"category":"secret"}`}</>, <span className="text-red-500 font-semibold">Denied</span>, "Condition fails, default deny"] },
          { cells: [<InlineCode>save_memory</InlineCode>, "(none)", <span className="text-red-500 font-semibold">Denied</span>, "Condition requires params, fail-closed"] },
          { cells: [<InlineCode>search_memories</InlineCode>, "any", <span className="text-green-600 font-semibold">Allowed</span>, <>Matches <InlineCode>{"search_*"}</InlineCode> allow rule</>] },
          { cells: [<InlineCode>list_categories</InlineCode>, "any", <span className="text-red-500 font-semibold">Denied</span>, "No matching rule, default deny"] },
        ]} />
      </div>

      <div id="security-hash-chain" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Hash Chain Integrity</h3>
        <p className="text-muted-foreground mb-3">
          Each audit entry is cryptographically linked to its predecessor using SHA-256. The hash covers the project ID, agent ID, tool, action, result, delegated_by, params, error_message, and the previous entry's hash.
        </p>
        <Callout title="Tamper-evident." variant="danger">
          Modifying, inserting, or deleting any audit entry breaks the chain from that point forward. The <InlineCode>/audit/verify</InlineCode> endpoint detects broken links.
        </Callout>
        <p className="text-muted-foreground mt-3">
          The first entry in a project's chain uses the sentinel value <InlineCode>"genesis"</InlineCode> as its previous hash. Concurrent writes are serialized using <InlineCode>SELECT ... FOR UPDATE</InlineCode> to prevent chain forks.
        </p>
      </div>

      <div id="security-key-rotation" className="scroll-mt-20">
        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Key Rotation</h3>
        <p className="text-muted-foreground mb-3">
          The <InlineCode>AGENTSID_SIGNING_SECRET</InlineCode> environment variable holds the server-side signing key. To rotate without invalidating active tokens:
        </p>
        <ol className="list-decimal pl-6 text-muted-foreground space-y-2 mb-5">
          <li>Set <InlineCode>AGENTSID_SIGNING_SECRET_PREVIOUS</InlineCode> to the old secret.</li>
          <li>Set <InlineCode>AGENTSID_SIGNING_SECRET</InlineCode> to the new secret.</li>
          <li>The server validates against the current secret first, then falls back to the previous secret.</li>
          <li>Once all tokens signed with the old secret have expired, remove <InlineCode>AGENTSID_SIGNING_SECRET_PREVIOUS</InlineCode>.</li>
        </ol>

        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Security Headers</h3>
        <DocTable headers={["Header", "Value", "Purpose"]} rows={[
          { cells: [<InlineCode>Strict-Transport-Security</InlineCode>, "max-age=31536000; includeSubDomains", "Forces HTTPS for 1 year"] },
          { cells: [<InlineCode>X-Content-Type-Options</InlineCode>, "nosniff", "Prevents MIME type sniffing"] },
          { cells: [<InlineCode>X-Frame-Options</InlineCode>, "DENY", "Prevents clickjacking"] },
          { cells: [<InlineCode>Cache-Control</InlineCode>, "no-store", "Prevents caching of tokens"] },
        ]} />

        <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Threat Model</h3>
        <DocTable headers={["Threat", "Mitigation"]} rows={[
          { cells: ["Token forgery", "HMAC-SHA256 signature with server-side secret"] },
          { cells: ["Replay after revocation", <>Revocation check via <InlineCode>jti</InlineCode> lookup</>] },
          { cells: ["Timing attacks", <>Constant-time comparison (<InlineCode>hmac.compare_digest</InlineCode>)</>] },
          { cells: ["Cross-project token use", <>Token <InlineCode>prj</InlineCode> claim verified against API key's project</>] },
          { cells: ["Permission escalation", "Scope narrowing enforced on delegation"] },
          { cells: ["Sensitive data in logs", "Automatic redaction of password, secret, token, api_key, credential, key"] },
          { cells: ["Error message leakage", "Generic error messages; details server-side only"] },
          { cells: ["Project creation spam", "Rate limited to 5/minute per IP"] },
        ]} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Trust Score Section
// ---------------------------------------------------------------------------

function TrustScoreSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="trust-score">
      <h2 className="text-2xl font-bold mb-2">Trust Score</h2>
      <p className="text-muted-foreground mb-8">
        Every MCP server in the AgentsID registry receives a trust score from 0–100. The score reflects how safe it is to give that server access to an AI agent.
      </p>

      {/* Score bands */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: "Safe", range: "70–100", color: "text-emerald-500", bg: "bg-emerald-500/8 border-emerald-500/20", desc: "Low risk. Reasonable descriptions, scoped capabilities, no ambient credential access." },
          { label: "Review", range: "50–69", color: "text-yellow-500", bg: "bg-yellow-500/8 border-yellow-500/20", desc: "Moderate risk. Some schema gaps or broad permissions. Usable with care." },
          { label: "Risky", range: "30–49", color: "text-orange-500", bg: "bg-orange-500/8 border-orange-500/20", desc: "High risk. Multiple findings across categories. Review findings before deploying." },
          { label: "Dangerous", range: "0–29", color: "text-red-500", bg: "bg-red-500/8 border-red-500/20", desc: "Critical risk. Toxic data flows, prompt injection vectors, or ambient credential access detected." },
        ].map(({ label, range, color, bg, desc }) => (
          <div key={label} className={`rounded-xl border p-4 ${bg}`}>
            <p className={`text-xl font-black mb-0.5 ${color}`}>{label}</p>
            <p className={`text-xs font-mono mb-2 ${color} opacity-70`}>{range}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* 5 dimensions */}
      <h3 className="text-lg font-semibold mb-4">The 5 Analysis Dimensions</h3>
      <p className="text-sm text-muted-foreground mb-5">
        The trust score is derived from five weighted dimensions. Each dimension is graded A–F by the scanner and converted to a numeric score.
      </p>
      <div className="border border-border rounded-xl overflow-hidden mb-8">
        {[
          { dim: "Descriptions", weight: "25%", what: "Are tool descriptions accurate, specific, and non-misleading? Vague or manipulative descriptions cause hallucination-based vulnerabilities — the LLM infers wrong behavior from bad annotations." },
          { dim: "Schemas", weight: "20%", what: "Do tools define input schemas with proper types, constraints, and required fields? Missing schemas allow agents to pass arbitrary values with no validation." },
          { dim: "Capabilities", weight: "25%", what: "Are dangerous capabilities (delete, write, admin) scoped and justified? Tools with broad permissions and no constraints get penalized heavily." },
          { dim: "Auth", weight: "15%", what: "Does the server indicate authentication requirements? Servers that access credentials, tokens, or sensitive APIs with no auth signals are flagged." },
          { dim: "Stability", weight: "15%", what: "Does the server handle output safely? Tools that pass raw external content to the agent without sanitization create injection surfaces." },
        ].map(({ dim, weight, what }, i) => (
          <div key={dim} className={`flex gap-4 px-5 py-4 ${i < 4 ? "border-b border-border" : ""}`}>
            <div className="w-28 flex-shrink-0">
              <p className="text-sm font-semibold">{dim}</p>
              <p className="text-xs text-muted-foreground">{weight} weight</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{what}</p>
          </div>
        ))}
      </div>

      {/* Grade to score table */}
      <h3 className="text-lg font-semibold mb-4">Grade → Score Conversion</h3>
      <div className="border border-border rounded-xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-5 py-3 font-semibold">Grade</th>
              <th className="text-left px-5 py-3 font-semibold">Score</th>
              <th className="text-left px-5 py-3 font-semibold">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {[
              { grade: "A", score: 95, meaning: "Excellent — no issues in this dimension" },
              { grade: "B", score: 80, meaning: "Good — minor issues only" },
              { grade: "C", score: 65, meaning: "Moderate — several issues present" },
              { grade: "D", score: 40, meaning: "Poor — significant issues" },
              { grade: "F", score: 15, meaning: "Failing — critical issues or missing entirely" },
            ].map(({ grade, score, meaning }, i) => (
              <tr key={grade} className={i < 4 ? "border-b border-border" : ""}>
                <td className="px-5 py-3 font-mono font-bold">{grade}</td>
                <td className="px-5 py-3 text-muted-foreground">{score}</td>
                <td className="px-5 py-3 text-muted-foreground">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        The final trust score is a weighted average of the five dimension scores. High-severity findings in critical categories (toxic flows, prompt injection) apply additional penalty multipliers.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// How the Scan Works Section
// ---------------------------------------------------------------------------

function HowItWorksSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="how-it-works">
      <h2 className="text-2xl font-bold mb-2">How the Scan Works</h2>
      <p className="text-muted-foreground mb-8">
        The AgentsID scanner performs static analysis on MCP server tool definitions — no code execution, no network requests. It inspects the tool manifest exposed by the server and applies seven rule modules.
      </p>

      <div className="space-y-3 mb-10">
        {[
          { step: "1", title: "Connect", desc: "The scanner spawns the MCP server process and connects over stdio or SSE to retrieve the full tool list." },
          { step: "2", title: "Extract", desc: "Every tool's name, description, input schema, and annotations are extracted into a structured manifest." },
          { step: "3", title: "Analyze", desc: "Seven rule modules run against the manifest: output safety, hallucination risk, toxic data flows, prompt injection, capability risk, schema validation, and supply chain." },
          { step: "4", title: "Score", desc: "Findings are weighted by severity and category. Dimension grades are computed and combined into the 0–100 trust score." },
          { step: "5", title: "Report", desc: "A structured JSON report is produced with all findings, grades, and a recommended MAP policy for runtime enforcement." },
        ].map(({ step, title, desc }) => (
          <div key={step} className="flex gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              {step}
            </div>
            <div>
              <p className="text-sm font-semibold mb-0.5">{title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-semibold mb-4">Run the Scanner Yourself</h3>
      <p className="text-sm text-muted-foreground mb-3">
        The scanner is open source. Run it against any MCP server:
      </p>
      <div className="rounded-xl border border-border bg-muted/30 px-5 py-4 font-mono text-sm mb-4">
        <span className="text-muted-foreground">$ </span>
        <span>npx @agentsid/scanner -- npx your-mcp-server</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Results are output as JSON. Pass <code className="text-xs bg-muted px-1 py-0.5 rounded">--json</code> for machine-readable output.
        The scanner runs in a sandboxed subprocess with a 30-second timeout per server.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Pricing Section
// ---------------------------------------------------------------------------

function PricingSection() {
  const plans = [
    { name: "Free", price: "$0", period: "forever", featured: false, features: ["25 agents", "10,000 validations/month", "7-day audit retention", "Community support", "Single project"] },
    { name: "Pro", price: "$29", priceSuffix: "/mo", period: "per project", featured: true, features: ["Unlimited agents", "100,000 validations/month", "90-day audit retention", "Email support", "Up to 5 projects", "Webhook notifications", "Custom token TTL"] },
    { name: "Enterprise", price: "Custom", period: "contact sales", featured: false, features: ["Unlimited everything", "Unlimited validations", "Unlimited audit retention", "Dedicated support + SLA", "Unlimited projects", "Self-hosted option", "SSO / SAML", "Audit export API"] },
  ] as const;

  const comparison = [
    { feature: "Agents", free: "25", pro: "Unlimited", enterprise: "Unlimited" },
    { feature: "Validations/month", free: "10,000", pro: "100,000", enterprise: "Unlimited" },
    { feature: "Audit retention", free: "7 days", pro: "90 days", enterprise: "Unlimited" },
    { feature: "Projects", free: "1", pro: "5", enterprise: "Unlimited" },
    { feature: "Delegation chains", free: "Yes", pro: "Yes", enterprise: "Yes" },
    { feature: "Permission engine", free: "Yes", pro: "Yes", enterprise: "Yes" },
    { feature: "Hash chain verification", free: "Yes", pro: "Yes", enterprise: "Yes" },
    { feature: "MCP middleware", free: "Yes", pro: "Yes", enterprise: "Yes" },
    { feature: "Webhooks", free: "--", pro: "Yes", enterprise: "Yes" },
    { feature: "Self-hosted", free: "--", pro: "--", enterprise: "Yes" },
    { feature: "SSO / SAML", free: "--", pro: "--", enterprise: "Yes" },
    { feature: "Audit export", free: "--", pro: "--", enterprise: "Yes" },
    { feature: "SLA", free: "--", pro: "--", enterprise: "Yes" },
  ] as const;

  return (
    <section className="scroll-mt-20 mb-14" id="pricing">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Pricing
      </h2>
      <p className="text-muted-foreground mb-6">Start free, scale as your agents grow.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-card border rounded-xl px-6 py-7 transition-all hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(124,91,240,0.08)] relative ${
              plan.featured ? "border-primary shadow-[0_0_40px_rgba(124,91,240,0.08)]" : "border-border"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-blue-400 text-white px-3.5 py-0.5 rounded-full text-[0.68rem] font-semibold uppercase tracking-wide">
                Most Popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-foreground mb-1">{plan.name}</h3>
            <div className="text-4xl font-extrabold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-1">
              {plan.price}
              {"priceSuffix" in plan && <span className="text-base font-normal">{plan.priceSuffix}</span>}
            </div>
            <div className="text-xs text-muted-foreground mb-5">{plan.period}</div>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">Feature Comparison</h3>
      <DocTable
        headers={["Feature", "Free", "Pro", "Enterprise"]}
        rows={comparison.map((row) => ({
          cells: [
            <strong className="text-foreground">{row.feature}</strong>,
            row.free === "Yes" ? <span className="text-green-600 font-bold">Yes</span> : row.free === "--" ? <span className="text-muted-foreground">--</span> : row.free,
            row.pro === "Yes" ? <span className="text-green-600 font-bold">Yes</span> : row.pro === "--" ? <span className="text-muted-foreground">--</span> : row.pro,
            row.enterprise === "Yes" ? <span className="text-green-600 font-bold">Yes</span> : row.enterprise,
          ],
        }))}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// FAQ Section
// ---------------------------------------------------------------------------

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: "What counts as a validation?", a: "Every call to /api/v1/validate counts as one validation. The /check endpoint (which does not write to the audit trail) does not count. Token introspection via /introspect also counts as a validation." },
    { q: "Can I self-host AgentsID?", a: "Yes. AgentsID is open source under the MIT license. The self-hosted option is a single FastAPI application backed by PostgreSQL. Enterprise customers get dedicated support for self-hosted deployments." },
    { q: "How are tokens different from JWTs?", a: "AgentsID tokens use HMAC-SHA256 with a simpler structure than JWT. They include agent-specific claims (delegation chain, project scoping) and are designed specifically for agent-to-server authentication rather than general-purpose web auth. The signing secret never leaves the server." },
    { q: "What happens when my free tier limit is reached?", a: "Validation requests will return HTTP 429 until the next billing cycle or until you upgrade. Your agents, tokens, and audit data are not affected -- they are just temporarily unable to perform new validations." },
    { q: "Is there a data processing agreement (DPA) available?", a: "Yes. Enterprise customers can request a DPA. Contact sales@agentsid.dev for details." },
    { q: "How do I report a security vulnerability?", a: "Email security@agentsid.dev with a description, reproduction steps, and potential impact. We acknowledge within 48 hours. Do not open public GitHub issues for security vulnerabilities." },
  ] as const;

  return (
    <section className="scroll-mt-20 mb-14" id="pricing-faq">
      <h3 className="text-xl font-semibold text-foreground mb-4">FAQ</h3>
      {faqs.map((faq, i) => (
        <div key={i} className="border-b border-primary/5">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between py-3.5 text-left text-foreground font-medium text-sm hover:text-primary"
          >
            {faq.q}
            <span className={`text-muted-foreground text-[0.7rem] transition-transform ${openIndex === i ? "rotate-90" : ""}`}>
              &#9656;
            </span>
          </button>
          {openIndex === i && (
            <p className="pb-3.5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
          )}
        </div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const Docs = () => {
  const [activeSection, setActiveSection] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const updateActive = useCallback(() => {
    let current = "";
    for (const id of ALL_SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= 100 && rect.top > -rect.height) {
          current = id;
        }
      }
    }
    setActiveSection(current);
  }, []);

  useEffect(() => {
    let raf: number;
    const handler = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActive);
    };
    window.addEventListener("scroll", handler);
    updateActive();
    return () => {
      window.removeEventListener("scroll", handler);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [updateActive]);

  const handleSidebarClick = (href: string) => {
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        className="fixed top-20 left-4 z-50 lg:hidden bg-card border border-border rounded-lg p-2 text-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 bg-card border-r border-border overflow-y-auto py-4 z-50 transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarGroup
            key={section.title}
            section={section}
            activeSection={activeSection}
            onItemClick={handleSidebarClick}
          />
        ))}
      </aside>

      {/* Main content */}
      <main ref={mainRef} className="lg:ml-64 flex-1 min-h-screen">
        <div className="max-w-[860px] mx-auto px-4 sm:px-8 lg:px-12 py-10 pb-24">
          <HeroSection />
          <InstallationSection />
          <SectionDivider />
          <QuickStartSection />
          <SectionDivider />
          <TrustScoreSection />
          <SectionDivider />
          <HowItWorksSection />
          <SectionDivider />
          <AgentIdentitySection />
          <SectionDivider />
          <PermissionsSection />
          <SectionDivider />
          <AdvancedPermissionsSection />
          <SectionDivider />
          <PermissionSpecificationSection />
          <SectionDivider />
          <DelegationSection />
          <SectionDivider />
          <AuditTrailSection />
          <SectionDivider />
          <ApiReferenceSection />
          <SectionDivider />
          <SdkReferenceSection />
          <SectionDivider />
          <CliReferenceSection />
          <SectionDivider />
          <SecurityModelSection />
          <SectionDivider />
          <PricingSection />
          <FaqSection />
        </div>
      </main>
    </div>
  );
};

export { Docs };
