import { useState, useEffect, useCallback, useRef } from "react";
import { CodeTabs } from "../components/shared/code-tabs";

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
  readonly badge?: string;
  readonly badgeColor?: "green" | "amber";
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const SIDEBAR_SECTIONS: ReadonlyArray<SidebarSection> = [
  {
    title: "Getting Started",
    items: [
      { label: "Quick Start", href: "#quick-start", badge: "5 min", badgeColor: "green" },
      { label: "Claude Code Setup", href: "#claude-code-setup" },
      { label: "Cursor Setup", href: "#cursor-setup" },
      { label: "Codex Setup", href: "#codex-setup" },
    ],
  },
  {
    title: "Tutorials",
    items: [
      { label: "Build a Protected MCP Server", href: "#build-protected-server" },
      { label: "Add Guardrails to Existing Server", href: "#add-guardrails" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { label: "Why Agents Need Guardrails", href: "#why-guardrails" },
      { label: "How Permissions Work", href: "#how-permissions-work" },
      { label: "Understanding the Audit Trail", href: "#audit-trail" },
    ],
  },
  {
    title: "Templates",
    items: [
      { label: "Safe Research Agent", href: "#template-research" },
      { label: "Code Assistant", href: "#template-code" },
      { label: "Customer Support Bot", href: "#template-support" },
      { label: "Cautious Agent", href: "#template-cautious" },
    ],
  },
];

const ALL_SECTION_IDS = SIDEBAR_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.href.replace("#", ""))
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { readonly status: "allowed" | "denied" | "approval" }) {
  const map = {
    allowed: "bg-green-500/10 text-green-600 dark:text-green-400",
    denied: "bg-red-500/10 text-red-600 dark:text-red-400",
    approval: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  } as const;
  const labels = { allowed: "ALLOWED", denied: "DENIED", approval: "NEEDS APPROVAL" } as const;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold font-mono ${map[status]}`}>
      {labels[status]}
    </span>
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

function Cmd({ children }: { readonly children: string }) {
  return (
    <div className="relative group bg-[#1e1e2a] text-[#e4e4ef] border border-border rounded-lg px-4 py-3 my-2.5 font-mono text-sm overflow-x-auto">
      <span className="text-primary mr-2 select-none">&rarr;</span>
      {children}
      <CopyButton text={children} />
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  readonly number: number;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-7 mb-5 transition-colors hover:border-primary/30 hover:shadow-[0_0_40px_rgba(124,91,240,0.08)]">
      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-400 text-white text-sm font-bold mb-3.5">
        {number}
      </div>
      <h4 className="text-lg font-semibold text-foreground mb-2.5">{title}</h4>
      {children}
    </div>
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

function Screenshot({ src, alt }: { readonly src: string; readonly alt: string }) {
  return (
    <div className="my-5 rounded-xl border border-border overflow-hidden shadow-sm">
      <img src={src} alt={alt} className="w-full h-auto" loading="lazy" />
    </div>
  );
}

function Flowchart({ children }: { readonly children: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-7 my-5 font-mono text-sm leading-loose text-muted-foreground overflow-x-auto whitespace-pre">
      {children}
    </div>
  );
}

function SectionDivider() {
  return <hr className="border-t border-border my-12" />;
}

function GuideTable({
  headers,
  rows,
}: {
  readonly headers: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<React.ReactNode>>;
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
              {row.map((cell, j) => (
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

function TemplateCard({
  icon,
  iconBg,
  title,
  children,
}: {
  readonly icon: string;
  readonly iconBg: string;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-8 mb-7 transition-colors hover:border-primary/30 hover:shadow-[0_0_40px_rgba(124,91,240,0.08)]">
      <h3 className="text-xl font-bold text-foreground flex items-center gap-2.5 mb-2">
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${iconBg}`}
        >
          {icon}
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function TemplateSectionLabel({ children }: { readonly children: string }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mt-5 mb-2">
      {children}
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Guides = () => {
  const [activeSection, setActiveSection] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll spy
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
          {/* Hero */}
          <section className="text-center py-16 pb-12 border-b border-border mb-12" id="guides-top">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4 bg-gradient-to-r from-foreground via-primary to-blue-400 bg-clip-text text-transparent">
              Guides & Tutorials
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Everything you need to get AI agents running safely. Step-by-step, copy-paste ready, written for humans.
            </p>
          </section>

          <QuickStartSection />
          <SectionDivider />
          <ClaudeCodeSection />
          <SectionDivider />
          <CursorSection />
          <SectionDivider />
          <CodexSection />
          <SectionDivider />
          <BuildProtectedServerSection />
          <SectionDivider />
          <AddGuardrailsSection />
          <SectionDivider />
          <WhyGuardrailsSection />
          <SectionDivider />
          <HowPermissionsWorkSection />
          <SectionDivider />
          <AuditTrailSection />
          <SectionDivider />
          <TemplatesIntroSection />
          <TemplateResearchSection />
          <TemplateCodeSection />
          <TemplateSupportSection />
          <TemplateCautiousSection />
        </div>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sidebar group
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
        <span
          className={`text-[0.6rem] transition-transform ${collapsed ? "-rotate-90" : ""}`}
        >
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
                {item.label}
                {item.badge && (
                  <span
                    className={`inline-block text-[0.6rem] font-semibold px-1.5 py-px rounded-full ml-1.5 align-middle ${
                      item.badgeColor === "green"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function QuickStartSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="quick-start">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Quick Start (5 minutes)
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        The absolute fastest path from zero to a protected AI agent. By the end of this, you'll have an agent that can only do what you allow it to do, and you'll see every action it takes in your dashboard.
      </p>

      <Step number={1} title="Sign up and get your API key">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Head to the dashboard and create a free account. You'll land on your project page, where your API key is waiting for you.
        </p>
        <Cmd>https://agentsid.dev/dashboard</Cmd>
        <Callout title="What just happened?">
          <p>You created a <strong className="text-foreground">project</strong>. A project is a container for your agents, permissions, and audit logs. Your <strong className="text-foreground">project key</strong> is what your server uses to talk to AgentsID. Keep it secret.</p>
        </Callout>
      </Step>

      <Step number={2} title="Copy your project key">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          On the dashboard, find your project key. It looks something like <InlineCode>aid_proj_abc123...</InlineCode>. Copy it and save it somewhere safe (you'll need it in a moment).
        </p>
        <Screenshot src="/screenshots/dashboard-settings.png" alt="Dashboard settings panel showing project key" />
      </Step>

      <Step number={3} title="Install the SDK">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          In your project directory, install the AgentsID SDK:
        </p>
        <CodeBlock>{`$ npm install @agentsid/sdk`}</CodeBlock>
        <Callout title="What just happened?">
          <p>You installed a lightweight library that handles all the communication with AgentsID. It validates tool calls, logs events, and enforces permissions. Your agent code stays clean.</p>
        </Callout>
      </Step>

      <Step number={4} title="Register an agent">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          An agent is an identity. You register it once, and AgentsID gives it a token. That token is how you prove which agent is making requests.
        </p>
        <CodeBlock>{`import { AgentsID } from '@agentsid/sdk';

const client = new AgentsID({ projectKey: process.env.AGENTSID_PROJECT_KEY });

const agent = await client.registerAgent({
  name: 'my-first-agent',
  permissions: [
    { tool_pattern: 'search_*', action: 'allow' },
    { tool_pattern: 'delete_*', action: 'deny' },
  ],
});`}</CodeBlock>
        <Callout title="What just happened?">
          <p>You told AgentsID: "I have an agent called <InlineCode>my-first-agent</InlineCode>. It's allowed to use any tool starting with <InlineCode>search_</InlineCode>, but it must never use any tool starting with <InlineCode>delete_</InlineCode>." AgentsID gave you back a token for this agent.</p>
        </Callout>
      </Step>

      <Step number={5} title="Validate a tool call">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Before your agent runs any tool, ask AgentsID if it's allowed. Three lines of code:
        </p>
        <CodeBlock>{`const result = await client.validate(agent.token, 'search_docs', { query: 'hello' });

if (!result.allowed) {
  throw new Error(\`Blocked: \${result.reason}\`);
}`}</CodeBlock>
        <Callout title="What just happened?">
          <p>Your code asked AgentsID: "Can this agent run <InlineCode>search_docs</InlineCode> with these parameters?" AgentsID checked the permissions, said "yes," and logged the event. If the agent tried <InlineCode>delete_users</InlineCode>, it would be blocked.</p>
        </Callout>
      </Step>

      <Step number={6} title="Check your dashboard">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Go back to <a href="https://agentsid.dev/dashboard" className="text-primary hover:underline">agentsid.dev/dashboard</a>. You'll see the validation event in your live audit feed: what tool was called, what parameters were sent, whether it was allowed, and exactly when it happened.
        </p>
        <Screenshot src="/screenshots/dashboard-audit-feed.png" alt="Dashboard audit feed showing allowed and denied events" />
        <Callout title="What just happened?">
          <p>Every tool call is logged with a hash chain (each entry links to the previous one). This means the audit log is tamper-evident -- nobody can quietly edit or delete entries. You have a complete, trustworthy record of what your agent did.</p>
        </Callout>
      </Step>

      <SectionDivider />

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Complete Example</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Here is everything from the steps above combined into a single, copy-pasteable file. Save it, set your <InlineCode>aid_proj_YOUR_KEY</InlineCode>, and run it.
      </p>
      <Callout title="Copy the complete file" variant="info">
        <p>Each tab below is a standalone file. Copy whichever language you prefer, replace the project key, and run it directly.</p>
      </Callout>
      <CodeTabs
        tabs={[
          {
            label: "TypeScript (server.mjs)",
            language: "javascript",
            code: `import { AgentsID, createHttpMiddleware } from '@agentsid/sdk';

// 1. Initialize
const aid = new AgentsID({ projectKey: 'aid_proj_YOUR_KEY' });

// 2. Register an agent with scoped permissions
const { agent, token } = await aid.registerAgent({
  name: 'research-bot',
  onBehalfOf: 'user_123',
  permissions: ['search_*', 'save_memory'],
});

console.log('Agent registered:', agent.id);
console.log('Token:', token);

// 3. Validate a tool call
const allowed = await aid.validate(token, 'search_web');
console.log('search_web allowed:', allowed.permission.allowed);
// → true

const denied = await aid.validate(token, 'delete_user');
console.log('delete_user allowed:', denied.permission.allowed);
// → false (deny-first: not in permission list)

// 4. Check the audit log
const log = await aid.getAuditLog();
console.log('Audit events:', log.entries.length);`,
          },
          {
            label: "Python (server.py)",
            language: "python",
            code: `import asyncio
from agentsid import AgentsID

async def main():
    # 1. Initialize
    aid = AgentsID(project_key="aid_proj_YOUR_KEY")

    # 2. Register an agent with scoped permissions
    result = await aid.register_agent(
        name="research-bot",
        on_behalf_of="user_123",
        permissions=["search_*", "save_memory"],
    )
    agent_id = result["agent"]["id"]
    token = result["token"]
    print(f"Agent registered: {agent_id}")

    # 3. Validate tool calls
    allowed = await aid.validate(token, "search_web")
    print(f"search_web allowed: {allowed['permission']['allowed']}")
    # → True

    denied = await aid.validate(token, "delete_user")
    print(f"delete_user allowed: {denied['permission']['allowed']}")
    # → False (deny-first)

    # 4. Check audit log
    log = await aid.get_audit_log()
    print(f"Audit events: {len(log['entries'])}")

asyncio.run(main())`,
          },
        ]}
      />

      <p className="text-muted-foreground leading-relaxed">
        That's it. You went from zero to a protected agent in 5 minutes. Now let's set up your specific AI coding tool.
      </p>
    </section>
  );
}

function ClaudeCodeSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="claude-code-setup">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Claude Code Setup
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Claude Code connects to tools through MCP servers. You'll create a small server file that wraps your tools with AgentsID protection, then tell Claude Code to use it.
      </p>

      <Step number={1} title="Sign up and get your credentials">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          If you haven't already, go to <a href="https://agentsid.dev/dashboard" className="text-primary hover:underline">agentsid.dev/dashboard</a> and create an account. You need two things:
        </p>
        <ul className="text-muted-foreground list-disc ml-6 mb-3 leading-relaxed">
          <li><strong className="text-foreground">Project Key</strong> -- identifies your project (found in your dashboard settings)</li>
          <li><strong className="text-foreground">Agent Token</strong> -- identifies the specific agent (you get this when you register an agent)</li>
        </ul>
      </Step>

      <Step number={2} title="Create your MCP server file">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Create a file called <InlineCode>server.mjs</InlineCode> in your project. This is a complete, working MCP server with AgentsID protection. Copy and paste the whole thing:
        </p>
        <CodeBlock>{`/**
 * My Protected MCP Server
 * Tools are wrapped with AgentsID permission checks.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// -- Config --
const AGENTSID_PROJECT_KEY = process.env.AGENTSID_PROJECT_KEY;
const AGENTSID_AGENT_TOKEN = process.env.AGENTSID_AGENT_TOKEN;
const AGENTSID_URL = process.env.AGENTSID_URL || 'https://agentsid.dev';

// -- In-memory data store --
const notes = [
  { id: 1, title: 'Welcome', content: 'This server is protected by AgentsID!' },
  { id: 2, title: 'Setup', content: 'Permissions are enforced on every tool call.' },
];
let nextId = 3;

// -- AgentsID Middleware --
async function validateToolCall(toolName, params) {
  if (!AGENTSID_PROJECT_KEY || !AGENTSID_AGENT_TOKEN) {
    console.error('[AgentsID] No credentials — running WITHOUT protection');
    return { allowed: true, reason: 'No AgentsID configured' };
  }

  try {
    const res = await fetch(\`\${AGENTSID_URL}/api/v1/validate\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${AGENTSID_PROJECT_KEY}\`,
      },
      body: JSON.stringify({
        token: AGENTSID_AGENT_TOKEN,
        tool: toolName,
        params: params || {},
      }),
    });

    const data = await res.json();
    if (!data.valid) {
      return { allowed: false, reason: data.reason };
    }

    const perm = data.permission || {};
    return {
      allowed: perm.allowed || false,
      reason: perm.reason || 'Unknown',
    };
  } catch (err) {
    console.error(\`[AgentsID] Error: \${err.message}\`);
    return { allowed: false, reason: 'AgentsID unreachable — failing closed' };
  }
}

// -- MCP Server --
const server = new McpServer({
  name: 'my-protected-server',
  version: '1.0.0',
});

// Tool: search_notes (ALLOWED)
server.tool(
  'search_notes',
  'Search through notes by keyword',
  { query: z.string().describe('Search keyword') },
  async ({ query }) => {
    const check = await validateToolCall('search_notes', { query });
    if (!check.allowed) {
      return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };
    }
    const results = notes.filter(n =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.content.toLowerCase().includes(query.toLowerCase())
    );
    return {
      content: [{ type: 'text', text: results.map(n => \`[\${n.id}] \${n.title}: \${n.content}\`).join('\\n') || 'No notes found.' }],
    };
  }
);

// Tool: save_note (ALLOWED)
server.tool(
  'save_note',
  'Save a new note',
  { title: z.string(), content: z.string() },
  async ({ title, content }) => {
    const check = await validateToolCall('save_note', { title });
    if (!check.allowed) {
      return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };
    }
    const note = { id: nextId++, title, content };
    notes.push(note);
    return { content: [{ type: 'text', text: \`Saved: [\${note.id}] \${note.title}\` }] };
  }
);

// Tool: list_notes (ALLOWED)
server.tool(
  'list_notes',
  'List all notes',
  {},
  async () => {
    const check = await validateToolCall('list_notes');
    if (!check.allowed) {
      return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };
    }
    return {
      content: [{ type: 'text', text: notes.map(n => \`[\${n.id}] \${n.title}: \${n.content}\`).join('\\n') }],
    };
  }
);

// Tool: delete_note (DENIED by AgentsID)
server.tool(
  'delete_note',
  'Delete a note by ID',
  { id: z.number().describe('Note ID to delete') },
  async ({ id }) => {
    const check = await validateToolCall('delete_note', { id });
    if (!check.allowed) {
      return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };
    }
    // This code never runs — AgentsID blocks it
    return { content: [{ type: 'text', text: 'Deleted.' }] };
  }
);

// -- Start --
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[Server] Running with AgentsID protection');`}</CodeBlock>
      </Step>

      <Step number={3} title="Install the dependencies">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Your server needs the MCP SDK and Zod for input validation. Run this in the same directory as your <InlineCode>server.mjs</InlineCode>:
        </p>
        <CodeBlock>{`$ npm init -y && npm install @modelcontextprotocol/sdk zod`}</CodeBlock>
      </Step>

      <Step number={4} title="Register your agent with permissions">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Before connecting, register the agent on AgentsID so it knows what this agent is allowed to do. Use the API or the dashboard. Here's the curl command:
        </p>
        <CodeBlock>{`$ curl -X POST https://agentsid.dev/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "claude-notes-agent",
    "permissions": [
      {"tool_pattern": "search_notes", "action": "allow"},
      {"tool_pattern": "save_note", "action": "allow"},
      {"tool_pattern": "list_notes", "action": "allow"},
      {"tool_pattern": "delete_note", "action": "deny"},
      {"tool_pattern": "admin_*", "action": "deny"}
    ]
  }'`}</CodeBlock>
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          The response includes an <InlineCode>agent_token</InlineCode>. Copy it -- you'll use it in the next step.
        </p>
      </Step>

      <Step number={5} title="Add the server to Claude Code">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          This is the magic command. It tells Claude Code to start your MCP server and pass in your credentials as environment variables:
        </p>
        <CodeBlock>{`$ claude mcp add my-notes-server --scope user \\
  node server.mjs \\
  -e AGENTSID_PROJECT_KEY=aid_proj_your_key_here \\
  -e AGENTSID_AGENT_TOKEN=at_your_token_here`}</CodeBlock>
        <Callout title="Tip" variant="info">
          <p>Use <InlineCode>--scope user</InlineCode> to make this server available in all your projects, or <InlineCode>--scope project</InlineCode> for just this one. You can also use <InlineCode>--scope workspace</InlineCode> if you're in a workspace.</p>
        </Callout>
      </Step>

      <Step number={6} title="Test it">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Open Claude Code and try these prompts:
        </p>
        <CodeBlock>{`# This should work (search_notes is allowed)
"Search my notes for the word welcome"

# This should work (list_notes is allowed)
"List all my notes"

# This should work (save_note is allowed)
"Save a note titled 'Meeting' with content 'Call at 3pm'"

# This should be BLOCKED (delete_note is denied)
"Delete note number 1"`}</CodeBlock>
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          When Claude tries to delete, you'll see a response like: <InlineCode>BLOCKED: Tool 'delete_note' is denied by permission rules</InlineCode>. The tool exists, Claude knows about it, but AgentsID won't let it run.
        </p>
      </Step>

      <Step number={7} title="Check the dashboard">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Go to <a href="https://agentsid.dev/dashboard" className="text-primary hover:underline">agentsid.dev/dashboard</a>. You'll see every tool call in the audit feed:
        </p>
        <Screenshot src="/screenshots/dashboard-audit-feed.png" alt="Dashboard audit feed showing search_notes allowed and delete_note denied" />
        <p className="text-muted-foreground leading-relaxed text-[0.95rem]">
          Each entry shows the tool name, parameters, whether it was allowed or denied, and a timestamp. The denied calls are highlighted in red so they stand out.
        </p>
      </Step>
    </section>
  );
}

function CursorSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="cursor-setup">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Cursor Setup
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Cursor supports MCP servers through a JSON configuration file. Here's how to set it up.
      </p>

      <Step number={1} title="Sign up and get your credentials">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Same as above: go to <a href="https://agentsid.dev/dashboard" className="text-primary hover:underline">agentsid.dev/dashboard</a>, create an account, and register an agent. You need your <strong className="text-foreground">project key</strong> and <strong className="text-foreground">agent token</strong>.
        </p>
      </Step>

      <Step number={2} title="Create the MCP server file">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Create <InlineCode>server.mjs</InlineCode> with the exact same code from the <a href="#claude-code-setup" className="text-primary hover:underline">Claude Code Setup</a> above. Same file, same code. Nothing changes.
        </p>
      </Step>

      <Step number={3} title="Install dependencies">
        <CodeBlock>{`$ npm init -y && npm install @modelcontextprotocol/sdk zod`}</CodeBlock>
      </Step>

      <Step number={4} title="Add to Cursor's MCP config">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Create or edit <InlineCode>.cursor/mcp.json</InlineCode> in your project root. Add your server like this:
        </p>
        <CodeBlock>{`{
  "mcpServers": {
    "my-notes-server": {
      "command": "node",
      "args": ["server.mjs"],
      "env": {
        "AGENTSID_PROJECT_KEY": "aid_proj_your_key_here",
        "AGENTSID_AGENT_TOKEN": "at_your_token_here"
      }
    }
  }
}`}</CodeBlock>
        <Callout title="Important" variant="warning">
          <p>Don't commit this file with real keys! Add <InlineCode>.cursor/mcp.json</InlineCode> to your <InlineCode>.gitignore</InlineCode>, or use environment variables that reference a <InlineCode>.env</InlineCode> file instead.</p>
        </Callout>
      </Step>

      <Step number={5} title="Restart Cursor and test">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Restart Cursor (or reload the window). Your MCP tools should appear in Cursor's tool list. Try the same prompts as the Claude Code section -- search should work, delete should be blocked.
        </p>
      </Step>

      <Step number={6} title="Check the dashboard">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Same dashboard, same audit feed. Go to <a href="https://agentsid.dev/dashboard" className="text-primary hover:underline">agentsid.dev/dashboard</a> and see every tool call your Cursor agent made.
        </p>
      </Step>
    </section>
  );
}

function CodexSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="codex-setup">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Codex Setup
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        OpenAI's Codex CLI supports MCP servers with a similar command to Claude Code.
      </p>

      <Step number={1} title="Sign up and get your credentials">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Same deal: <a href="https://agentsid.dev/dashboard" className="text-primary hover:underline">agentsid.dev/dashboard</a>, create an account, register an agent, get your project key and agent token.
        </p>
      </Step>

      <Step number={2} title="Create the MCP server file">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Use the same <InlineCode>server.mjs</InlineCode> from the <a href="#claude-code-setup" className="text-primary hover:underline">Claude Code Setup</a>. The MCP protocol is a standard -- the same server works with every client.
        </p>
      </Step>

      <Step number={3} title="Install dependencies">
        <CodeBlock>{`$ npm init -y && npm install @modelcontextprotocol/sdk zod`}</CodeBlock>
      </Step>

      <Step number={4} title="Add the server to Codex">
        <CodeBlock>{`$ codex mcp add my-notes-server \\
  node server.mjs \\
  -e AGENTSID_PROJECT_KEY=aid_proj_your_key_here \\
  -e AGENTSID_AGENT_TOKEN=at_your_token_here`}</CodeBlock>
      </Step>

      <Step number={5} title="Test and verify">
        <p className="text-muted-foreground mb-3 leading-relaxed text-[0.95rem]">
          Open Codex and try searching for notes (allowed) and deleting notes (blocked). Then check the dashboard at <a href="https://agentsid.dev/dashboard" className="text-primary hover:underline">agentsid.dev/dashboard</a> to see the audit trail.
        </p>
      </Step>
    </section>
  );
}

function BuildProtectedServerSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="build-protected-server">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Build a Protected MCP Server
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        This is the full walkthrough. We'll build an MCP server from scratch, add AgentsID protection, connect it to an AI coding tool, and test it. By the end, your agent will be able to search and save notes, but it won't be able to delete anything -- and you'll have proof of every action in your dashboard.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">What we're building</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">A notes server with five tools:</p>
      <GuideTable
        headers={["Tool", "What it does", "Permission"]}
        rows={[
          [<InlineCode>search_notes</InlineCode>, "Search notes by keyword", <StatusBadge status="allowed" />],
          [<InlineCode>save_note</InlineCode>, "Create a new note", <StatusBadge status="allowed" />],
          [<InlineCode>list_notes</InlineCode>, "List all notes", <StatusBadge status="allowed" />],
          [<InlineCode>delete_note</InlineCode>, "Delete a note by ID", <StatusBadge status="denied" />],
          [<InlineCode>admin_reset</InlineCode>, "Wipe all data", <StatusBadge status="denied" />],
        ]}
      />
      <p className="text-muted-foreground mb-5 leading-relaxed">
        The agent has access to all five tools, but AgentsID will block any attempt to use <InlineCode>delete_note</InlineCode> or <InlineCode>admin_reset</InlineCode>. The agent doesn't even know it's being restricted -- it just gets a "blocked" response and moves on.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 1: Create the project directory</h3>
      <CodeBlock>{`$ mkdir my-protected-server && cd my-protected-server`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 2: Initialize and install dependencies</h3>
      <CodeBlock>{`$ npm init -y
$ npm install @modelcontextprotocol/sdk zod`}</CodeBlock>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        You also need to add <InlineCode>"type": "module"</InlineCode> to your <InlineCode>package.json</InlineCode> so Node understands ES module imports:
      </p>
      <CodeBlock>{`$ node -e "const p=JSON.parse(require('fs').readFileSync('package.json'));p.type='module';require('fs').writeFileSync('package.json',JSON.stringify(p,null,2))"`}</CodeBlock>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Or just open <InlineCode>package.json</InlineCode> and add <InlineCode>"type": "module"</InlineCode> manually. Either works.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 3: Write the validation middleware</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        This is the core of AgentsID integration. Every tool call goes through this function first. If AgentsID says no, the tool doesn't run.
      </p>
      <CodeBlock>{`// validateToolCall.mjs

const AGENTSID_PROJECT_KEY = process.env.AGENTSID_PROJECT_KEY;
const AGENTSID_AGENT_TOKEN = process.env.AGENTSID_AGENT_TOKEN;
const AGENTSID_URL = process.env.AGENTSID_URL || 'https://agentsid.dev';

export async function validateToolCall(toolName, params) {
  if (!AGENTSID_PROJECT_KEY || !AGENTSID_AGENT_TOKEN) {
    console.error('[AgentsID] No credentials — running unprotected');
    return { allowed: true, reason: 'No AgentsID configured' };
  }

  try {
    const res = await fetch(\`\${AGENTSID_URL}/api/v1/validate\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${AGENTSID_PROJECT_KEY}\`,
      },
      body: JSON.stringify({
        token: AGENTSID_AGENT_TOKEN,
        tool: toolName,
        params: params || {},
      }),
    });

    const data = await res.json();
    if (!data.valid) {
      return { allowed: false, reason: data.reason };
    }

    const perm = data.permission || {};
    console.error(\`[AgentsID] \${toolName}: \${perm.allowed ? 'ALLOWED' : 'DENIED'}\`);
    return {
      allowed: perm.allowed || false,
      reason: perm.reason || 'Unknown',
    };
  } catch (err) {
    console.error(\`[AgentsID] Error: \${err.message}\`);
    return { allowed: false, reason: 'AgentsID unreachable — failing closed' };
  }
}`}</CodeBlock>
      <Callout title="Key design choice: fail closed">
        <p>If AgentsID can't be reached (network error, server down), the function returns <InlineCode>allowed: false</InlineCode>. This means if something goes wrong, your agent stops doing things rather than running wild. This is the safe default.</p>
      </Callout>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 4: Add tools one at a time</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Create your <InlineCode>server.mjs</InlineCode>. We'll add each tool with its permission check:
      </p>
      <CodeBlock>{`import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { validateToolCall } from './validateToolCall.mjs';

// In-memory data
const notes = [
  { id: 1, title: 'Welcome', content: 'Protected by AgentsID!' },
];
let nextId = 2;

const server = new McpServer({ name: 'protected-notes', version: '1.0.0' });

// -- Tool 1: search_notes --
server.tool(
  'search_notes', 'Search notes by keyword',
  { query: z.string() },
  async ({ query }) => {
    const check = await validateToolCall('search_notes', { query });
    if (!check.allowed) return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };

    const found = notes.filter(n =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.content.toLowerCase().includes(query.toLowerCase())
    );
    return { content: [{ type: 'text', text: found.map(n => \`[\${n.id}] \${n.title}\`).join('\\n') || 'No results' }] };
  }
);

// -- Tool 2: save_note --
server.tool(
  'save_note', 'Save a new note',
  { title: z.string(), content: z.string() },
  async ({ title, content }) => {
    const check = await validateToolCall('save_note', { title });
    if (!check.allowed) return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };

    const note = { id: nextId++, title, content };
    notes.push(note);
    return { content: [{ type: 'text', text: \`Saved: [\${note.id}] \${note.title}\` }] };
  }
);

// -- Tool 3: list_notes --
server.tool(
  'list_notes', 'List all notes', {},
  async () => {
    const check = await validateToolCall('list_notes');
    if (!check.allowed) return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };

    return { content: [{ type: 'text', text: notes.map(n => \`[\${n.id}] \${n.title}: \${n.content}\`).join('\\n') }] };
  }
);

// -- Tool 4: delete_note (will be DENIED) --
server.tool(
  'delete_note', 'Delete a note',
  { id: z.number() },
  async ({ id }) => {
    const check = await validateToolCall('delete_note', { id });
    if (!check.allowed) return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };

    // This code never runs
    return { content: [{ type: 'text', text: 'Deleted' }] };
  }
);

// -- Tool 5: admin_reset (will be DENIED) --
server.tool(
  'admin_reset', 'Reset all data — DANGEROUS', {},
  async () => {
    const check = await validateToolCall('admin_reset');
    if (!check.allowed) return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };

    // This code never runs
    return { content: [{ type: 'text', text: 'Reset complete' }] };
  }
);

// -- Start the server --
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[Server] Running with AgentsID protection');`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 5: Register the agent with permissions</h3>
      <CodeBlock>{`$ curl -X POST https://agentsid.dev/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "notes-agent",
    "permissions": [
      {"tool_pattern": "search_notes", "action": "allow"},
      {"tool_pattern": "save_note", "action": "allow"},
      {"tool_pattern": "list_notes", "action": "allow"},
      {"tool_pattern": "delete_note", "action": "deny"},
      {"tool_pattern": "admin_*", "action": "deny"}
    ]
  }'`}</CodeBlock>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Save the <InlineCode>agent_token</InlineCode> from the response.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 6: Connect to Claude Code</h3>
      <CodeBlock>{`$ claude mcp add protected-notes --scope user \\
  node server.mjs \\
  -e AGENTSID_PROJECT_KEY=aid_proj_your_key \\
  -e AGENTSID_AGENT_TOKEN=at_your_token`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 7: Test allowed calls</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Ask Claude to search for notes, list notes, or save a new one. These should all work perfectly.
      </p>
      <Screenshot src="/screenshots/dashboard-overview.png" alt="Dashboard command center showing agent activity" />

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 8: Test denied calls</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Ask Claude to delete a note or reset the database. AgentsID will block both:
      </p>
      <Screenshot src="/screenshots/dashboard-agents.png" alt="Dashboard showing agent cards with allow and deny activity" />

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 9: Check the dashboard</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Your audit feed now shows a mix of allowed and denied events. Each one has:
      </p>
      <ul className="text-muted-foreground list-disc ml-6 mb-3 leading-relaxed">
        <li><strong className="text-foreground">Agent name</strong> -- which agent made the call</li>
        <li><strong className="text-foreground">Tool name</strong> -- what tool was requested</li>
        <li><strong className="text-foreground">Parameters</strong> -- what data was sent</li>
        <li><strong className="text-foreground">Result</strong> -- allowed or denied</li>
        <li><strong className="text-foreground">Timestamp</strong> -- exactly when it happened</li>
        <li><strong className="text-foreground">Hash</strong> -- cryptographic link to the previous entry</li>
      </ul>
      <Screenshot src="/screenshots/dashboard-audit-feed.png" alt="Dashboard full audit trail with green allowed and red denied badges" />

      <SectionDivider />

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Complete MCP Server File</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Below is the entire protected MCP server as a single file -- validation middleware, tool definitions, and startup code included. This is equivalent to what the <InlineCode>agentsid init</InlineCode> CLI scaffolding generates.
      </p>
      <Callout title="Copy the complete file" variant="info">
        <p>Each tab is a standalone, runnable MCP server. Copy it, set your environment variables, and connect it to your AI coding tool.</p>
      </Callout>
      <CodeTabs
        tabs={[
          {
            label: "TypeScript (server.mjs)",
            language: "javascript",
            code: `/**
 * Protected Notes MCP Server
 *
 * A complete MCP server with AgentsID permission checks on every tool call.
 * Run: AGENTSID_PROJECT_KEY=aid_proj_... AGENTSID_AGENT_TOKEN=at_... node server.mjs
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const AGENTSID_PROJECT_KEY = process.env.AGENTSID_PROJECT_KEY;
const AGENTSID_AGENT_TOKEN = process.env.AGENTSID_AGENT_TOKEN;
const AGENTSID_URL = process.env.AGENTSID_URL || 'https://agentsid.dev';

// ---------------------------------------------------------------------------
// In-memory data store
// ---------------------------------------------------------------------------
const notes = [
  { id: 1, title: 'Welcome', content: 'This server is protected by AgentsID!' },
  { id: 2, title: 'Setup', content: 'Permissions are enforced on every tool call.' },
];
let nextId = 3;

// ---------------------------------------------------------------------------
// AgentsID validation middleware
// ---------------------------------------------------------------------------
async function validateToolCall(toolName, params) {
  if (!AGENTSID_PROJECT_KEY || !AGENTSID_AGENT_TOKEN) {
    console.error('[AgentsID] Missing credentials — running WITHOUT protection');
    return { allowed: true, reason: 'No AgentsID configured' };
  }

  try {
    const res = await fetch(\`\${AGENTSID_URL}/api/v1/validate\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: \`Bearer \${AGENTSID_PROJECT_KEY}\`,
      },
      body: JSON.stringify({
        token: AGENTSID_AGENT_TOKEN,
        tool: toolName,
        params: params || {},
      }),
    });

    if (!res.ok) {
      console.error(\`[AgentsID] HTTP \${res.status} — failing closed\`);
      return { allowed: false, reason: \`AgentsID returned \${res.status}\` };
    }

    const data = await res.json();
    if (!data.valid) {
      return { allowed: false, reason: data.reason || 'Invalid request' };
    }

    const perm = data.permission || {};
    console.error(\`[AgentsID] \${toolName}: \${perm.allowed ? 'ALLOWED' : 'DENIED'}\`);
    return {
      allowed: perm.allowed || false,
      reason: perm.reason || 'Unknown',
    };
  } catch (err) {
    console.error(\`[AgentsID] Network error: \${err.message}\`);
    return { allowed: false, reason: 'AgentsID unreachable — failing closed' };
  }
}

// ---------------------------------------------------------------------------
// Helper: wrap a tool handler with permission check
// ---------------------------------------------------------------------------
function blocked(reason) {
  return { content: [{ type: 'text', text: \`BLOCKED: \${reason}\` }] };
}

// ---------------------------------------------------------------------------
// Server & tools
// ---------------------------------------------------------------------------
const server = new McpServer({ name: 'protected-notes', version: '1.0.0' });

server.tool(
  'search_notes',
  'Search notes by keyword',
  { query: z.string() },
  async ({ query }) => {
    const check = await validateToolCall('search_notes', { query });
    if (!check.allowed) return blocked(check.reason);

    const found = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase()),
    );
    return {
      content: [
        { type: 'text', text: found.map((n) => \`[\${n.id}] \${n.title}\`).join('\\n') || 'No results' },
      ],
    };
  },
);

server.tool(
  'save_note',
  'Save a new note',
  { title: z.string(), content: z.string() },
  async ({ title, content }) => {
    const check = await validateToolCall('save_note', { title });
    if (!check.allowed) return blocked(check.reason);

    const note = { id: nextId++, title, content };
    notes.push(note);
    return { content: [{ type: 'text', text: \`Saved: [\${note.id}] \${note.title}\` }] };
  },
);

server.tool(
  'list_notes',
  'List all notes',
  {},
  async () => {
    const check = await validateToolCall('list_notes');
    if (!check.allowed) return blocked(check.reason);

    const text = notes.map((n) => \`[\${n.id}] \${n.title}: \${n.content}\`).join('\\n');
    return { content: [{ type: 'text', text }] };
  },
);

server.tool(
  'delete_note',
  'Delete a note by ID',
  { id: z.number() },
  async ({ id }) => {
    const check = await validateToolCall('delete_note', { id });
    if (!check.allowed) return blocked(check.reason);

    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return { content: [{ type: 'text', text: 'Note not found' }] };
    notes.splice(idx, 1);
    return { content: [{ type: 'text', text: \`Deleted note \${id}\` }] };
  },
);

server.tool(
  'admin_reset',
  'Reset all data — DANGEROUS',
  {},
  async () => {
    const check = await validateToolCall('admin_reset');
    if (!check.allowed) return blocked(check.reason);

    notes.length = 0;
    nextId = 1;
    return { content: [{ type: 'text', text: 'All data wiped' }] };
  },
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[Server] Protected notes server running with AgentsID');`,
          },
          {
            label: "Python (server.py)",
            language: "python",
            code: `"""
Protected Notes MCP Server

A complete MCP server with AgentsID permission checks on every tool call.
Run: AGENTSID_PROJECT_KEY=aid_proj_... AGENTSID_AGENT_TOKEN=at_... python server.py
"""
import os
import json
import urllib.request
import urllib.error
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
AGENTSID_PROJECT_KEY = os.environ.get("AGENTSID_PROJECT_KEY", "")
AGENTSID_AGENT_TOKEN = os.environ.get("AGENTSID_AGENT_TOKEN", "")
AGENTSID_URL = os.environ.get("AGENTSID_URL", "https://agentsid.dev")

# ---------------------------------------------------------------------------
# In-memory data store
# ---------------------------------------------------------------------------
notes: list[dict] = [
    {"id": 1, "title": "Welcome", "content": "This server is protected by AgentsID!"},
    {"id": 2, "title": "Setup", "content": "Permissions are enforced on every tool call."},
]
next_id = 3

# ---------------------------------------------------------------------------
# AgentsID validation middleware
# ---------------------------------------------------------------------------
def validate_tool_call(tool_name: str, params: dict | None = None) -> dict:
    if not AGENTSID_PROJECT_KEY or not AGENTSID_AGENT_TOKEN:
        print("[AgentsID] Missing credentials — running WITHOUT protection", flush=True)
        return {"allowed": True, "reason": "No AgentsID configured"}

    payload = json.dumps({
        "token": AGENTSID_AGENT_TOKEN,
        "tool": tool_name,
        "params": params or {},
    }).encode()

    req = urllib.request.Request(
        f"{AGENTSID_URL}/api/v1/validate",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {AGENTSID_PROJECT_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
    except (urllib.error.URLError, OSError) as exc:
        print(f"[AgentsID] Network error: {exc}", flush=True)
        return {"allowed": False, "reason": "AgentsID unreachable — failing closed"}

    if not data.get("valid"):
        return {"allowed": False, "reason": data.get("reason", "Invalid request")}

    perm = data.get("permission", {})
    allowed = perm.get("allowed", False)
    reason = perm.get("reason", "Unknown")
    status = "ALLOWED" if allowed else "DENIED"
    print(f"[AgentsID] {tool_name}: {status}", flush=True)
    return {"allowed": allowed, "reason": reason}


def blocked(reason: str) -> list[TextContent]:
    return [TextContent(type="text", text=f"BLOCKED: {reason}")]

# ---------------------------------------------------------------------------
# Server & tools
# ---------------------------------------------------------------------------
app = Server("protected-notes")


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="search_notes",
            description="Search notes by keyword",
            inputSchema={
                "type": "object",
                "properties": {"query": {"type": "string"}},
                "required": ["query"],
            },
        ),
        Tool(
            name="save_note",
            description="Save a new note",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                },
                "required": ["title", "content"],
            },
        ),
        Tool(
            name="list_notes",
            description="List all notes",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="delete_note",
            description="Delete a note by ID",
            inputSchema={
                "type": "object",
                "properties": {"id": {"type": "integer"}},
                "required": ["id"],
            },
        ),
        Tool(
            name="admin_reset",
            description="Reset all data — DANGEROUS",
            inputSchema={"type": "object", "properties": {}},
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    global next_id

    check = validate_tool_call(name, arguments)
    if not check["allowed"]:
        return blocked(check["reason"])

    if name == "search_notes":
        query = arguments["query"].lower()
        found = [
            n for n in notes
            if query in n["title"].lower() or query in n["content"].lower()
        ]
        text = "\\n".join(f"[{n['id']}] {n['title']}" for n in found) or "No results"
        return [TextContent(type="text", text=text)]

    if name == "save_note":
        note = {"id": next_id, "title": arguments["title"], "content": arguments["content"]}
        next_id += 1
        notes.append(note)
        return [TextContent(type="text", text=f"Saved: [{note['id']}] {note['title']}")]

    if name == "list_notes":
        text = "\\n".join(f"[{n['id']}] {n['title']}: {n['content']}" for n in notes)
        return [TextContent(type="text", text=text)]

    if name == "delete_note":
        target_id = arguments["id"]
        idx = next((i for i, n in enumerate(notes) if n["id"] == target_id), None)
        if idx is None:
            return [TextContent(type="text", text="Note not found")]
        notes.pop(idx)
        return [TextContent(type="text", text=f"Deleted note {target_id}")]

    if name == "admin_reset":
        notes.clear()
        next_id = 1
        return [TextContent(type="text", text="All data wiped")]

    return [TextContent(type="text", text=f"Unknown tool: {name}")]


# ---------------------------------------------------------------------------
# Start
# ---------------------------------------------------------------------------
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    print("[Server] Protected notes server running with AgentsID", flush=True)
    asyncio.run(main())`,
          },
        ]}
      />

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Step 10: What to try next</h3>
      <ul className="text-muted-foreground list-disc ml-6 mb-3 leading-relaxed">
        <li>Change the permissions on the dashboard and re-test without restarting your server</li>
        <li>Add <InlineCode>requires_approval: true</InlineCode> to a permission and see the approval flow</li>
        <li>Add rate limits to prevent an agent from spamming a tool</li>
        <li>Add more tools to your server and set up wildcard permissions</li>
      </ul>
    </section>
  );
}

function AddGuardrailsSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="add-guardrails">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Add Guardrails to an Existing Server
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Already have an MCP server? You can add AgentsID protection in about 5 minutes. You don't need to rewrite anything -- just add one function and three lines per tool.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Before: Your existing tool</h3>
      <CodeBlock>{`server.tool('deploy_service', 'Deploy a service', { name: z.string() },
  async ({ name }) => {
    // Deploys immediately — no checks, no logging
    await deploy(name);
    return { content: [{ type: 'text', text: \`Deployed \${name}\` }] };
  }
);`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">After: With AgentsID protection</h3>
      <CodeBlock>{`server.tool('deploy_service', 'Deploy a service', { name: z.string() },
  async ({ name }) => {
    // Three new lines — that's it
    const check = await validateToolCall('deploy_service', { name });
    if (!check.allowed)
      return { content: [{ type: 'text', text: \`BLOCKED: \${check.reason}\` }] };

    // Your existing code — unchanged
    await deploy(name);
    return { content: [{ type: 'text', text: \`Deployed \${name}\` }] };
  }
);`}</CodeBlock>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">The steps</h3>
      <ol className="text-muted-foreground list-decimal ml-6 mb-3 leading-relaxed">
        <li className="mb-1.5">Copy the <InlineCode>validateToolCall</InlineCode> function from the <a href="#build-protected-server" className="text-primary hover:underline">Build a Protected MCP Server</a> tutorial into your project</li>
        <li className="mb-1.5">Import it at the top of your server file</li>
        <li className="mb-1.5">Add the three-line check at the start of each tool handler</li>
        <li className="mb-1.5">Set the <InlineCode>AGENTSID_PROJECT_KEY</InlineCode> and <InlineCode>AGENTSID_AGENT_TOKEN</InlineCode> environment variables</li>
        <li className="mb-1.5">Register your agent with the appropriate permissions</li>
      </ol>

      <Callout title="Gradual rollout" variant="info">
        <p>You don't have to add AgentsID to every tool at once. Start with the dangerous ones (deploy, delete, admin) and add more as you go. Tools without the check will continue to work as before.</p>
      </Callout>
    </section>
  );
}

function WhyGuardrailsSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="why-guardrails">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Why Agents Need Guardrails
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        This isn't a technical walkthrough. This is the "why" behind everything on this page.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">The problem</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Your AI agent can call any tool you give it access to. If it has a "delete database" tool, it can use it. If it has a "send email" tool, it can blast your entire customer list. If it has a "deploy to production" tool, it can ship untested code at 3am.
      </p>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Most of the time, the agent does the right thing. But "most of the time" isn't good enough when the downside is deleting production data or emailing your CEO something embarrassing.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">What can go wrong</h3>
      <ul className="text-muted-foreground list-disc ml-6 mb-5 leading-relaxed">
        <li className="mb-1.5"><strong className="text-foreground">Accidental deletion</strong> -- "Clean up the old files" gets interpreted as "delete everything"</li>
        <li className="mb-1.5"><strong className="text-foreground">Prompt injection</strong> -- A malicious document tricks the agent into calling dangerous tools</li>
        <li className="mb-1.5"><strong className="text-foreground">Scope creep</strong> -- The agent decides to "help" by doing something you didn't ask for</li>
        <li className="mb-1.5"><strong className="text-foreground">Hallucinated actions</strong> -- The agent thinks it should deploy code because the conversation mentioned deployment</li>
        <li className="mb-1.5"><strong className="text-foreground">No audit trail</strong> -- Something went wrong, but you have no idea what the agent actually did</li>
      </ul>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">What guardrails do</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Guardrails are rules about what an agent is allowed to do. They sit between the agent and the tools, checking every action before it happens:
      </p>
      <Flowchart>{`  Agent wants to call a tool
          |
          v
  AgentsID checks permissions
        /    \\
       v      v
  ALLOWED    DENIED
  Tool runs   Agent gets
  normally    "blocked" message
       \\      /
        v    v
  Event logged to audit trail`}</Flowchart>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">The analogy</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Think of it like giving a new employee a badge. The badge doesn't stop them from walking around the building -- but it only opens the doors they need. They can get to their desk, the kitchen, and the meeting rooms. They can't get into the server room, the executive suite, or the safe.
      </p>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        AgentsID is the badge system for your AI agents. You decide which doors (tools) each agent can open, and every door-open gets logged.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">What AgentsID provides</h3>
      <ul className="text-muted-foreground list-disc ml-6 mb-3 leading-relaxed">
        <li className="mb-1.5"><strong className="text-foreground">Permission rules</strong> -- Define exactly which tools each agent can use</li>
        <li className="mb-1.5"><strong className="text-foreground">Wildcard matching</strong> -- Allow <InlineCode>read_*</InlineCode> but deny <InlineCode>delete_*</InlineCode></li>
        <li className="mb-1.5"><strong className="text-foreground">Approval workflows</strong> -- Some actions need a human to say "yes" first</li>
        <li className="mb-1.5"><strong className="text-foreground">Rate limits</strong> -- Prevent agents from spamming tools</li>
        <li className="mb-1.5"><strong className="text-foreground">Audit trail</strong> -- Cryptographically-linked log of every action</li>
        <li className="mb-1.5"><strong className="text-foreground">Real-time dashboard</strong> -- See what your agents are doing right now</li>
      </ul>
    </section>
  );
}

function HowPermissionsWorkSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="how-permissions-work">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        How Permissions Work
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Permissions in AgentsID are deny-first. If you don't explicitly allow something, it's blocked. Here's the full picture.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">The evaluation flow</h3>
      <Flowchart>{`  Tool call: "delete_user" with params {id: 42}
              |
              v
  1. Check DENY rules first
     Does any deny rule match?
        /          \\
       v            v
    YES -> DENIED     No deny match
    Stop here.          |
                        v
           2. Check ALLOW rules
           Does any allow rule match?
              /          \\
             v            v
        YES -> check     No match
        conditions    -> DEFAULT DENY
             |
             v
    3. Check conditions
    Rate limit OK? Time OK?
    Approval required?
        /       \\
       v         v
  ALLOWED    DENIED`}</Flowchart>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Wildcards</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Use <InlineCode>*</InlineCode> to match multiple tools at once:
      </p>
      <GuideTable
        headers={["Pattern", "Matches", "Doesn't match"]}
        rows={[
          [<InlineCode>search_*</InlineCode>, "search_docs, search_code, search_users", "find_docs, delete_search"],
          [<InlineCode>*_file</InlineCode>, "read_file, write_file, delete_file", "read_files, file_read"],
          [<InlineCode>*</InlineCode>, "Everything", "Nothing"],
          [<InlineCode>read_*</InlineCode>, "read_file, read_config, read_log", "write_file, read"],
        ]}
      />

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Conditions</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Permissions can have conditions that must be true for the rule to apply:
      </p>

      <h4 className="text-base font-semibold mt-5 mb-2 text-foreground">Parameter conditions</h4>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Only allow a tool when specific parameters match:
      </p>
      <CodeBlock>{`{
  "tool_pattern": "read_customer",
  "action": "allow",
  "conditions": {
    "params": { "customer_id": "cust_123" }
  }
}`}</CodeBlock>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        This means: "Allow <InlineCode>read_customer</InlineCode>, but only for customer <InlineCode>cust_123</InlineCode>."
      </p>

      <h4 className="text-base font-semibold mt-5 mb-2 text-foreground">Time-based conditions</h4>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Restrict tools to business hours:
      </p>
      <CodeBlock>{`{
  "tool_pattern": "deploy_*",
  "action": "allow",
  "conditions": {
    "time_window": { "start": "09:00", "end": "17:00", "timezone": "America/New_York" }
  }
}`}</CodeBlock>

      <h4 className="text-base font-semibold mt-5 mb-2 text-foreground">Rate limits</h4>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Prevent agents from calling a tool too often:
      </p>
      <CodeBlock>{`{
  "tool_pattern": "send_email",
  "action": "allow",
  "conditions": {
    "rate_limit": { "max_calls": 100, "window": "1h" }
  }
}`}</CodeBlock>

      <h4 className="text-base font-semibold mt-5 mb-2 text-foreground">Approval required</h4>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Force a human to approve the action before it runs:
      </p>
      <CodeBlock>{`{
  "tool_pattern": "deploy_production",
  "action": "allow",
  "requires_approval": true
}`}</CodeBlock>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        When an agent tries to call this tool, AgentsID pauses the request and sends a notification. A human reviews the action, parameters, and context, then approves or denies it. The agent waits for the decision.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">Default deny</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        If a tool doesn't match any permission rule, it's automatically denied. This is the safest default. If you want to allow everything (not recommended), you'd need to explicitly add a wildcard allow rule.
      </p>
    </section>
  );
}

