import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Shield, ArrowLeft, ExternalLink, ChevronDown, ChevronUp,
  Zap, Database, Lock, FileCode, AlertTriangle, Tag, BookOpen, Copy, Check
} from "lucide-react";
import { HALL_SERVERS, type HallServer, type HallFinding, type Grade } from "./hall-of-mcps-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gradeToScore = (grade: Grade | string | undefined): number =>
  ({ A: 95, B: 80, C: 65, D: 40, F: 15 }[grade as Grade] ?? 100);

const scoreColor = (score: number) =>
  score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : score >= 30 ? "text-orange-400" : "text-red-400";

const scoreBg = (score: number) =>
  score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-yellow-500" : score >= 30 ? "bg-orange-500" : "bg-red-500";

const trustColor = (score: number) =>
  score >= 70 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : score >= 30 ? "text-orange-400" : "text-red-400";

const safetyLabel = (score: number) =>
  score >= 70 ? "Safe" : score >= 50 ? "Review" : score >= 30 ? "Risky" : "Dangerous";

const safetyStyle: Record<string, string> = {
  Safe: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Review: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Risky: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Dangerous: "text-red-400 bg-red-400/10 border-red-400/20",
};

const severityColor: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-400/10 border-red-400/30",
  HIGH: "text-red-400 bg-red-400/10 border-red-400/20",
  MEDIUM: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  LOW: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  INFO: "text-muted-foreground bg-muted/30 border-border/50",
};

const categoryIcon: Record<string, React.ReactNode> = {
  toxic_flow: <Zap className="w-4 h-4 text-red-400" />,
  injection: <Shield className="w-4 h-4 text-red-400" />,
  permissions: <Lock className="w-4 h-4 text-orange-400" />,
  credential: <Database className="w-4 h-4 text-orange-400" />,
  schema: <FileCode className="w-4 h-4 text-yellow-400" />,
  validation: <FileCode className="w-4 h-4 text-yellow-400" />,
  auth: <Lock className="w-4 h-4 text-yellow-400" />,
  output: <AlertTriangle className="w-4 h-4 text-blue-400" />,
  description: <Tag className="w-4 h-4 text-blue-400" />,
  naming: <Tag className="w-4 h-4 text-blue-400" />,
  hallucination: <BookOpen className="w-4 h-4 text-muted-foreground" />,
  supply_chain: <AlertTriangle className="w-4 h-4 text-red-400" />,
};

const categoryLabel: Record<string, string> = {
  toxic_flow: "Toxic Flows",
  injection: "Prompt Injection",
  permissions: "Capability Risk",
  credential: "Data Exposure",
  schema: "Schema Issues",
  validation: "Schema Issues",
  auth: "Auth",
  output: "Output Safety",
  description: "Annotation Mismatches",
  naming: "Naming",
  hallucination: "Hallucination Risk",
  supply_chain: "Supply Chain",
};

// ─── Server Icon ──────────────────────────────────────────────────────────────

const ICON_COLORS = [
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-emerald-500 to-emerald-700",
  "from-orange-500 to-orange-700",
  "from-pink-500 to-pink-700",
  "from-cyan-500 to-cyan-700",
  "from-red-500 to-red-700",
  "from-yellow-500 to-yellow-700",
];

const ServerIcon = ({ pkg, iconUrl, size = "lg" }: { readonly pkg: string; readonly iconUrl: string | null; readonly size?: "lg" | "sm" }) => {
  const idx = pkg.charCodeAt(0) % ICON_COLORS.length;
  const letter = pkg.replace(/[@\/\-_]/g, "").charAt(0).toUpperCase() || "M";
  const dim = size === "lg" ? "w-14 h-14" : "w-9 h-9";
  const inner = size === "lg" ? "w-10 h-10" : "w-6 h-6";
  const text = size === "lg" ? "text-xl" : "text-sm";

  if (iconUrl) {
    return (
      <div className={`${dim} rounded-2xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/30`}>
        <img src={iconUrl} alt="" className={`${inner} object-contain`} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      </div>
    );
  }
  return (
    <div className={`${dim} rounded-2xl bg-gradient-to-br ${ICON_COLORS[idx]} flex items-center justify-center flex-shrink-0`}>
      <span className={`${text} font-bold text-white`}>{letter}</span>
    </div>
  );
};

// ─── Dimension Card ───────────────────────────────────────────────────────────

