import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Particles } from "@/components/ui/particles";
import { BorderBeam } from "@/components/ui/border-beam";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import {
  Shield,
  Zap,
  FileText,
  Lock,
  GitBranch,
  Eye,
  ArrowRight,
  Check,
  Terminal,
  Copy,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const features = [
  {
    icon: <Shield className="size-6" />,
    title: "Deny-First Permissions",
    description:
      "Every tool call is blocked unless explicitly allowed. Wildcards, conditions, schedules, and rate limits.",
    gradient: "from-amber-500/10 to-amber-900/10",
  },
  {
    icon: <Lock className="size-6" />,
    title: "HMAC-SHA256 Tokens",
    description:
      "Cryptographically signed agent tokens. No database lookup needed for validation. Supports key rotation.",
    gradient: "from-amber-500/5 to-amber-900/5",
  },
  {
    icon: <Eye className="size-6" />,
    title: "Tamper-Evident Audit",
    description:
      "SHA-256 hash chain links every event. If anyone modifies a record, the chain breaks. Provable history.",
    gradient: "from-amber-500/5 to-amber-900/5",
  },
  {
    icon: <GitBranch className="size-6" />,
    title: "Approval Gates",
    description:
      "Sensitive actions pause for human approval. Email notifications, webhook triggers, time-boxed decisions.",
    gradient: "from-amber-500/5 to-amber-900/5",
  },
  {
    icon: <Zap className="size-6" />,
    title: "MCP Native",
    description:
      "Built for Model Context Protocol. Validates every tool call in real-time. Works with Claude, Cursor, Codex.",
    gradient: "from-amber-500/5 to-amber-900/5",
  },
  {
    icon: <FileText className="size-6" />,
    title: "Multi-Language SDKs",
    description:
      "TypeScript, Python, Ruby, Java. npm, PyPI, RubyGems. Drop-in middleware for any MCP server.",
    gradient: "from-amber-500/5 to-amber-900/5",
  },
] as const;

const codeLines = [
  { text: "import", cls: "text-amber-400" },
  { text: " { AgentsID } ", cls: "text-[#e4e4ef]" },
  { text: "from", cls: "text-amber-400" },
  { text: " '@agentsid/sdk'", cls: "text-green-400" },
  { text: ";", cls: "text-[#e4e4ef]" },
  { text: "\n\n", cls: "" },
  { text: "const", cls: "text-amber-400" },
  { text: " guard = ", cls: "text-[#e4e4ef]" },
  { text: "new", cls: "text-amber-400" },
  { text: " AgentsID", cls: "text-blue-400" },
  { text: "({\n", cls: "text-[#e4e4ef]" },
  { text: "  projectKey: ", cls: "text-[#e4e4ef]" },
  { text: "process.env.", cls: "text-blue-400" },
  { text: "AGENTSID_PROJECT_KEY", cls: "text-[#e4e4ef]" },
  { text: ",\n", cls: "text-[#e4e4ef]" },
  { text: "});\n\n", cls: "text-[#e4e4ef]" },
  { text: "// Every tool call gets validated", cls: "text-gray-500" },
  { text: "\n", cls: "" },
  { text: "const", cls: "text-amber-400" },
  { text: " result = ", cls: "text-[#e4e4ef]" },
  { text: "await", cls: "text-amber-400" },
  { text: " guard.", cls: "text-[#e4e4ef]" },
  { text: "validate", cls: "text-blue-400" },
  { text: "('delete_user'", cls: "text-green-400" },
  { text: ", {\n  userId: ", cls: "text-[#e4e4ef]" },
  { text: "'123'", cls: "text-green-400" },
  { text: "\n});\n\n", cls: "text-[#e4e4ef]" },
  { text: "if", cls: "text-amber-400" },
  { text: " (!result.", cls: "text-[#e4e4ef]" },
  { text: "allowed", cls: "text-blue-400" },
  { text: ") {\n  ", cls: "text-[#e4e4ef]" },
  { text: "console", cls: "text-blue-400" },
  { text: ".log(", cls: "text-[#e4e4ef]" },
  { text: "'Blocked:'", cls: "text-green-400" },
  { text: ", result.reason);\n}", cls: "text-[#e4e4ef]" },
] as const;

const codeRaw = `import { AgentsID } from '@agentsid/sdk';

const guard = new AgentsID({
  projectKey: process.env.AGENTSID_PROJECT_KEY,
});

// Every tool call gets validated
const result = await guard.validate('delete_user', {
  userId: '123'
});

if (!result.allowed) {
  console.log('Blocked:', result.reason);
}`;

const stats = [
  { value: "<1ms", label: "Validation latency" },
  { value: "4", label: "SDK languages" },
  { value: "0", label: "DB lookups for auth" },
  { value: "100%", label: "Audit coverage" },
] as const;

const proofPoints = [
  { value: "15,982", label: "MCP Servers Scanned" },
  { value: "5", label: "Published Papers" },
  { value: "4", label: "SDKs Shipped" },
  { value: "72%", label: "Fail Rate Found" },
] as const;

// ---------------------------------------------------------------------------
// Animated section wrapper
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
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Code block with syntax highlighting + copy
// ---------------------------------------------------------------------------

function CodeBlock() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeRaw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative rounded-xl border border-border/50 bg-[#0f0f1a] overflow-hidden group">
      <BorderBeam
        size={200}
        duration={8}
        colorFrom="#f59e0b"
        colorTo="#d97706"
        borderWidth={1.5}
      />
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] text-white/30 font-mono ml-2">
            guard.ts
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <div className="p-5 overflow-x-auto">
        <pre className="text-[13px] leading-relaxed font-mono">
          <code>
            {codeLines.map((token, i) => (
              <span key={i} className={token.cls}>
                {token.text}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feature card with hover glow
// ---------------------------------------------------------------------------

function FeatureCard({
  feature,
  index,
}: {
  readonly feature: (typeof features)[number];
  readonly index: number;
}) {
  return (
    <FadeInSection delay={index * 0.08}>
      <div className="group relative rounded-xl border border-border/50 bg-card p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 overflow-hidden">
        {/* Gradient glow on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        />
        <div className="relative">
          <div className="mb-4 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
            {feature.icon}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {feature.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </FadeInSection>
  );
}

// ---------------------------------------------------------------------------
// Animated counter
// ---------------------------------------------------------------------------

function AnimatedStat({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={
          isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }
        }
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent mb-1"
      >
        {value}
      </motion.div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How it works step
// ---------------------------------------------------------------------------

const howItWorks = [
  {
    step: "1",
    title: "Install",
    desc: "Add the SDK to your project with one command.",
    code: "npm install @agentsid/sdk",
  },
  {
    step: "2",
    title: "Register",
    desc: "Create an agent identity with scoped permissions.",
    code: "aid.registerAgent({ name: 'my-agent' })",
  },
  {
    step: "3",
    title: "Validate",
    desc: "Check every tool call against the permission set.",
    code: "aid.validate('tool_name', params)",
  },
] as const;

// ---------------------------------------------------------------------------
// Interactive Demo data
// ---------------------------------------------------------------------------

const demoTools = [
  {
    name: "search_web",
    allowed: true,
    reason: 'Matched rule: search_*',
    result: '{ allowed: true, reason: "Matched rule: search_*" }',
  },
  {
    name: "save_memory",
    allowed: true,
    reason: 'Matched rule: save_memory',
    result: '{ allowed: true, reason: "Matched rule: save_memory" }',
  },
  {
    name: "delete_user",
    allowed: false,
    reason: 'No matching allow rule',
    result: '{ allowed: false, reason: "No matching allow rule" }',
  },
] as const;

const permissionRules = [
  { pattern: "search_*", type: "allow" as const },
  { pattern: "save_memory", type: "allow" as const },
  { pattern: "delete_*", type: "deny" as const },
  { pattern: "All other tools", type: "default" as const },
] as const;

// ---------------------------------------------------------------------------
// Interactive Demo
// ---------------------------------------------------------------------------

function InteractiveDemo() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const selectedTool = selectedIndex !== null ? demoTools[selectedIndex] : null;

  // Auto-play through all 3 tools on first view
  useEffect(() => {
    if (!isInView || hasAutoPlayed) return;
    setHasAutoPlayed(true);

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    demoTools.forEach((_, i) => {
      timeouts.push(setTimeout(() => {
        setShowResult(false);
        setSelectedIndex(i);
        timeouts.push(setTimeout(() => setShowResult(true), 300));
      }, i * 1800));
    });

    return () => timeouts.forEach(clearTimeout);
  }, [isInView, hasAutoPlayed]);

  const handleToolClick = (index: number) => {
    setShowResult(false);
    setSelectedIndex(index);
    setTimeout(() => setShowResult(true), 300);
  };

  return (
    <section ref={ref} className="py-16 lg:py-24 border-t border-border/30">
      <div className="container mx-auto px-4 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
              See it in action
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Click a tool to see how AgentsID validates agent requests in
              real-time.
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          {/* Tool buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {demoTools.map((tool, i) => (
              <button
                key={tool.name}
                onClick={() => handleToolClick(i)}
                className={`px-4 py-2 rounded-lg border font-mono text-sm transition-all duration-200 ${
                  selectedIndex === i
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {tool.name}
              </button>
            ))}
          </div>

          {/* Split panel */}
          <div className="grid md:grid-cols-[1fr,auto,1fr] gap-4 max-w-4xl mx-auto items-center">
            {/* Left: Agent Request */}
            <div className="rounded-xl border border-border/50 bg-[#0f0f1a] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Terminal className="size-3.5 text-primary" />
                <span className="text-[11px] text-white/30 font-mono">
                  Agent Request
                </span>
              </div>
              <div className="p-5 min-h-[80px] flex items-center">
                <AnimatePresence mode="wait">
                  {selectedTool ? (
                    <motion.pre
                      key={selectedTool.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[13px] font-mono leading-relaxed"
                    >
                      <span className="text-green-400">&gt; </span>
                      <span className="text-blue-400">agent</span>
                      <span className="text-[#e4e4ef]">.validate(</span>
                      <span className="text-green-400">
                        &quot;research-bot&quot;
                      </span>
                      <span className="text-[#e4e4ef]">, </span>
                      <span className="text-green-400">
                        &quot;{selectedTool.name}&quot;
                      </span>
                      <span className="text-[#e4e4ef]">)</span>
                    </motion.pre>
                  ) : (
                    <span className="text-[13px] font-mono text-white/20">
                      Select a tool above...
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <motion.div
                animate={
                  showResult && selectedTool
                    ? { opacity: 1, x: [0, 6, 0] }
                    : { opacity: 0.3 }
                }
                transition={{ duration: 0.6, repeat: showResult ? 0 : 0 }}
              >
                <ArrowRight
                  className={`size-5 ${
                    showResult && selectedTool
                      ? selectedTool.allowed
                        ? "text-green-400"
                        : "text-red-400"
                      : "text-muted-foreground/40"
                  }`}
                />
              </motion.div>
            </div>

            {/* Right: Response */}
            <div className="rounded-xl border border-border/50 bg-[#0f0f1a] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <Shield className="size-3.5 text-primary" />
                <span className="text-[11px] text-white/30 font-mono">
                  AgentsID Response
                </span>
              </div>
              <div className="p-5 min-h-[80px] flex items-center">
                <AnimatePresence mode="wait">
                  {showResult && selectedTool ? (
                    <motion.div
                      key={selectedTool.name + "-result"}
                      initial={{ opacity: 0, x: 10 }}
                      animate={
                        selectedTool.allowed
                          ? { opacity: 1, x: 0 }
                          : { opacity: 1, x: [10, -4, 4, -2, 0] }
                      }
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold border ${
                          selectedTool.allowed
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {selectedTool.allowed ? "ALLOWED" : "BLOCKED"}
                      </span>
                      <pre className="text-[12px] font-mono text-white/60 leading-relaxed">
                        {selectedTool.result}
                      </pre>
                    </motion.div>
                  ) : (
                    <span className="text-[13px] font-mono text-white/20">
                      Awaiting request...
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Permission rules */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {permissionRules.map((rule) => (
              <span
                key={rule.pattern}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
                  rule.type === "allow"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : rule.type === "deny"
                      ? "bg-red-500/10 text-red-400 border-red-500/20"
                      : "bg-white/5 text-white/30 border-white/10"
                }`}
              >
                {rule.pattern}
                <span className="text-[10px] opacity-60">
                  {rule.type === "allow"
                    ? "allow"
                    : rule.type === "deny"
                      ? "deny"
                      : "deny (default)"}
                </span>
              </span>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Landing Page
// ---------------------------------------------------------------------------

const Landing = () => {
  const [typedChars, setTypedChars] = useState(0);
  const terminalText = "npx agentsid init \"My App\"";
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  useEffect(() => {
    if (!heroInView) return;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setTypedChars((prev) => {
          if (prev >= terminalText.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 50);
      return () => clearInterval(interval);
    }, 800);
    return () => clearTimeout(timer);
  }, [heroInView]);

  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section ref={heroRef} className="relative py-24 lg:py-36 overflow-hidden">
        {/* Particle background */}
        <Particles
          className="absolute inset-0"
          quantity={60}
          color="#f59e0b"
          size={0.6}
          staticity={40}
          ease={40}
        />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-emerald-900/5 rounded-full blur-[100px]" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary mb-8"
            >
              <Shield className="size-4" />
              Identity & Auth for AI Agents
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05] mb-6"
            >
              Your agents need
              <br />
              <span className="bg-gradient-to-r from-primary via-amber-400 to-amber-300 bg-clip-text text-transparent">
                real identity
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Scoped permissions, delegation chains, and tamper-evident audit
              trails that prove what happened. Every tool call validated. Every
              action logged.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap justify-center gap-4 mb-14"
            >
              <Button
                asChild
                size="lg"
                className="text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
              >
                <a href="/dashboard">
                  Start Free <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-base px-8 backdrop-blur-sm"
              >
                <a href="/docs">Read the Docs</a>
              </Button>
            </motion.div>

            {/* Terminal preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="max-w-md mx-auto"
            >
              <div className="rounded-lg border border-border/50 bg-[#0f0f1a]/80 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-sm font-mono">
                  <Terminal className="size-4 text-primary" />
                  <span className="text-green-400">$</span>
                  <span className="text-[#e4e4ef]">
                    {terminalText.slice(0, typedChars)}
                  </span>
                  <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Proof points ── */}
      <section className="py-10 border-t border-border/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-wrap justify-center gap-10 lg:gap-16">
            {proofPoints.map((point) => (
              <div key={point.label} className="text-center">
                <p className="text-2xl font-bold text-foreground">{point.value}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground/60">{point.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 lg:py-20 border-t border-border/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {stats.map((stat) => (
              <AnimatedStat
                key={stat.label}
                value={stat.value}
                label={stat.label}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Code Example ── */}
      <section className="py-16 lg:py-24 border-t border-border/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeInSection>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
                Three lines to protect any agent
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Install the SDK, set your keys, call{" "}
                <code className="text-sm bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">
                  validate()
                </code>{" "}
                before every tool execution. AgentsID handles permissions, rate
                limits, approvals, and audit logging.
              </p>
              <div className="flex gap-3">
                <Button asChild variant="outline" size="sm">
                  <a href="/guides#quick-start">
                    Quick Start Guide <ArrowRight className="ml-1.5 size-3" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a
                    href="https://github.com/AgentsID-dev/agentsid"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub
                  </a>
                </Button>
              </div>
            </FadeInSection>
            <FadeInSection delay={0.15}>
              <CodeBlock />
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-16 lg:py-24 border-t border-border/30 relative overflow-hidden">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.08}
          duration={3}
          repeatDelay={1}
          className="fill-primary/20 stroke-primary/10 [mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
        />
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <FadeInSection>
            <div className="text-center mb-14">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
                Up and running in 5 minutes
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Three steps from zero to fully protected.
              </p>
            </div>
          </FadeInSection>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {howItWorks.map((step, i) => (
              <FadeInSection key={step.step} delay={i * 0.12}>
                <div className="relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-600 text-white font-bold text-sm mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {step.desc}
                  </p>
                  <code className="text-xs font-mono text-primary bg-primary/5 px-3 py-1.5 rounded-md border border-primary/10">
                    {step.code}
                  </code>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Demo ── */}
      <InteractiveDemo />

      {/* ── Features Grid ── */}
      <section className="py-16 lg:py-24 border-t border-border/30">
        <div className="container mx-auto px-4 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
                Everything agents need. Nothing they don't.
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Built from scratch for the AI agent era. Not adapted from human
                auth — designed for machines.
              </p>
            </div>
          </FadeInSection>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 lg:py-28 border-t border-border/30 relative overflow-hidden">
        <Particles
          className="absolute inset-0"
          quantity={40}
          color="#f59e0b"
          size={0.5}
          staticity={60}
          ease={60}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent" />
        <div className="container mx-auto px-4 lg:px-8 text-center relative z-10">
          <FadeInSection>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">
              Ready to secure your agents?
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
              Free tier includes 10,000 events/month and 25 agents. No credit card
              required.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
              >
                <a href="/dashboard">
                  Get Started Free <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="text-base px-8"
              >
                <a href="/guides">View Tutorials</a>
              </Button>
            </div>
          </FadeInSection>
        </div>
      </section>
    </div>
  );
};

export { Landing };