function AuditTrailSection() {
  return (
    <section className="scroll-mt-20 mb-14" id="audit-trail">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Understanding the Audit Trail
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Every tool call that goes through AgentsID gets logged. This isn't just a log file that you'll never look at -- it's a cryptographically-linked chain of events that proves exactly what happened.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">What gets recorded</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Every entry in the audit trail includes:
      </p>
      <GuideTable
        headers={["Field", "What it is", "Example"]}
        rows={[
          [<strong className="text-foreground">Agent</strong>, "Which agent made the call", "notes-agent"],
          [<strong className="text-foreground">Tool</strong>, "Which tool was requested", "delete_note"],
          [<strong className="text-foreground">Parameters</strong>, "What data was sent", "{id: 42}"],
          [<strong className="text-foreground">Result</strong>, "Was it allowed or denied", "DENIED"],
          [<strong className="text-foreground">Reason</strong>, "Why it was allowed/denied", "No matching allow rule"],
          [<strong className="text-foreground">Timestamp</strong>, "When it happened", "2026-03-26T14:32:01Z"],
          [<strong className="text-foreground">Hash</strong>, "Cryptographic link to previous entry", "a1b2c3d4..."],
        ]}
      />

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">The hash chain</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        Each audit entry contains a hash of the previous entry. This creates a chain where tampering with any single entry would break the chain from that point forward. If someone tries to quietly delete or modify an audit entry, the hash chain breaks and you'll know.
      </p>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Think of it like a receipt roll at a cash register. Each receipt has a sequential number. If someone tears one out, you can tell because the numbers skip. Except our version uses cryptographic hashes instead of sequential numbers, so it's mathematically impossible to forge.
      </p>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">How to use it</h3>
      <ul className="text-muted-foreground list-disc ml-6 mb-5 leading-relaxed">
        <li className="mb-1.5"><strong className="text-foreground">Debugging</strong> -- "The agent did something weird at 3pm." Go to the audit trail, find the 3pm entries, see exactly what tools were called and with what parameters.</li>
        <li className="mb-1.5"><strong className="text-foreground">Compliance</strong> -- Need to prove that your AI agent never accessed customer data it shouldn't have? The audit trail is your evidence.</li>
        <li className="mb-1.5"><strong className="text-foreground">Security review</strong> -- After an incident, review all denied calls. Multiple denied calls for the same dangerous tool might indicate a prompt injection attack.</li>
        <li className="mb-1.5"><strong className="text-foreground">Performance monitoring</strong> -- See which tools are called most often and how they're being used.</li>
      </ul>

      <h3 className="text-xl font-semibold mt-8 mb-3 text-foreground">The dashboard shows it in real-time</h3>
      <p className="text-muted-foreground mb-3 leading-relaxed">
        The AgentsID dashboard has a live audit feed. Events appear as they happen. You can filter by agent, tool, result (allowed/denied), and time range.
      </p>
      <Screenshot src="/screenshots/dashboard-audit-feed.png" alt="Live audit feed with filters showing allowed and denied events" />
    </section>
  );
}

