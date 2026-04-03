/**
 * Version C — "Minimal Punch" server detail
 * Flat sections, colored left border, bold score, Linear aesthetic.
 */
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { HALL_SERVERS, type HallFinding, type Grade } from "./hall-of-mcps-data";

const gradeToScore = (g: Grade | string | undefined) => ({ A: 95, B: 80, C: 65, D: 40, F: 15 }[g as Grade] ?? 100);

const severityColor: Record<string, string> = {
  CRITICAL: "text-red-400 bg-red-400/8",
  HIGH:     "text-red-400 bg-red-400/6",
  MEDIUM:   "text-yellow-400 bg-yellow-400/8",
  LOW:      "text-blue-400 bg-blue-400/8",
  INFO:     "text-white/30 bg-white/5",
};

const categoryLabel: Record<string, string> = {
  toxic_flow: "Toxic Data Flows", injection: "Prompt Injection", permissions: "Capability Risk",
  credential: "Data Exposure", schema: "Schema Issues", validation: "Schema Issues",
  auth: "Auth", output: "Output Safety", description: "Annotation Mismatch",
  naming: "Naming", hallucination: "Hallucination Risk", supply_chain: "Supply Chain",
  "data-flow": "Data Flow", secrets: "Secrets",
};

function safetyLevel(score: number) {
  if (score >= 70) return "Safe";
  if (score >= 50) return "Review";
  if (score >= 30) return "Risky";
  return "Dangerous";
}

const borderColor: Record<string, string> = {
  Safe:      "border-l-emerald-500",
  Review:    "border-l-yellow-500",
  Risky:     "border-l-orange-500",
  Dangerous: "border-l-red-500",
};

const scoreColor: Record<string, string> = {
  Safe:      "text-emerald-400",
  Review:    "text-yellow-400",
  Risky:     "text-orange-400",
  Dangerous: "text-red-400",
};

const badgeColor: Record<string, string> = {
  Safe:      "text-emerald-400 bg-emerald-400/8",
  Review:    "text-yellow-400 bg-yellow-400/8",
  Risky:     "text-orange-400 bg-orange-400/8",
  Dangerous: "text-red-400 bg-red-400/8",
};

const ICON_COLORS = ["bg-blue-500","bg-purple-500","bg-emerald-500","bg-orange-500","bg-pink-500","bg-cyan-500","bg-red-500","bg-yellow-500"];

const FindingRow = ({ finding }: { finding: HallFinding }) => (
  <div className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.015] transition-colors">
    <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded mt-0.5 ${severityColor[finding.severity] ?? severityColor.INFO}`}>
      {finding.severity}
    </span>
    <div className="min-w-0">
      {finding.tool && <code className="text-[11px] text-amber-400/70 block mb-0.5">{finding.tool}</code>}
      <p className="text-xs text-white/45 leading-relaxed">{finding.description}</p>
    </div>
  </div>
);

const FindingGroup = ({ category, findings, forceOpen }: { category: string; findings: HallFinding[]; forceOpen?: boolean }) => {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const hasHigh = findings.some(f => f.severity === "CRITICAL" || f.severity === "HIGH");
  const hasMedium = findings.some(f => f.severity === "MEDIUM");
  const indicatorColor = hasHigh ? "bg-red-400" : hasMedium ? "bg-yellow-400" : "bg-blue-400/60";

  return (
    <div className="border border-white/6 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.035] transition-colors">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${indicatorColor}`} />
          <span className="text-sm text-white/70">{categoryLabel[category] ?? category}</span>
          <span className="text-xs text-white/25">{findings.length}</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
      </button>
      {isOpen && <div>{findings.map((f, i) => <FindingRow key={i} finding={f} />)}</div>}
    </div>
  );
};

const DimRow = ({ label, score }: { label: string; score: number }) => {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-yellow-500" : score >= 30 ? "bg-orange-500" : "bg-red-500";
  const textColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : score >= 30 ? "text-orange-400" : "text-red-400";
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/40 w-28 flex-shrink-0 capitalize">{label}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-semibold tabular-nums w-7 text-right ${textColor}`}>{score}</span>
    </div>
  );
};

const MapPolicyPunch = ({ json, defaultCollapsed }: { json: string; defaultCollapsed: boolean }) => {
  const [open, setOpen] = useState(!defaultCollapsed);
  return (
    <div className="bg-neutral-900 border border-white/6 rounded-xl overflow-hidden mb-8">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
        <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest">MAP Policy — agentsid.json</p>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
      </button>
      {open && <pre className="p-5 text-[11px] font-mono text-white/35 overflow-x-auto leading-relaxed">{json}</pre>}
    </div>
  );
};

