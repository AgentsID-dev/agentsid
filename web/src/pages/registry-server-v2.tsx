/**
 * Version B — "Observatory" server detail
 * Aurora background, glare panels, frosted glass, amber brand accents.
 */
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp, Shield, ArrowRight } from "lucide-react";
import { HALL_SERVERS, type HallFinding, type Grade } from "./hall-of-mcps-data";

const gradeToScore = (g: Grade | string | undefined) => ({ A: 95, B: 80, C: 65, D: 40, F: 15 }[g as Grade] ?? 100);

const severityConfig: Record<string, { dot: string; badge: string }> = {
  CRITICAL: { dot: "bg-red-400", badge: "text-red-300 bg-red-400/10 border-red-400/20" },
  HIGH:     { dot: "bg-red-400", badge: "text-red-300 bg-red-400/10 border-red-400/15" },
  MEDIUM:   { dot: "bg-yellow-400", badge: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20" },
  LOW:      { dot: "bg-blue-400", badge: "text-blue-300 bg-blue-400/10 border-blue-400/20" },
  INFO:     { dot: "bg-white/20", badge: "text-white/30 bg-white/5 border-white/10" },
};

const categoryLabel: Record<string, string> = {
  toxic_flow: "Toxic Data Flows", injection: "Prompt Injection", permissions: "Capability Risk",
  credential: "Data Exposure", schema: "Schema Issues", validation: "Schema Issues",
  auth: "Auth", output: "Output Safety", description: "Annotation Mismatch",
  naming: "Naming", hallucination: "Hallucination Risk", supply_chain: "Supply Chain",
  "data-flow": "Data Flow", secrets: "Secrets",
};

const scoreGradient = (score: number) =>
  score >= 70 ? "from-emerald-400 to-emerald-300"
  : score >= 50 ? "from-amber-400 to-yellow-300"
  : score >= 30 ? "from-orange-500 to-amber-400"
  : "from-red-500 to-orange-400";

const levelLabel = (score: number) =>
  score >= 70 ? "Safe" : score >= 50 ? "Review" : score >= 30 ? "Risky" : "Dangerous";

const levelBadge: Record<string, string> = {
  Safe:      "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  Review:    "text-yellow-300 bg-yellow-400/10 border-yellow-400/20",
  Risky:     "text-orange-300 bg-orange-400/10 border-orange-400/20",
  Dangerous: "text-red-300 bg-red-400/10 border-red-400/20",
};

// Glare panel — mouse-tracking highlight
const GlarePanel = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setGlare({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100, opacity: 1 });
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={() => setGlare(g => ({ ...g, opacity: 0 }))}
      className={`relative rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm overflow-hidden ${className ?? ""}`}>
      <div className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{ opacity: glare.opacity, background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.07) 0%, transparent 60%)` }} />
      {children}
    </div>
  );
};

const categoryIcon: Record<string, string> = {
  toxic_flow: "⚡", "data-flow": "⚡", injection: "🎯", supply_chain: "🔗",
  permissions: "🔒", credential: "🗄", auth: "🔑", output: "📤",
  description: "🏷", naming: "🏷", hallucination: "🧠", schema: "📋",
  validation: "📋", secrets: "🔐", other: "◆",
};

const severityIcon: Record<string, string> = {
  CRITICAL: "🛡",
  HIGH: "⚠",
  MEDIUM: "◆",
  LOW: "◇",
  INFO: "○",
};

const CategoryFindingRow = ({ finding }: { finding: HallFinding }) => {
  const cfg = severityConfig[finding.severity] ?? severityConfig.INFO;
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.015] transition-colors">
      <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${cfg.badge}`}>
        {finding.severity}
      </span>
      <div className="min-w-0">
        {finding.tool && <code className="text-[11px] text-amber-400/70 block mb-0.5">{finding.tool}</code>}
        <p className="text-xs text-white/45 leading-relaxed">{finding.description}</p>
      </div>
    </div>
  );
};

const CategoryGroup = ({ category, findings, forceOpen }: { category: string; findings: HallFinding[]; forceOpen?: boolean }) => {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const hasHigh = findings.some(f => f.severity === "CRITICAL" || f.severity === "HIGH");
  const hasMedium = findings.some(f => f.severity === "MEDIUM");
  const countColor = hasHigh ? "text-red-400" : hasMedium ? "text-yellow-400" : "text-blue-400";
  const icon = categoryIcon[category] ?? categoryIcon.other;

  return (
    <div className="border border-white/6 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.025] transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-base leading-none">{icon}</span>
          <span className="text-sm font-medium text-white/80">{categoryLabel[category] ?? category}</span>
          <span className={`text-sm font-bold ${countColor}`}>{findings.length}</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
      </button>
      {isOpen && <div className="border-t border-white/5">{findings.map((f, i) => <CategoryFindingRow key={i} finding={f} />)}</div>}
    </div>
  );
};

