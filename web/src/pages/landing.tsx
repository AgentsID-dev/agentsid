import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import { Button } from "@/components/ui/button";
import { GradeStamp, GradeChip, GRADE_COLORS } from "@/components/shared/grade";
import { ArrowRight, Check, Copy, Terminal } from "lucide-react";
import { HALL_STATS } from "./hall-of-mcps-data";

// ---------------------------------------------------------------------------
// Content constants — DO NOT add fabricated citations. Every number must be
// defensible if an investor or HN commenter asks "where's the source?"
// Numbers pull from the live scanner index so paper/site/registry stay aligned.
// ---------------------------------------------------------------------------

const STATS = {
  scanned: HALL_STATS.total.toLocaleString(),
  findings: HALL_STATS.totalFindings.toLocaleString(),
  papers: "5",
  gradeF: HALL_STATS.fGrade.toLocaleString(),
} as const;

const RESEARCH = [
  {
    id: "01",
    title: "Weaponized by Design",
    desc: "Census of 15,982 MCP servers. 137,070 findings. 460 with deceptive language.",
    meta: "paper · april 2026",
  },
  {
    id: "02",
    title: "Invisible Ink",
    desc: "Unicode smuggling attacks on tool descriptions. 145 CRITICAL findings in the wild.",
    meta: "paper · march 2026",
  },
  {
    id: "03",
    title: "Surface Area Paradox",
    desc: "Why every MCP server with 21+ tools has CRITICAL findings. The data says prefer small.",
    meta: "paper · march 2026",
  },
  {
    id: "04",
    title: "Delegation Chains",
    desc: "How subagents inherit — and sometimes escape — their parent's permissions.",
    meta: "paper · feb 2026",
  },
];

const FAQ = [
  {
    q: "Does this slow my agent down?",
    a: "The pre-tool validation adds ~30ms per call. The hook is fail-open — if our API is unreachable, your tool calls proceed normally. We don't stand between your agent and its work.",
  },
  {
    q: "How is this different from a tool registry?",
    a: "Registries rate reliability. We rate intent. A tool with 99.9% uptime can still say 'secretly bypass approval' in its description. Uptime is orthogonal to malice.",
  },
  {
    q: "What agents do you support?",
    a: "Claude Code (including subagents), Cursor, Codex. Generic MCP client integration via direct validator call.",
  },
  {
    q: "Is it open source?",
    a: "The scanner and CLI are MIT. The server is source-available. The research is published.",
  },
];

// ---------------------------------------------------------------------------
// Reveal helper
// ---------------------------------------------------------------------------