export const RegistryServerV3 = () => {
  const { slug } = useParams<{ slug: string }>();
  const server = HALL_SERVERS.find(s => s.id === slug);
  const [expandAll, setExpandAll] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!server) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-white/30 text-sm mb-3">Server not found</p>
        <Link to="/registry-v3" className="text-white/50 hover:text-white text-sm">← Registry</Link>
      </div>
    </div>
  );

  const level = safetyLevel(server.score);
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
      const k = f.category || "other";
      if (!map[k]) map[k] = [];
      map[k].push(f);
    }
    const priority = ["toxic_flow", "data-flow", "injection", "supply_chain", "permissions", "credential"];
    return Object.entries(map).sort((a, b) => {
      const ai = priority.indexOf(a[0]), bi = priority.indexOf(b[0]);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return b[1].length - a[1].length;
    });
  }, [server.topFindings]);

  const copy = (text: string) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/registry-v3" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Registry
        </Link>

        {/* Header card with left border accent */}
        <div className={`bg-neutral-900 border border-white/6 border-l-2 ${borderColor[level]} rounded-r-2xl p-5 sm:p-6 mb-4`}>
          <div className="flex items-start gap-4">
            {server.iconUrl ? (
              <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-white/8 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={server.iconUrl} alt="" className="w-8 h-8 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-xl ${ICON_COLORS[iconIdx]} flex items-center justify-center flex-shrink-0`}>
                <span className="text-base font-bold text-white">{iconLetter}</span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              {server.package.startsWith("@") && (
                <p className="text-xs text-white/25 mb-0.5">{server.package.split("/")[0]}</p>
              )}
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1.5 break-all">
                {server.package.replace(/^@[^/]+\//, "")}
              </h1>
              {server.description && (
                <p className="text-sm text-white/40 leading-relaxed">{server.description}</p>
              )}
            </div>

            <div className="flex-shrink-0 text-right">
              <span className={`text-4xl font-black tabular-nums leading-none ${scoreColor[level]}`}>
                {server.score}
              </span>
              <p className="text-[10px] text-white/20 mt-0.5">/100</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${badgeColor[level]}`}>{level}</span>
            {totalFindings > 0 && <span className="text-xs text-white/25">{totalFindings} findings</span>}
            {server.tools > 0 && <span className="text-xs text-white/25">{server.tools} tools</span>}
            {server.findings.high > 0 && (
              <span className="text-xs text-red-400">{server.findings.high} high</span>
            )}
            <span className="ml-auto text-xs text-white/20">
              {new Date(server.scannedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Install command */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-white/6 rounded-xl px-4 py-3 mb-4 font-mono">
          <span className="text-amber-400/50 flex-shrink-0">$</span>
          <span className="text-sm text-white/50 flex-1 truncate">{installCmd}</span>
          <button onClick={() => copy(installCmd)} className="flex-shrink-0 p-1 text-white/20 hover:text-white/50 transition-colors">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Analysis dimensions */}
        <div className="bg-neutral-900 border border-white/6 rounded-xl px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-white/25 uppercase tracking-widest mb-3">Analysis</p>
          {Object.entries(dimScores).map(([label, score]) => <DimRow key={label} label={label} score={score} />)}
        </div>

        {/* Findings */}
        {findingsByCategory.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-white/25 uppercase tracking-widest">Findings</p>
              <button onClick={() => setExpandAll(!expandAll)}
                className="text-xs text-white/30 hover:text-white/60 transition-colors">
                {expandAll ? "Collapse all" : "Expand all"}
              </button>
            </div>
            <div className="space-y-2">
              {findingsByCategory.map(([cat, findings]) =>
                <FindingGroup key={cat} category={cat} findings={findings} forceOpen={expandAll} />
              )}
            </div>
          </div>
        )}

        {/* MAP policy */}
        {server.mapPolicy && (() => {
          const json = JSON.stringify(server.mapPolicy, null, 2);
          return <MapPolicyPunch json={json} defaultCollapsed={json.length > 500} />;
        })()}

        <p className="text-[10px] text-white/10 text-center">
          npx @agentsid/scanner -- npx {server.package}
        </p>
      </div>
    </div>
  );
};