function TemplatesIntroSection() {
  return (
    <section className="scroll-mt-20 mb-8" id="templates">
      <h2 className="text-3xl font-bold tracking-tight mb-2 pb-3 border-b border-border text-foreground">
        Templates
      </h2>
      <p className="text-muted-foreground mb-5 leading-relaxed">
        Ready-to-use permission sets for common agent types. Copy the JSON, paste it into your agent registration, and you're done.
      </p>
    </section>
  );
}

function TemplateResearchSection() {
  return (
    <section className="scroll-mt-20 mb-4" id="template-research">
      <TemplateCard
        icon="&#128270;"
        iconBg="bg-green-500/10 text-green-600"
        title="Safe Research Agent"
      >
        <p className="text-muted-foreground mb-5 text-[0.95rem]">
          An agent that can read and search, but can never write, delete, or deploy anything. Perfect for research assistants, documentation crawlers, and data analysis agents.
        </p>

        <TemplateSectionLabel>Permission Rules</TemplateSectionLabel>
        <CodeBlock>{`[
  { "tool_pattern": "search_*",  "action": "allow" },
  { "tool_pattern": "read_*",    "action": "allow" },
  { "tool_pattern": "list_*",    "action": "allow" },
  { "tool_pattern": "write_*",   "action": "deny" },
  { "tool_pattern": "delete_*",  "action": "deny" },
  { "tool_pattern": "deploy_*",  "action": "deny" }
]`}</CodeBlock>

        <TemplateSectionLabel>What's allowed and denied</TemplateSectionLabel>
        <GuideTable
          headers={["Action", "Status"]}
          rows={[
            ["search_docs, search_code, search_users", <StatusBadge status="allowed" />],
            ["read_file, read_config, read_log", <StatusBadge status="allowed" />],
            ["list_files, list_users, list_repos", <StatusBadge status="allowed" />],
            ["write_file, write_config", <StatusBadge status="denied" />],
            ["delete_file, delete_user", <StatusBadge status="denied" />],
            ["deploy_staging, deploy_production", <StatusBadge status="denied" />],
          ]}
        />

        <TemplateSectionLabel>Apply with curl</TemplateSectionLabel>
        <CodeBlock>{`$ curl -X POST https://agentsid.dev/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "research-agent",
    "permissions": [
      {"tool_pattern": "search_*", "action": "allow"},
      {"tool_pattern": "read_*", "action": "allow"},
      {"tool_pattern": "list_*", "action": "allow"},
      {"tool_pattern": "write_*", "action": "deny"},
      {"tool_pattern": "delete_*", "action": "deny"},
      {"tool_pattern": "deploy_*", "action": "deny"}
    ]
  }'`}</CodeBlock>
      </TemplateCard>
    </section>
  );
}