// Extract tool names from toxic flow descriptions like "`tool_a` → `tool_b`"
function parseToxicFlow(description: string): { from: string; to: string } | null {
  const match = description.match(/`([^`]+)`[^`]*`([^`]+)`/);
  if (match) return { from: match[1], to: match[2] };
  return null;
}

const AutopsyFinding = ({ finding, id, forceOpen }: { finding: HallFinding; id: string; forceOpen?: boolean }) => {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const cfg = severityConfig[finding.severity] ?? severityConfig.INFO;
  const isToxicFlow = finding.category === "toxic_flow" || finding.category === "data-flow";
  const flow = isToxicFlow ? parseToxicFlow(finding.description) : null;

  // Generate a short title from description
  const title = finding.description.length > 80
    ? finding.description.slice(0, 78) + "…"
    : finding.description;

  return (
    <div className="border border-white/6 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.025] transition-colors text-left">
        <span className="text-sm flex-shrink-0">{severityIcon[finding.severity] ?? "○"}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 ${cfg.badge}`}>
          {finding.severity}
        </span>
        <span className="text-[10px] font-mono text-white/20 flex-shrink-0">{id}</span>
        <span className="text-sm text-white/70 flex-1 min-w-0 truncate">{title}</span>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/20 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-2.5">
          {finding.tool && !flow && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/25 uppercase tracking-wider">Tool</span>
              <code className="text-xs text-amber-400/70 bg-amber-400/5 px-2 py-0.5 rounded">{finding.tool}</code>
            </div>
          )}
          {flow && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-white/25 uppercase tracking-wider">Flow</span>
              <code className="text-xs text-amber-400/70 bg-amber-400/5 px-2 py-0.5 rounded">{flow.from}</code>
              <ArrowRight className="w-3 h-3 text-white/30" />
              <code className="text-xs text-red-400/70 bg-red-400/5 px-2 py-0.5 rounded">{flow.to}</code>
            </div>
          )}
          <div className="flex items-start gap-2">
            <span className="text-[10px] text-white/25 uppercase tracking-wider mt-0.5">Detail</span>
            <p className="text-xs text-white/45 leading-relaxed">{finding.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/25 uppercase tracking-wider">Category</span>
            <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded">
              {categoryLabel[finding.category] ?? finding.category}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const DimBar = ({ label, score }: { label: string; score: number }) => {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  const gradient = score >= 80 ? "from-emerald-400 to-emerald-500"
    : score >= 60 ? "from-amber-400 to-yellow-500"
    : score >= 30 ? "from-orange-400 to-orange-500"
    : "from-red-400 to-red-500";

  const textColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400"
    : score >= 30 ? "text-orange-400" : "text-red-400";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/30 w-24 flex-shrink-0 capitalize">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700 ease-out`}
          style={{ width: `${animated}%` }} />
      </div>
      <span className={`text-xs tabular-nums w-6 text-right ${textColor}`}>{score}</span>
    </div>
  );
};

const ICON_COLORS = ["from-blue-500 to-indigo-600","from-violet-500 to-purple-600","from-emerald-500 to-teal-600","from-orange-500 to-amber-600","from-pink-500 to-rose-600","from-cyan-500 to-sky-600"];

// Derive fallback icon sources: clearbit domain → GitHub org avatar → letter
function getIconSources(pkg: string, iconUrl: string | null, repoUrl: string | null): string[] {
  const srcs: string[] = [];
  if (iconUrl && !iconUrl.includes("clearbit")) srcs.push(iconUrl);
  // GitHub org/user avatar from repo URL
  if (repoUrl) {
    const m = repoUrl.match(/github\.com\/([^/]+)/);
    if (m) srcs.push(`https://github.com/${m[1]}.png?size=64`);
  }
  // Clearbit from npm package scope or name
  const domain = pkg.startsWith("@")
    ? pkg.split("/")[0].replace("@", "") + ".com"
    : null;
  if (domain) srcs.push(`https://logo.clearbit.com/${domain}`);
  return srcs;
}

const ServerIcon = ({ pkg, iconUrl, repoUrl, idx, letter }: {
  pkg: string; iconUrl: string | null; repoUrl: string | null; idx: number; letter: string;
}) => {
  const sources = getIconSources(pkg, iconUrl, repoUrl);
  const [srcIdx, setSrcIdx] = useState(0);

  if (sources.length > 0 && srcIdx < sources.length) {
    return (
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img
          src={sources[srcIdx]}
          alt=""
          className="w-10 h-10 object-contain"
          onError={() => setSrcIdx(i => i + 1)}
        />
      </div>
    );
  }
  return (
    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ICON_COLORS[idx]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
      <span className="text-lg font-bold text-white">{letter}</span>
    </div>
  );
};