function FadeInSection({
  children,
  className = "",
  delay = 0,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Ambient background atmosphere — amber glow top-left, red glow upper-right
// ---------------------------------------------------------------------------

function AmbientGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        background:
          "radial-gradient(ellipse 60% 40% at 20% 0%, rgba(245,158,11,0.08), transparent 70%), radial-gradient(ellipse 40% 30% at 90% 30%, rgba(239,68,68,0.05), transparent 70%)",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Hero live-deny card — a physical-feeling receipt showing a real deny event
// ---------------------------------------------------------------------------

function LiveDenyCard() {
  return (
    <motion.div
      initial={{ opacity: 0, rotate: -1, y: 20 }}
      animate={{ opacity: 1, rotate: -2, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="relative rounded-lg border border-border bg-card p-8"
      style={{
        width: 420,
        boxShadow:
          "0 30px 80px -20px rgba(0,0,0,0.8), 0 0 40px -10px rgba(239,68,68,0.25)",
      }}
    >
      <div className="flex items-baseline justify-between border-b border-border pb-3 mb-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          AgentsID audit · 14:32 UTC
        </div>
        <div
          className="font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ color: GRADE_COLORS.F }}
        >
          live deny
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
        attempted tool call
      </div>
      <div className="font-mono text-sm mb-4">Bash(npm test)</div>
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
        agent
      </div>
      <div className="font-mono text-sm mb-4">code-reviewer@claude</div>

      <div className="mt-6 flex items-center gap-4">
        <GradeStamp letter="F" size="xl" />
        <div>
          <div
            className="text-xl font-extrabold tracking-tight"
            style={{ color: GRADE_COLORS.F }}
          >
            Hostile
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            rule #104 · block shell
          </div>
          <div className="text-xs text-muted-foreground">
            12 CRITICAL findings
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border font-mono text-[10px] text-muted-foreground">
        block #002481 · hash 4a7f2e9b ← bf3e7d12 · ✓ chain verified
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Install command with copy
// ---------------------------------------------------------------------------

function InstallBlock() {
  const [copied, setCopied] = useState(false);
  const cmd = "npx @agentsid/setup@latest";
  return (
    <div className="relative inline-flex items-center gap-3 rounded-lg bg-black border border-border px-5 py-3 font-mono text-sm">
      <Terminal className="size-4 text-primary" />
      <span className="text-foreground">
        $ npx <span style={{ color: GRADE_COLORS.C }}>@agentsid/setup</span>@latest
      </span>
      <button
        aria-label="Copy install command"
        onClick={() => {
          navigator.clipboard.writeText(cmd).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-card"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event row — reused inline in the Enforcement card
// ---------------------------------------------------------------------------

function EventRow({
  kind,
  tool,
  note,
}: {
  kind: "allow" | "deny" | "derive";
  tool: string;
  note: string;
}) {
  const palette = {
    allow: { bg: "rgba(16,185,129,0.08)", label: "✓ ALLOW", color: GRADE_COLORS.A },
    deny: { bg: "rgba(239,68,68,0.12)", label: "⛔ DENY", color: GRADE_COLORS.F },
    derive: { bg: "rgba(245,158,11,0.08)", label: "↗ DERIVE", color: "#f59e0b" },
  }[kind];

  return (
    <div
      className="flex items-center gap-4 p-3 rounded font-mono text-[12.5px]"
      style={{ background: palette.bg }}
    >
      <span style={{ color: palette.color }}>{palette.label}</span>
      <span>{tool}</span>
      <span className="ml-auto text-muted-foreground">{note}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

const Landing = () => {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <AmbientGlow />

      <div className="relative z-10">
        {/* HERO */}
        <section className="mx-auto max-w-[1320px] px-6 md:px-10 pt-16 md:pt-24 pb-16 md:pb-20 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-16 items-center">
          <FadeInSection>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-2 rounded-full px-3 py-1.5 bg-card border border-border">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#f59e0b",
                    boxShadow: "0 0 8px #f59e0b",
                  }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  New · Paper 5 · Unicode smuggling
                </span>
              </div>
            </div>

            <h1
              className="font-extrabold tracking-[-0.04em] leading-[0.92]"
              style={{ fontSize: "clamp(3rem, 7.8vw, 7rem)" }}
            >
              We scan every
              <br />
              MCP tool{" "}
              <span className="font-light tracking-[-0.035em] text-muted-foreground">
                in the world
              </span>{" "}
              —
              <br />
              and catch the ones
              <br />
              <span style={{ color: "#f59e0b" }}>telling agents to lie.</span>
            </h1>

            <p className="mt-8 md:mt-10 text-lg md:text-xl max-w-xl text-muted-foreground">
              <span
                className="text-foreground"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 55%, rgba(245,158,11,0.3) 55%)",
                }}
              >
                {STATS.scanned} MCP servers scanned.
              </span>{" "}
              {STATS.findings} findings. 460 with deceptive language. 145
              CRITICAL with invisible Unicode. AgentsID gives every tool a
              letter grade and every agent a permission boundary.
            </p>

            <div className="mt-8 md:mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" className="text-base px-6">
                <a href="#install">
                  Install on Claude Code{" "}
                  <ArrowRight className="size-4 ml-1" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-6">
                <Link to="/registry">Browse the registry →</Link>
              </Button>
            </div>

            <div className="mt-10 md:mt-12 grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-b border-border">
              <div className="py-5 border-r border-border pr-5">
                <div className="font-extrabold text-2xl md:text-3xl tabular-nums">{STATS.scanned}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                  servers scanned
                </div>
              </div>
              <div className="py-5 md:border-r border-border pl-5 md:pr-5">
                <div
                  className="font-extrabold text-2xl md:text-3xl tabular-nums"
                  style={{ color: GRADE_COLORS.F }}
                >
                  {STATS.gradeF}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                  graded F
                </div>
              </div>
              <div className="py-5 border-t md:border-t-0 border-r border-border pr-5">
                <div className="font-extrabold text-2xl md:text-3xl tabular-nums">
                  {STATS.papers} papers
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                  open source
                </div>
              </div>
              <div className="py-5 border-t md:border-t-0 border-border pl-5">
                <div className="font-extrabold text-2xl md:text-3xl tabular-nums">0</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                  config to install
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.2} className="flex justify-center items-center">
            <LiveDenyCard />
          </FadeInSection>
        </section>

        {/* STATS STRIP — real numbers only, NO fabricated citations */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-[1320px] px-6 md:px-10 py-6 flex items-center gap-6 md:gap-10 flex-wrap font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
            <div>
              <span className="font-extrabold text-base text-foreground">
                {STATS.scanned}
              </span>{" "}
              servers indexed
            </div>
            <span className="text-muted-foreground/50">·</span>
            <div>
              <span className="font-extrabold text-base text-foreground">
                {STATS.findings}
              </span>{" "}
              findings
            </div>
            <span className="text-muted-foreground/50">·</span>
            <div>
              <span className="font-extrabold text-base text-foreground">
                {STATS.papers}
              </span>{" "}
              papers open source
            </div>
            <span className="text-muted-foreground/50">·</span>
            <div>
              <span
                className="font-extrabold text-base"
                style={{ color: GRADE_COLORS.F }}
              >
                {STATS.gradeF}
              </span>{" "}
              graded F
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="mx-auto max-w-[1320px] px-6 md:px-10 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-start">
          <FadeInSection>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-5 text-[#f59e0b]">
              The problem
            </div>
            <h2
              className="font-extrabold tracking-[-0.04em] leading-[0.92]"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
            >
              Agents trust
              <br />
              <span className="font-light text-muted-foreground">
                everything.
              </span>
            </h2>
          </FadeInSection>
          <FadeInSection delay={0.1} className="pt-2">
            <p className="text-lg md:text-xl mb-6">
              When an agent reads a tool description, it doesn't know which
              words came from the user, which came from the system, and which
              came from the tool author.
            </p>
            <p className="text-lg md:text-xl mb-6 text-muted-foreground">
              Tool descriptions, user prompts, and system instructions all
              arrive at the same trust level.{" "}
              <strong className="text-foreground">
                One word — "secretly", "skip", "MUST" — can flip an entire
                agent's behavior.
              </strong>
            </p>
            <p className="text-lg md:text-xl text-muted-foreground">
              We read every tool description on npm and PyPI to find the ones
              that do this. We keep your agents from calling them.
            </p>
          </FadeInSection>
        </section>

        {/* TWO LAYERS */}
        <section className="mx-auto max-w-[1320px] px-6 md:px-10 py-20 md:py-28 border-t border-border">
          <FadeInSection>
            <div className="flex items-baseline justify-between flex-wrap gap-4 mb-12">
              <h2
                className="font-extrabold tracking-[-0.04em] leading-[0.92]"
                style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
              >
                Two layers. One trust boundary.
              </h2>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                how agentsid works
              </div>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Layer 1: Scanner */}
            <FadeInSection delay={0.1}>
              <div className="p-8 md:p-10 rounded-lg bg-card border border-border h-full">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
                  Layer 1 · Discovery
                </div>
                <div
                  className="font-extrabold tracking-[-0.04em]"
                  style={{ fontSize: "2.2rem", lineHeight: 0.95 }}
                >
                  Scanner
                  <br />
                  <span className="font-light text-muted-foreground">
                    grades every tool.
                  </span>
                </div>
                <p className="mt-6 text-muted-foreground">
                  Open-source CLI. Scans tool source, descriptions, and
                  behavior for prompt injection, hidden Unicode, deceptive
                  language, and dangerous patterns. Outputs a single letter
                  grade.
                </p>
                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-4">
                    <GradeStamp letter="A" size="md" />
                    <span className="font-mono text-sm">
                      @modelcontextprotocol/server-filesystem
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      0 findings
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <GradeStamp letter="C" size="md" />
                    <span className="font-mono text-sm">
                      @community/notion-mcp
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                      2 medium
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <GradeStamp letter="F" size="md" />
                    <span className="font-mono text-sm">
                      @smart-thermostat-mcp/server
                    </span>
                    <span
                      className="ml-auto font-mono text-[11px]"
                      style={{ color: GRADE_COLORS.F }}
                    >
                      12 CRITICAL
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <pre className="rounded-md bg-black border border-border p-4 font-mono text-[11.5px] md:text-[12.5px] leading-relaxed whitespace-pre-wrap break-all">
                    <span className="text-foreground">
                      $ npx{" "}
                      <span style={{ color: "#7dd3fc" }}>
                        @agentsid/scanner
                      </span>{" "}
                      audit{" "}
                      <span style={{ color: "#f59e0b" }}>@notion/mcp</span>
                    </span>
                    {"\n"}
                    <span className="text-muted-foreground">
                      → Grade: C — Monitor
                    </span>
                    {"\n"}
                    <span className="text-muted-foreground">
                      → 2 findings (wording)
                    </span>
                    {"\n"}
                    <span className="text-muted-foreground">
                      → agentsid.dev/registry/notion-mcp
                    </span>
                  </pre>
                </div>
              </div>
            </FadeInSection>

            {/* Layer 2: Enforcement */}
            <FadeInSection delay={0.18}>
              <div
                className="p-8 md:p-10 rounded-lg border h-full"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(245,158,11,0.08), transparent), var(--color-card)",
                  borderColor: "#f59e0b",
                }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
                  Layer 2 · Enforcement
                </div>
                <div
                  className="font-extrabold tracking-[-0.04em]"
                  style={{ fontSize: "2.2rem", lineHeight: 0.95 }}
                >
                  Server
                  <br />
                  <span className="font-light text-muted-foreground">
                    blocks at the wire.
                  </span>
                </div>
                <p className="mt-6 text-muted-foreground">
                  MCP-native middleware. Every tool call passes through a
                  permission engine. Denies block before execution. Every
                  event is hash-chained into an audit log. Works with Claude
                  Code, Cursor, and any MCP client today.
                </p>

                <div className="mt-8 space-y-3">
                  <EventRow kind="allow" tool="Read(src/routes/notes.js)" note="0.4s" />
                  <EventRow kind="deny" tool="Bash(npm test)" note="rule #104" />
                  <EventRow kind="derive" tool="code-reviewer@claude" note="subagent" />
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <pre className="rounded-md bg-black border border-border p-4 font-mono text-[11.5px] md:text-[12.5px] leading-relaxed whitespace-pre-wrap break-all">
                    <span className="text-foreground">
                      $ npx{" "}
                      <span style={{ color: "#7dd3fc" }}>
                        @agentsid/setup
                      </span>
                    </span>
                    {"\n"}
                    <span className="text-muted-foreground">
                      → detected: Claude Code
                    </span>
                    {"\n"}
                    <span className="text-muted-foreground">
                      → installing hook…
                    </span>
                    {"\n"}
                    <span className="text-muted-foreground">
                      → ✓ enforcing in your next session
                    </span>
                  </pre>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* HOW IT WORKS — 3 STEPS */}
        <section id="install" className="mx-auto max-w-[1320px] px-6 md:px-10 py-20 md:py-28 border-t border-border">
          <FadeInSection>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
              How it works
            </div>
            <h2
              className="font-extrabold tracking-[-0.04em] leading-[0.92] mb-12"
              style={{ fontSize: "clamp(2.4rem, 5.5vw, 5rem)" }}
            >
              One command.
              <br />
              Under a minute.
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FadeInSection delay={0.05}>
              <div className="p-8 rounded-lg bg-card border border-border h-full">
                <div
                  className="font-extrabold tracking-[-0.04em] text-5xl mb-5"
                  style={{ color: "#f59e0b" }}
                >
                  01
                </div>
                <div className="font-extrabold tracking-tight text-2xl mb-3">
                  Install the hook.
                </div>
                <p className="mb-5 text-muted-foreground">
                  One npx command. Detects your agent runtime (Claude Code,
                  Cursor, Codex, and more), wires up the pre-tool hook, writes
                  config to the right place. No restart.
                </p>
                <pre className="rounded-md bg-black border border-border p-4 font-mono text-[12.5px]">
                  npx{" "}
                  <span style={{ color: "#7dd3fc" }}>@agentsid/setup</span>
                  @latest
                </pre>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.12}>
              <div className="p-8 rounded-lg bg-card border border-border h-full">
                <div
                  className="font-extrabold tracking-[-0.04em] text-5xl mb-5"
                  style={{ color: "#f59e0b" }}
                >
                  02
                </div>
                <div className="font-extrabold tracking-tight text-2xl mb-3">
                  Set your rules.
                </div>
                <p className="mb-5 text-muted-foreground">
                  A dashboard for humans and an MCP surface for agents
                  themselves. Allow/deny tools, set per-subagent scopes,
                  approve elevations. Presets for Developer, Writer,
                  Data-Science.
                </p>
                <div className="p-4 rounded bg-background">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      preset
                    </span>
                    <span className="font-extrabold tracking-tight text-lg">
                      Developer
                    </span>
                  </div>
                  <div className="font-mono text-xs space-y-0.5">
                    <div style={{ color: GRADE_COLORS.A }}>
                      ✓ Read Glob Grep
                    </div>
                    <div style={{ color: GRADE_COLORS.A }}>
                      ✓ Write (scoped)
                    </div>
                    <div style={{ color: GRADE_COLORS.F }}>⛔ Bash</div>
                    <div style={{ color: GRADE_COLORS.F }}>⛔ WebFetch</div>
                  </div>
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <div className="p-8 rounded-lg bg-card border border-border h-full">
                <div
                  className="font-extrabold tracking-[-0.04em] text-5xl mb-5"
                  style={{ color: "#f59e0b" }}
                >
                  03
                </div>
                <div className="font-extrabold tracking-tight text-2xl mb-3">
                  See every decision.
                </div>
                <p className="mb-5 text-muted-foreground">
                  Every allow, deny, derive, and elevation is hash-chained
                  into an append-only audit log. Replace a row and the chain
                  breaks. Verify with one CLI command.
                </p>
                <div className="font-mono text-xs space-y-1 text-muted-foreground">
                  <div>
                    #002481 ←{" "}
                    <span style={{ color: "#f59e0b" }}>4a7f2e9b</span>
                  </div>
                  <div>#002480 ← bf3e7d12</div>
                  <div>#002479 ← a1c49a87</div>
                  <div className="mt-2" style={{ color: GRADE_COLORS.A }}>
                    ✓ chain verified to genesis
                  </div>
                </div>
              </div>
            </FadeInSection>
          </div>
        </section>

        {/* DUAL AUDIENCE */}
        <section className="border-t border-b border-border">
          <div className="mx-auto max-w-[1320px] grid grid-cols-1 md:grid-cols-2 gap-0">
            <FadeInSection className="p-10 md:p-16 border-b md:border-b-0 md:border-r border-border">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4 text-[#f59e0b]">
                For agent builders
              </div>
              <h3 className="font-extrabold tracking-[-0.04em] text-3xl md:text-4xl mb-6">
                Block bad tools
                <br />
                before they run.
              </h3>
              <ul className="space-y-4 text-base md:text-lg">
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  One-line install on Claude Code, Cursor, Codex
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Grade-aware blocking (never auto-connect F tools)
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Per-subagent permission boundaries
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Hash-chained audit for every action
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Free forever for &lt;10k validations/month
                </li>
              </ul>
              <Button asChild size="lg" className="mt-8">
                <a href="#install">Install now →</a>
              </Button>
            </FadeInSection>

            <FadeInSection
              delay={0.1}
              className="p-10 md:p-16"
              {...{
                style: {
                  background:
                    "linear-gradient(180deg, rgba(245,158,11,0.04), transparent)",
                },
              }}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4 text-[#f59e0b]">
                For tool authors
              </div>
              <h3 className="font-extrabold tracking-[-0.04em] text-3xl md:text-4xl mb-6">
                Show the world
                <br />
                your tool is honest.
              </h3>
              <ul className="space-y-4 text-base md:text-lg">
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Free scan — every MCP server on npm/PyPI
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Embeddable grade badge for your README
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Claim your listing, see every finding
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Actionable fix recommendations, not accusations
                </li>
                <li className="flex gap-3">
                  <span style={{ color: "#f59e0b" }}>→</span>
                  Re-scan on every release
                </li>
              </ul>
              <Button asChild variant="outline" size="lg" className="mt-8">
                <Link to="/claim">Claim your tool →</Link>
              </Button>
            </FadeInSection>
          </div>
        </section>

        {/* CODE INTEGRATION */}
        <section className="mx-auto max-w-[1320px] px-6 md:px-10 py-20 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 md:gap-14 items-center">
            <FadeInSection>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4 text-[#f59e0b]">
                Developer experience
              </div>
              <h2 className="font-extrabold tracking-[-0.04em] text-4xl md:text-5xl mb-6">
                One call per
                <br />
                tool decision.
              </h2>
              <p className="text-lg text-muted-foreground">
                Our hook is 200 lines of bash. No SDK to learn, no language
                runtime to match. If your agent can run a shell script before
                a tool call, AgentsID works.
              </p>
              <p className="text-lg mt-4 text-muted-foreground">
                For agents that don't: a REST API, MCP tool surface, or direct
                validator call.
              </p>
            </FadeInSection>

            <FadeInSection delay={0.1}>
              <pre className="rounded-lg bg-black border border-border p-5 md:p-6 font-mono text-[11.5px] md:text-[13px] leading-relaxed whitespace-pre-wrap break-all">
                <span className="text-muted-foreground">
                  # Claude Code PreToolUse hook — installed automatically
                </span>
                {"\n"}
                <span className="text-muted-foreground">
                  # stdin: {"{"} tool_name, tool_input, agent_id?,
                  agent_type? {"}"}
                </span>
                {"\n\n"}
                <span style={{ color: "#e0a060" }}>RESPONSE</span>=$(curl -s
                --max-time 2 \{"\n"} -X POST{" "}
                <span style={{ color: "#f59e0b" }}>
                  "${"{"}API_BASE{"}"}/api/v1/validate"
                </span>{" "}
                \{"\n"} -H{" "}
                <span style={{ color: "#f59e0b" }}>
                  "Authorization: Bearer ${"{"}PROJECT_KEY{"}"}"
                </span>{" "}
                \{"\n"} -d{" "}
                <span style={{ color: "#f59e0b" }}>
                  "{"{"} \"token\": \"${"{"}AGENT_TOKEN{"}"}\", \"tool\":
                  \"${"{"}TOOL_NAME{"}"}\", \"params\": ${"{"}TOOL_INPUT{"}"}
                  {"}"}"
                </span>
                ){"\n\n"}
                <span style={{ color: "#e0a060" }}>DECISION</span>=$(echo{" "}
                <span style={{ color: "#f59e0b" }}>"$RESPONSE"</span> | jq -r{" "}
                <span style={{ color: "#f59e0b" }}>
                  '.permission.allowed'
                </span>
                ){"\n\n"}
                <span style={{ color: "#e0a060" }}>if</span> [{" "}
                <span style={{ color: "#f59e0b" }}>"$DECISION"</span> ={" "}
                <span style={{ color: "#f59e0b" }}>"false"</span> ];{" "}
                <span style={{ color: "#e0a060" }}>then</span>
                {"\n"} <span className="text-muted-foreground">
                  echo {'\\{"hookSpecificOutput":{"permissionDecision":"deny"}\\}'}
                </span>
                {"\n"}
                <span style={{ color: "#e0a060" }}>fi</span>
              </pre>
            </FadeInSection>
          </div>
        </section>

        {/* RESEARCH PAPERS */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-[1320px] px-6 md:px-10 py-16 md:py-20">
            <FadeInSection>
              <div className="flex items-baseline justify-between mb-10 flex-wrap gap-4">
                <h2 className="font-extrabold tracking-[-0.04em] text-3xl md:text-4xl">
                  Research we've published.
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  open source
                </span>
              </div>
            </FadeInSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RESEARCH.map((paper, i) => (
                <FadeInSection key={paper.id} delay={i * 0.05}>
                  <a
                    href={`/research#${paper.id}`}
                    className="block p-6 rounded-lg bg-background border border-border hover:border-[#f59e0b]/50 transition-colors flex items-start gap-5"
                  >
                    <span
                      className="font-extrabold tracking-[-0.04em] text-4xl shrink-0"
                      style={{ color: "#f59e0b" }}
                    >
                      {paper.id}
                    </span>
                    <div>
                      <div className="font-extrabold text-lg mb-1">
                        {paper.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {paper.desc}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] mt-2 text-[#f59e0b]">
                        {paper.meta}
                      </div>
                    </div>
                  </a>
                </FadeInSection>
              ))}
            </div>
          </div>
        </section>

        {/* HOW WE WORK + FAQ */}
        <section className="mx-auto max-w-[1320px] px-6 md:px-10 py-20 md:py-28 border-t border-border grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-10 md:gap-14">
          <FadeInSection>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4 text-[#f59e0b]">
              How we work
            </div>
            <h2 className="font-extrabold tracking-[-0.04em] text-4xl mb-6">
              Built
              <br />
              in public.
            </h2>
            <p className="text-lg text-muted-foreground">
              All scanner code on GitHub. Every research paper open. Every
              deny in your audit trail traces back to the rule commit that
              authorized it.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.2em]">
              <span className="px-2.5 py-1 rounded bg-card border border-border text-muted-foreground">
                scanner · MIT
              </span>
              <span className="px-2.5 py-1 rounded bg-card border border-border text-muted-foreground">
                server · source-available
              </span>
              <span className="px-2.5 py-1 rounded bg-card border border-border text-muted-foreground">
                research · open
              </span>
            </div>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <div className="space-y-6">
              {FAQ.map((item, i) => (
                <div
                  key={i}
                  className={
                    i < FAQ.length - 1 ? "border-b border-border pb-6" : ""
                  }
                >
                  <div className="font-extrabold text-xl mb-2">{item.q}</div>
                  <p className="text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </FadeInSection>
        </section>

        {/* FINAL CTA */}
        <section
          className="border-t border-border"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(245,158,11,0.12), transparent 70%)",
          }}
        >
          <div className="mx-auto max-w-[1320px] px-6 md:px-10 py-24 md:py-32 text-center">
            <FadeInSection>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-6 text-[#f59e0b]">
                One command
              </div>
              <h2
                className="font-extrabold tracking-[-0.04em] leading-[0.92]"
                style={{ fontSize: "clamp(3rem, 7vw, 6rem)" }}
              >
                Stop your next agent
                <br />
                from calling an{" "}
                <span style={{ color: GRADE_COLORS.F }}>F.</span>
              </h2>
              <div className="mt-10 md:mt-12 flex justify-center">
                <InstallBlock />
              </div>
              <div className="mt-8 flex justify-center gap-3 flex-wrap">
                <Button asChild size="lg">
                  <a href="#install">
                    Install on Claude Code{" "}
                    <ArrowRight className="size-4 ml-1" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/research">Read the papers</Link>
                </Button>
              </div>
              <div className="mt-6 flex justify-center gap-2">
                <GradeChip letter="A" />
                <GradeChip letter="B" />
                <GradeChip letter="C" />
                <GradeChip letter="D" />
                <GradeChip letter="F" />
              </div>
            </FadeInSection>
          </div>
        </section>
      </div>
    </div>
  );
};

export { Landing };
