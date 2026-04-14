import { useState, useMemo } from "react";
import { Shield, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Search, GitPullRequest } from "lucide-react";
import { HALL_SERVERS, HALL_STATS, type HallServer, type Grade } from "./hall-of-mcps-data";

// ─── Grade helpers ────────────────────────────────────────────────────────────

const gradeColor: Record<Grade, string> = {
  A: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  B: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  C: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  D: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  F: "text-red-400 bg-red-400/10 border-red-400/20",
};

const severityColor: Record<string, string> = {
  HIGH: "text-red-400 bg-red-400/10 border-red-400/20",
  MEDIUM: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  LOW: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const riskTagColor: Record<string, string> = {
  destructive: "text-red-400 bg-red-400/10",
  execution: "text-orange-400 bg-orange-400/10",
  deployment: "text-purple-400 bg-purple-400/10",
  financial: "text-yellow-400 bg-yellow-400/10",
  privilege: "text-pink-400 bg-pink-400/10",
  credential_access: "text-rose-400 bg-rose-400/10",
  mutation: "text-amber-400 bg-amber-400/10",
};

const GradeBadge = ({ grade }: { readonly grade: Grade }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${gradeColor[grade]}`}>
    {grade}
  </span>
);

// ─── Server Card ──────────────────────────────────────────────────────────────

const ServerCard = ({ server }: { readonly server: HallServer }) => {
  const [expanded, setExpanded] = useState(false);
  const hasTools = server.tools > 0;

  return (
    <div id={server.id} className="border border-border/50 rounded-xl overflow-hidden">
      <div className="bg-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                {server.maintainer}
              </span>
              <span className="text-xs text-muted-foreground">{server.version}</span>
              {hasTools && (
                <span className="text-xs text-muted-foreground">{server.tools} tools</span>
              )}
              {!hasTools && (
                <span className="text-xs text-muted-foreground/50 italic">tools not exposed</span>
              )}
            </div>
            <h3 className="text-sm font-bold font-mono text-foreground truncate">
              {server.package}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <GradeBadge grade={server.grade} />
            <span className={`text-sm font-bold ${server.score === 0 ? "text-red-400" : server.score < 50 ? "text-orange-400" : "text-yellow-400"}`}>
              {server.score}/100
            </span>
          </div>
        </div>

        {/* Category grades */}
        {Object.keys(server.categories).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(server.categories).map(([cat, grade]) => (
              <div key={cat} className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground capitalize">{cat}</span>
                <GradeBadge grade={grade as Grade} />
              </div>
            ))}
          </div>
        )}

        {/* Risk tags */}
        {server.riskTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {server.riskTags.map((tag) => (
              <span
                key={tag}
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${riskTagColor[tag] ?? "text-muted-foreground bg-muted"}`}
              >
                {tag.replace("_", " ")}
              </span>
            ))}
          </div>
        )}

        {/* Finding counts */}
        {hasTools && (
          <div className="mt-3 flex gap-3 text-xs">
            <span className="text-red-400 font-semibold">{server.findings.high} HIGH</span>
            <span className="text-yellow-400 font-semibold">{server.findings.medium} MEDIUM</span>
            <span className="text-blue-400 font-semibold">{server.findings.low} LOW</span>
          </div>
        )}
      </div>

      {/* Expandable details */}
      {hasTools && server.topFindings.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-5 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-xs text-muted-foreground border-t border-border/50"
          >
            <span>{expanded ? "Hide" : "Show"} findings</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="border-t border-border/50 p-5 space-y-3">
              {server.topFindings.map((finding, i) => (
                <div key={i} className="flex gap-2.5 text-xs">
                  <span className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded font-bold border ${severityColor[finding.severity] ?? ""}`}>
                    {finding.severity}
                  </span>
                  <div>
                    {finding.tool && (
                      <span className="font-mono text-primary mr-1.5">{finding.tool}</span>
                    )}
                    <span className="text-muted-foreground">{finding.description}</span>
                  </div>
                </div>
              ))}

              {server.mapPolicy && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-2">
                    Fix — drop this <span className="font-mono normal-case">agentsid.json</span> in your repo
                  </p>
                  <pre className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3 overflow-x-auto leading-relaxed">
                    {JSON.stringify(server.mapPolicy, null, 2)}
                  </pre>
                  <p className="text-[10px] text-muted-foreground/50 mt-2">
                    Then wrap: <span className="font-mono">npx @agentsid/proxy run --policy agentsid.json -- npx {server.package}</span>
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground/50 pt-1">
                Scanned {new Date(server.scannedAt).toLocaleDateString()} ·{" "}
                <span className="font-mono">npx @agentsid/scanner -- npx {server.package}</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Submission Section ───────────────────────────────────────────────────────

const SubmissionSection = () => {
  const issueTemplate = encodeURIComponent(
    `## Server Submission\n\n**Package name:** \`npx <your-package>\`\n\n**Scanner output:**\n\`\`\`\nnpx @agentsid/scanner -- npx <your-package>\n# paste output here\n\`\`\`\n\n**Worst finding (in your words):**\n\n**MAP policy that mitigates it:**\n\`\`\`json\n{\n  "version": "1.0",\n  "rules": []\n}\n\`\`\``
  );

  const issueUrl = `https://github.com/AgentsID-dev/agentsid-scanner/issues/new?title=Hall+of+MCPs+submission&body=${issueTemplate}&labels=hall-of-mcps`;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="bg-card px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <GitPullRequest className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Submit a Server</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Found a vulnerable MCP server not in this list? Run the scanner and submit your findings.
          Every submission is reviewed and added to this page.
        </p>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Step 1 — Scan the server
          </p>
          <code className="text-xs font-mono text-primary">
            npx @agentsid/scanner -- npx &lt;package-name&gt;
          </code>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Step 2 — Submit via GitHub Issue
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Paste the scanner output, describe the worst finding, and include a MAP policy that mitigates it.
            We'll review and add it within 48 hours.
          </p>
          <a
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
          >
            Open submission issue on GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Step 3 — Or submit a PR directly
          </p>
          <p className="text-xs text-muted-foreground mb-1">
            Add your scan report JSON to <span className="font-mono text-primary">/reports</span> and run:
          </p>
          <code className="text-xs font-mono text-primary">
            node scripts/generate-hall-data.mjs
          </code>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const HallOfMcps = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with-tools" | "F">("with-tools");

  const filtered = useMemo(() => {
    let list = [...HALL_SERVERS];

    if (filter === "with-tools") list = list.filter((s) => s.tools > 0);
    if (filter === "F") list = list.filter((s) => s.grade === "F" && s.tools > 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.package.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.maintainer.toLowerCase().includes(q)
      );
    }

    return list;
  }, [search, filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-red-400" />
          <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">
            Security Audit — March 2026
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
          MCP Security Hall of Shame
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
          We scanned {HALL_STATS.total} MCP servers. {HALL_STATS.fGrade} scored F.
          Zero scored A. {HALL_STATS.totalFindings.toLocaleString()} total findings across{" "}
          {HALL_STATS.totalTools} tools.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{HALL_STATS.withTools} servers with tool definitions</span>
          <span>·</span>
          <span>{HALL_STATS.fGrade} F grades</span>
          <span>·</span>
          <a
            href="https://github.com/AgentsID-dev/agentsid-scanner"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            Reproduce any scan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      {/* Methodology note */}
      <div className="mb-4 flex gap-2 text-xs text-muted-foreground/60 bg-muted/20 border border-border/30 rounded-lg px-4 py-3">
        <span className="font-semibold text-muted-foreground/80 flex-shrink-0">Note:</span>
        <span>
          Grades reflect the raw server with no policy applied. The scanner reads tool definitions — names, descriptions, and schemas — not runtime behavior.
          A MAP policy fixes what agents can <em>do</em>, not what the server <em>advertises</em>.
          Every server here would score lower without one.
        </span>
      </div>

      {/* Alert */}
      <div className="mb-8 flex gap-3 bg-red-950/30 border border-red-900/40 rounded-xl px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-red-300 mb-1">
            These include official reference implementations from Anthropic and Microsoft.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            If the gold standard scores F, the ecosystem built on top of it has no foundation.
            Every server listed here has agents with unrestricted access to destructive tools.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Servers scanned", value: HALL_STATS.total },
          { label: "Scored F", value: HALL_STATS.fGrade, red: true },
          { label: "Total findings", value: HALL_STATS.totalFindings.toLocaleString() },
          { label: "Tools analyzed", value: HALL_STATS.totalTools },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black mb-1 ${stat.red ? "text-red-400" : "text-foreground"}`}>
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(["with-tools", "F", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                filter === f
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
              }`}
            >
              {f === "with-tools" ? "With tools" : f === "F" ? "F grade only" : "All"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {filtered.length} server{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Server list */}
      <div className="space-y-3 mb-12">
        {filtered.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">
            No servers match your search.
          </p>
        )}
      </div>

      {/* Submission */}
      <SubmissionSection />

      {/* Footer CTA */}
      <div className="mt-8 border border-border/50 rounded-xl p-6 bg-card text-center">
        <p className="text-sm font-semibold text-foreground mb-2">
          Protect any server in 30 seconds
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Drop an <span className="font-mono text-primary">agentsid.json</span> policy file in your repo and wrap the server.
        </p>
        <code className="text-xs font-mono bg-muted px-4 py-2 rounded-lg text-muted-foreground block">
          npx @agentsid/proxy run --policy agentsid.json -- npx &lt;your-mcp-server&gt;
        </code>
      </div>
    </div>
  );
};