const DimensionCard = ({ label, score }: { readonly label: string; readonly score: number }) => (
  <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-col items-center gap-2">
    <span className={`text-3xl font-black tabular-nums ${scoreColor(score)}`}>{score}</span>
    <div className="w-full h-0.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${scoreBg(score)}`} style={{ width: `${score}%` }} />
    </div>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

// ─── Findings Group ───────────────────────────────────────────────────────────

const FindingsGroup = ({
  category,
  findings,
  forceOpen,
}: {
  readonly category: string;
  readonly findings: readonly HallFinding[];
  readonly forceOpen?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const label = categoryLabel[category] ?? category;
  const icon = categoryIcon[category] ?? <Tag className="w-4 h-4 text-muted-foreground" />;
  const worstSeverity = findings.some(f => f.severity === "CRITICAL" || f.severity === "HIGH") ? "high"
    : findings.some(f => f.severity === "MEDIUM") ? "medium" : "low";
  const dotColor = worstSeverity === "high" ? "bg-red-400" : worstSeverity === "medium" ? "bg-yellow-400" : "bg-blue-400";

  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-1 py-3.5 hover:bg-muted/10 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
          {icon}
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {findings.length}
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="pb-3 pl-2 space-y-2">
          {findings.map((f, i) => (
            <div key={i} className="flex items-start gap-3 px-3 py-3 bg-muted/10 rounded-xl">
              <span className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-bold border ${severityColor[f.severity] ?? severityColor.INFO}`}>
                {f.severity}
              </span>
              <div className="min-w-0">
                {f.tool && (
                  <code className="text-xs font-mono text-primary block mb-1">{f.tool}</code>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Tool Table ───────────────────────────────────────────────────────────────

const ToolRow = ({ tool, count, findings }: { readonly tool: string; readonly count: number; readonly findings: readonly HallFinding[] }) => {
  const [open, setOpen] = useState(false);
  const toolFindings = findings.filter(f => f.tool === tool);
  const description = toolFindings[0]?.description ?? "";

  return (
    <>
      <tr
        className="border-b border-border/20 hover:bg-muted/10 transition-colors cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <td className="px-4 py-3 font-mono text-xs text-foreground">{tool}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-xs">{description.slice(0, 60)}{description.length > 60 ? "…" : ""}</td>
        <td className="px-4 py-3 text-right text-xs text-muted-foreground">—</td>
        <td className="px-4 py-3 text-right">
          <span className={`text-xs font-semibold tabular-nums ${count >= 3 ? "text-red-400" : count >= 2 ? "text-yellow-400" : "text-blue-400"}`}>
            {count}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />}
        </td>
      </tr>
      {open && toolFindings.map((f, i) => (
        <tr key={i} className="bg-muted/5 border-b border-border/10">
          <td colSpan={5} className="px-6 py-2.5">
            <div className="flex items-start gap-2 text-xs">
              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded font-bold border ${severityColor[f.severity] ?? severityColor.INFO}`}>
                {f.severity}
              </span>
              <span className="text-muted-foreground">{f.description}</span>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

const ToolTable = ({ server }: { readonly server: HallServer }) => {
  const toolMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of server.topFindings) {
      if (f.tool) map.set(f.tool, (map.get(f.tool) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [server.topFindings]);

  if (toolMap.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div className="px-4 py-3 bg-muted/20 border-b border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Tools <span className="normal-case font-normal">{toolMap.length}</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/30">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Params</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Findings</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {toolMap.map(([tool, count]) => (
              <ToolRow key={tool} tool={tool} count={count} findings={server.topFindings} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Badge Section ────────────────────────────────────────────────────────────

const BadgeSection = ({ server }: { readonly server: HallServer }) => {
  const [copied, setCopied] = useState(false);
  const level = safetyLabel(server.score);
  const badgeColor = server.score < 30 ? "red" : server.score < 50 ? "orange" : server.score < 70 ? "yellow" : "green";
  const badgeUrl = `https://img.shields.io/badge/AgentsID%20MCP-${encodeURIComponent(level)}-${badgeColor}`;
  const repoUrl = `https://agentsid.dev/registry/${server.id}`;
  const mdSnippet = `[![AgentsID MCP](${badgeUrl})](${repoUrl})`;

  const copy = () => {
    navigator.clipboard.writeText(mdSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-muted/20 border-b border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Badge</h3>
      </div>
      <div className="p-5 space-y-3">
        <img src={badgeUrl} alt="AgentsID MCP badge" className="h-5" />
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-muted-foreground truncate">
            {mdSnippet}
          </code>
          <button
            onClick={copy}
            className="flex-shrink-0 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors border border-border/50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const RegistryServer = () => {
  const { slug } = useParams<{ slug: string }>();
  const server = HALL_SERVERS.find((s) => s.id === slug);
  const [expandAll, setExpandAll] = useState(false);
  const [cmdCopied, setCmdCopied] = useState(false);

  if (!server) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-24 text-center">
        <p className="text-muted-foreground text-lg mb-4">Server not found.</p>
        <Link to="/registry" className="text-primary hover:underline text-sm">← Registry</Link>
      </div>
    );
  }

  const level = safetyLabel(server.score);
  const totalFindings = server.findings.high + server.findings.medium + server.findings.low;

  const dimensionScores = {
    Descriptions: gradeToScore(server.categories.description),
    Schemas: gradeToScore(server.categories.validation),
    Capabilities: gradeToScore(server.categories.permissions),
    Auth: gradeToScore(server.categories.auth),
    Stability: gradeToScore(server.categories.output),
  };

  const findingsByCategory = useMemo(() => {
    const map: Record<string, HallFinding[]> = {};
    for (const f of server.topFindings) {
      const key = f.category || "other";
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    const priority = ["toxic_flow", "injection", "supply_chain", "permissions", "credential"];
    return Object.entries(map).sort((a, b) => {
      const ai = priority.indexOf(a[0]);
      const bi = priority.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1].length - a[1].length;
    });
  }, [server.topFindings]);

  const installCmd = `npx -y ${server.package}`;

  const copyCmd = () => {
    navigator.clipboard.writeText(installCmd);
    setCmdCopied(true);
    setTimeout(() => setCmdCopied(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Back */}
      <Link
        to="/registry"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        MCP Registry
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <ServerIcon pkg={server.package} iconUrl={server.iconUrl ?? null} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-foreground truncate">
              {server.package.replace(/^@[^/]+\//, "")}
            </h1>
            <span className="text-sm text-muted-foreground font-normal">MCP Server</span>
            {server.repoUrl && (
              <a href={server.repoUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{server.maintainer}</span>
            {server.stars != null && <span>⭐ {server.stars.toLocaleString()}</span>}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${safetyStyle[level]}`}>{level}</span>
          </div>
          {server.description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl">{server.description}</p>
          )}
        </div>

        {/* Trust Score */}
        <div className="flex-shrink-0 border border-border/50 rounded-xl p-4 text-center min-w-[90px] bg-card">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Trust Score</p>
          <p className={`text-4xl font-black tabular-nums ${trustColor(server.score)}`}>{server.score}</p>
          <p className="text-xs text-muted-foreground">/100</p>
        </div>
      </div>

      {/* Install command */}
      <div className="flex items-center gap-2 bg-muted/20 border border-border/40 rounded-xl px-4 py-3 mb-4 font-mono text-sm">
        <span className="text-muted-foreground flex-1 truncate">{installCmd}</span>
        <button onClick={copyCmd} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          {cmdCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-8">
        <span className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-lg">npm</span>
        {server.license && <span className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-lg">{server.license}</span>}
        <span className="ml-auto">Scanned {new Date(server.scannedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      </div>

      {/* Summary stats */}
      <div className="flex gap-6 text-sm mb-8 pb-8 border-b border-border/30">
        <div>
          <span className="font-semibold text-foreground">{server.tools}</span>
          <span className="text-muted-foreground ml-1">tools</span>
        </div>
        <div>
          <span className="font-semibold text-foreground">{totalFindings}</span>
          <span className="text-muted-foreground ml-1">findings</span>
        </div>
        {server.findings.high > 0 && (
          <div>
            <span className="font-semibold text-red-400">{server.findings.high}</span>
            <span className="text-muted-foreground ml-1">high severity</span>
          </div>
        )}
      </div>

      {/* Dimension scores */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {Object.entries(dimensionScores).map(([label, score]) => (
          <DimensionCard key={label} label={label} score={score} />
        ))}
      </div>

      {/* Findings */}
      {findingsByCategory.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Findings</h2>
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expandAll ? "Collapse all" : "Expand all"}
            </button>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-1 bg-card">
            {findingsByCategory.map(([category, findings]) => (
              <FindingsGroup key={category} category={category} findings={findings} forceOpen={expandAll} />
            ))}
          </div>
        </section>
      )}

      {/* Tool table */}
      {server.topFindings.some((f) => f.tool) && (
        <section className="mb-8">
          <ToolTable server={server} />
        </section>
      )}

      {/* MAP policy */}
      {server.mapPolicy && (
        <section className="mb-8">
          <div className="border border-emerald-900/40 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-emerald-950/20 border-b border-emerald-900/30">
              <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-widest">
                Recommended MAP policy
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drop this <code className="font-mono text-primary">agentsid.json</code> in your repo to restrict dangerous capabilities
              </p>
            </div>
            <div className="p-5">
              <pre className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3 overflow-x-auto leading-relaxed">
                {JSON.stringify(server.mapPolicy, null, 2)}
              </pre>
              <p className="text-xs text-muted-foreground/60 mt-3">
                Apply with:{" "}
                <code className="font-mono text-primary">
                  npx @agentsid/proxy run --policy agentsid.json -- npx {server.package}
                </code>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Badge */}
      <section className="mb-8">
        <BadgeSection server={server} />
      </section>

      <p className="text-xs text-muted-foreground/40 text-center">
        Scanned {new Date(server.scannedAt).toLocaleDateString()} ·{" "}
        <code className="font-mono">npx @agentsid/scanner -- npx {server.package}</code>
      </p>
    </div>
  );
};