const MapPolicyPanel = ({ json, defaultCollapsed, variant }: { json: string; defaultCollapsed: boolean; variant: "observatory" | "terminal" | "punch" }) => {
  const [open, setOpen] = useState(!defaultCollapsed);
  if (variant === "observatory") return (
    <GlarePanel className="mb-8">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400/60" />
          <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">MAP Policy — agentsid.json</p>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
      </button>
      {open && <pre className="p-5 text-[11px] font-mono text-amber-400/50 overflow-x-auto leading-relaxed">{json}</pre>}
    </GlarePanel>
  );
  return null;
};

export const RegistryServerV2 = () => {
  const { slug } = useParams<{ slug: string }>();
  const server = HALL_SERVERS.find(s => s.id === slug);
  const [expandAll, setExpandAll] = useState(false);
  const [expandAutopsy, setExpandAutopsy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!server) return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/30 text-sm mb-4">Server not found</p>
        <Link to="/registry" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">← Registry</Link>
      </div>
    </div>
  );

  const level = levelLabel(server.score);
  const totalFindings = server.findings.high + server.findings.medium + server.findings.low;
  const installCmd = `npx -y ${server.package}`;
  const iconIdx = server.package.charCodeAt(0) % ICON_COLORS.length;
  const iconLetter = server.package.replace(/[@\/\-_]/g, "").charAt(0).toUpperCase() || "M";

  const dimScores = {
    descriptions: gradeToScore(server.categories.description),
    schemas: gradeToScore(server.categories.validation),
    capabilities: gradeToScore(server.categories.permissions),
    auth: gradeToScore(server.categories.auth),
    stability: gradeToScore(server.categories.output),
  };

  const findingsByCategory = useMemo(() => {
    const map: Record<string, HallFinding[]> = {};
    for (const f of server.topFindings) {
      const k = (f.category ?? "other").toLowerCase();
      if (!map[k]) map[k] = [];
      map[k].push(f);
    }
    const priority = ["toxic_flow", "data-flow", "injection", "supply_chain", "permissions", "credential", "auth", "secrets", "output", "hallucination"];
    return Object.entries(map).sort((a, b) => {
      const ai = priority.indexOf(a[0]), bi = priority.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1].length - a[1].length;
    });
  }, [server.topFindings]);

  const sortedFindings = useMemo(() => {
    const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    const categoryPriority = ["toxic_flow", "data-flow", "injection", "supply_chain", "permissions", "credential"];
    return [...server.topFindings].sort((a, b) => {
      const sd = (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5);
      if (sd !== 0) return sd;
      const ai = categoryPriority.indexOf(a.category), bi = categoryPriority.indexOf(b.category);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return 0;
    });
  }, [server.topFindings]);

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="min-h-screen bg-[#050508] text-white">
      {/* Aurora background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -left-40 w-[700px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(ellipse, #f59e0b 0%, #d97706 40%, transparent 70%)", filter: "blur(100px)" }} />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #ea580c 0%, #c2410c 50%, transparent 70%)", filter: "blur(90px)" }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/registry" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Registry
        </Link>

        {/* Hero header */}
        <GlarePanel className="mb-6 p-6 sm:p-8">
          <div className="flex items-start gap-5">
            <ServerIcon
              pkg={server.package}
              iconUrl={server.iconUrl ?? null}
              repoUrl={server.repoUrl ?? null}
              idx={iconIdx}
              letter={iconLetter}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400/50" />
                {server.package.startsWith("@") && (
                  <span className="text-xs text-white/25">{server.package.split("/")[0]}</span>
                )}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${levelBadge[level]}`}>{level}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 break-all">
                {server.package.replace(/^@[^/]+\//, "")}
              </h1>
              {server.description && (
                <p className="text-sm text-white/40 leading-relaxed max-w-xl mb-3">{server.description}</p>
              )}
              {/* Metadata row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-white/30">
                <span><span className="text-white/50">{totalFindings}</span> findings</span>
                {server.findings.high > 0 && (
                  <span className="text-red-400">{server.findings.high} high severity</span>
                )}
                {server.stars != null && (
                  <span className="flex items-center gap-1">
                    <span className="text-amber-400">★</span>
                    <span className="text-white/50">{server.stars.toLocaleString()}</span> stars
                  </span>
                )}
                {server.license && <span>{server.license}</span>}
                <a href={`https://www.npmjs.com/package/${server.package}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-0.5 hover:text-white/60 transition-colors">
                  npm <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                </a>
                {server.repoUrl && (
                  <a href={server.repoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-0.5 hover:text-white/60 transition-colors">
                    GitHub <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  </a>
                )}
                {server.homepage && server.homepage !== server.repoUrl && (
                  <a href={server.homepage} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-0.5 hover:text-white/60 transition-colors">
                    Website <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                  </a>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-white/25 mb-1">Trust Score</p>
              <span className={`text-5xl font-black tabular-nums bg-gradient-to-br ${scoreGradient(server.score)} bg-clip-text text-transparent`}>
                {server.score}
              </span>
              <p className="text-xs text-white/20">/100</p>
            </div>
          </div>
        </GlarePanel>

        {/* Install command */}
        <GlarePanel className="mb-6">
          <div className="flex items-center gap-3 px-5 py-3.5">
            <span className="text-amber-400/50 text-sm flex-shrink-0 font-mono">$</span>
            <span className="text-sm text-white/50 font-mono flex-1 truncate">{installCmd}</span>
            <button onClick={() => copy(installCmd)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-white/20 hover:text-white/50">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </GlarePanel>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Tools", value: server.tools },
            { label: "Findings", value: totalFindings },
            { label: "High/Critical", value: server.findings.high, highlight: server.findings.high > 0 },
            { label: "Scanned", value: new Date(server.scannedAt).toLocaleDateString() },
          ].map(({ label, value, highlight }) => (
            <GlarePanel key={label} className="p-4 text-center">
              <p className={`text-xl font-bold mb-0.5 ${highlight ? "text-red-400" : "text-white/80"}`}>{value}</p>
              <p className="text-xs text-white/25">{label}</p>
            </GlarePanel>
          ))}
        </div>

        {/* Analysis dimensions */}
        <GlarePanel className="mb-6 p-5">
          <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">Analysis Dimensions</p>
          <div className="space-y-3">
            {Object.entries(dimScores).map(([label, score]) => <DimBar key={label} label={label} score={score} />)}
          </div>
        </GlarePanel>

        {/* Findings — category grouped */}
        {findingsByCategory.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Findings</p>
              <button onClick={() => setExpandAll(!expandAll)}
                className="text-xs text-white/25 hover:text-white/50 transition-colors">
                {expandAll ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {findingsByCategory.map(([cat, findings]) =>
                <CategoryGroup key={cat} category={cat} findings={findings} forceOpen={expandAll} />
              )}
            </div>
          </div>
        )}

        {/* Deep Autopsy — individual MCPR rows */}
        {sortedFindings.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">Deep Autopsy</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400/70 border border-amber-400/20">
                  Static Analysis
                </span>
              </div>
              <button onClick={() => setExpandAutopsy(!expandAutopsy)}
                className="text-xs text-amber-400/50 hover:text-amber-400 transition-colors">
                {expandAutopsy ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div className="space-y-1.5">
              {sortedFindings.map((f, i) => (
                <AutopsyFinding
                  key={i}
                  finding={f}
                  id={`MCPR-${String(i + 1).padStart(3, "0")}`}
                  forceOpen={expandAutopsy}
                />
              ))}
            </div>
          </div>
        )}

        {/* MAP policy */}
        {server.mapPolicy && (() => {
          const json = JSON.stringify(server.mapPolicy, null, 2);
          const isLarge = json.length > 500;
          return <MapPolicyPanel json={json} defaultCollapsed={isLarge} variant="observatory" />;
        })()}

        {/* Learn More */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-white/20 uppercase tracking-widest mb-4">Learn More</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { label: "About the trust score", to: "/docs#trust-score" },
              { label: "How the scan works", to: "/docs#how-it-works" },
              { label: "Scan with AgentsID CLI", to: "/docs#cli-init" },
              { label: "Injection attack details", to: "/blog/multi-agent-auth-gap-2026" },
              { label: "Research: MCP toxic data flows", to: "/blog/state-of-mcp-server-security-2026" },
            ].map(({ label, to }) => (
              <Link key={label} to={to}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/6 bg-white/[0.02] text-xs text-white/35 hover:text-white/60 hover:border-white/12 hover:bg-white/[0.04] transition-all">
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <button className="inline-flex items-center gap-1.5 text-xs text-white/20 hover:text-white/40 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Request rescan
            </button>
            <button className="inline-flex items-center gap-1.5 text-xs text-white/20 hover:text-white/40 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
              Report false positive
            </button>
          </div>
        </div>

        <p className="text-[10px] text-white/10 text-center pb-4">
          npx @agentsid/scanner -- npx {server.package}
        </p>
      </div>
    </div>
  );
};