function TemplateCodeSection() {
  return (
    <section className="scroll-mt-20 mb-4" id="template-code">
      <TemplateCard
        icon="&#128187;"
        iconBg="bg-blue-500/10 text-blue-600"
        title="Code Assistant"
      >
        <p className="text-muted-foreground mb-5 text-[0.95rem]">
          An agent that can read and search code freely, but writing files requires human approval. Execution and deployment are completely blocked. Great for pair programming agents.
        </p>

        <TemplateSectionLabel>Permission Rules</TemplateSectionLabel>
        <CodeBlock>{`[
  { "tool_pattern": "read_file",    "action": "allow" },
  { "tool_pattern": "search_code",  "action": "allow" },
  { "tool_pattern": "list_files",   "action": "allow" },
  { "tool_pattern": "write_file",   "action": "allow", "requires_approval": true },
  { "tool_pattern": "execute_*",   "action": "deny" },
  { "tool_pattern": "deploy_*",    "action": "deny" },
  { "tool_pattern": "delete_*",    "action": "deny" }
]`}</CodeBlock>

        <TemplateSectionLabel>What's allowed and denied</TemplateSectionLabel>
        <GuideTable
          headers={["Action", "Status"]}
          rows={[
            ["read_file", <StatusBadge status="allowed" />],
            ["search_code", <StatusBadge status="allowed" />],
            ["list_files", <StatusBadge status="allowed" />],
            ["write_file", <StatusBadge status="approval" />],
            ["execute_command, execute_script", <StatusBadge status="denied" />],
            ["deploy_staging, deploy_production", <StatusBadge status="denied" />],
            ["delete_file, delete_branch", <StatusBadge status="denied" />],
          ]}
        />

        <TemplateSectionLabel>Apply with curl</TemplateSectionLabel>
        <CodeBlock>{`$ curl -X POST https://agentsid.dev/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "code-assistant",
    "permissions": [
      {"tool_pattern": "read_file", "action": "allow"},
      {"tool_pattern": "search_code", "action": "allow"},
      {"tool_pattern": "list_files", "action": "allow"},
      {"tool_pattern": "write_file", "action": "allow", "requires_approval": true},
      {"tool_pattern": "execute_*", "action": "deny"},
      {"tool_pattern": "deploy_*", "action": "deny"},
      {"tool_pattern": "delete_*", "action": "deny"}
    ]
  }'`}</CodeBlock>
      </TemplateCard>
    </section>
  );
}

function TemplateSupportSection() {
  return (
    <section className="scroll-mt-20 mb-4" id="template-support">
      <TemplateCard
        icon="&#128172;"
        iconBg="bg-amber-500/10 text-amber-600"
        title="Customer Support Bot"
      >
        <p className="text-muted-foreground mb-5 text-[0.95rem]">
          An agent that can read tickets, search the knowledge base, and respond to customers, but can never touch billing, access admin panels, or delete anything.
        </p>

        <TemplateSectionLabel>Permission Rules</TemplateSectionLabel>
        <CodeBlock>{`[
  { "tool_pattern": "read_ticket",      "action": "allow" },
  { "tool_pattern": "search_kb",        "action": "allow" },
  { "tool_pattern": "respond_ticket",   "action": "allow" },
  { "tool_pattern": "escalate_ticket",  "action": "allow" },
  { "tool_pattern": "delete_*",         "action": "deny" },
  { "tool_pattern": "modify_billing",   "action": "deny" },
  { "tool_pattern": "access_admin",     "action": "deny" }
]`}</CodeBlock>

        <TemplateSectionLabel>What's allowed and denied</TemplateSectionLabel>
        <GuideTable
          headers={["Action", "Status"]}
          rows={[
            ["read_ticket", <StatusBadge status="allowed" />],
            ["search_kb (knowledge base)", <StatusBadge status="allowed" />],
            ["respond_ticket", <StatusBadge status="allowed" />],
            ["escalate_ticket", <StatusBadge status="allowed" />],
            ["delete_ticket, delete_customer", <StatusBadge status="denied" />],
            ["modify_billing", <StatusBadge status="denied" />],
            ["access_admin", <StatusBadge status="denied" />],
          ]}
        />

        <TemplateSectionLabel>Apply with curl</TemplateSectionLabel>
        <CodeBlock>{`$ curl -X POST https://agentsid.dev/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "support-bot",
    "permissions": [
      {"tool_pattern": "read_ticket", "action": "allow"},
      {"tool_pattern": "search_kb", "action": "allow"},
      {"tool_pattern": "respond_ticket", "action": "allow"},
      {"tool_pattern": "escalate_ticket", "action": "allow"},
      {"tool_pattern": "delete_*", "action": "deny"},
      {"tool_pattern": "modify_billing", "action": "deny"},
      {"tool_pattern": "access_admin", "action": "deny"}
    ]
  }'`}</CodeBlock>
      </TemplateCard>
    </section>
  );
}

function TemplateCautiousSection() {
  return (
    <section className="scroll-mt-20 mb-4" id="template-cautious">
      <TemplateCard
        icon="&#128274;"
        iconBg="bg-primary/10 text-primary"
        title="Cautious Agent (Approval Required)"
      >
        <p className="text-muted-foreground mb-5 text-[0.95rem]">
          The most restrictive template. Every single tool call requires human approval before it runs. Nothing happens automatically. Use this for high-stakes environments where you want full control over every action.
        </p>

        <TemplateSectionLabel>Permission Rules</TemplateSectionLabel>
        <CodeBlock>{`[
  { "tool_pattern": "*", "action": "allow", "requires_approval": true }
]`}</CodeBlock>

        <TemplateSectionLabel>What's allowed and denied</TemplateSectionLabel>
        <GuideTable
          headers={["Action", "Status"]}
          rows={[
            ["Any tool call", <StatusBadge status="approval" />],
          ]}
        />
        <p className="text-muted-foreground mb-5 leading-relaxed">
          Every tool call pauses and waits for a human to approve or deny it through the dashboard or webhook notification. This is the "training wheels" template -- great for when you're first getting started and want to see exactly what your agent tries to do before letting it do anything.
        </p>

        <TemplateSectionLabel>Apply with curl</TemplateSectionLabel>
        <CodeBlock>{`$ curl -X POST https://agentsid.dev/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_PROJECT_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "cautious-agent",
    "permissions": [
      {"tool_pattern": "*", "action": "allow", "requires_approval": true}
    ]
  }'`}</CodeBlock>
      </TemplateCard>
    </section>
  );
}

export { Guides };
