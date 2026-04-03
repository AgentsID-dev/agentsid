/**
 * Version A — "Classified" server detail
 * Terminal aesthetic, monospace, encrypted score reveal, beam accents.
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp, Terminal } from "lucide-react";

import { HALL_SERVERS, type HallFinding, type Grade } from "./hall-of-mcps-data";

const gradeToScore = (g: Grade | string | undefined) => ({ A: 95, B: 80, C: 65, D: 40, F: 15 }[g as Grade] ?? 100);

const severityColor: Record<string, string> = {
  CRITICAL: "text-red-400 border-red-400/40",
  HIGH: "text-red-400 border-red-400/20",
  MEDIUM: "text-yellow-400 border-yellow-400/20",
  LOW: "text-blue-400 border-blue-400/20",
  INFO: "text-white/30 border-white/10",
};

const categoryLabel: Record<string, string> = {
  toxic_flow: "TOXIC_FLOWS", injection: "PROMPT_INJECTION", permissions: "CAPABILITY_RISK",
  credential: "DATA_EXPOSURE", schema: "SCHEMA_ISSUES", validation: "SCHEMA_ISSUES",
  auth: "AUTH", output: "OUTPUT_SAFETY", description: "ANNOTATION_MISMATCH",
  naming: "NAMING", hallucination: "HALLUCINATION_RISK", supply_chain: "SUPPLY_CHAIN",
  "data-flow": "DATA_FLOW", secrets: "SECRETS",
};

const CHARS = "0123456789ABCDEF";
const EncryptedScore = ({ score }: { score: number }) => {
  const [display, setDisplay] = useState("--");
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    let i = 0;
    const target = String(score);
    intervalRef.current = setInterval(() => {
      setDisplay(target.split("").map((_, idx) => idx < i ? target[idx] : CHARS[Math.floor(Math.random() * CHARS.length)]).join(""));
      i += 0.3;
      if (i >= target.length + 1) { clearInterval(intervalRef.current!); setDisplay(target); }
    }, 50);
    return () => clearInterval(intervalRef.current!);
  }, [score]);
  const color = score >= 70 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : score >= 30 ? "text-orange-400" : "text-red-400";
  return <span className={`text-6xl font-black font-mono tabular-nums ${color}`}>{display}</span>;
};

const FindingRow = ({ finding }: { finding: HallFinding }) => (
  <div className="flex items-start gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
    <span className={`flex-shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 border rounded ${severityColor[finding.severity] ?? severityColor.INFO}`}>
      {finding.severity}
    </span>
    <div className="min-w-0">
      {finding.tool && <code className="text-[11px] font-mono text-amber-400/80 block mb-0.5">{finding.tool}</code>}
      <p className="text-xs font-mono text-white/50 leading-relaxed">{finding.description}</p>
    </div>
  </div>
);

const FindingGroup = ({ category, findings, forceOpen }: { category: string; findings: HallFinding[]; forceOpen?: boolean }) => {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;
  const worst = findings.some(f => f.severity === "CRITICAL" || f.severity === "HIGH") ? "text-red-400"
    : findings.some(f => f.severity === "MEDIUM") ? "text-yellow-400" : "text-blue-400";

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono font-bold ${worst}`}>●</span>
          <span className="text-xs font-mono text-white/70">{categoryLabel[category] ?? category.toUpperCase()}</span>
          <span className="text-[10px] font-mono text-white/20 border border-white/10 px-1.5 rounded">{findings.length}</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-white/20" /> : <ChevronDown className="w-3.5 h-3.5 text-white/20" />}
      </button>
      {isOpen && <div>{findings.map((f, i) => <FindingRow key={i} finding={f} />)}</div>}
    </div>
  );
};

const DimBar = ({ label, score }: { label: string; score: number }) => {
  const color = score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : score >= 30 ? "#f97316" : "#f87171";
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-mono text-white/30 w-24 flex-shrink-0">{label.toUpperCase()}</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-mono w-6 text-right" style={{ color }}>{score}</span>
    </div>
  );
};

const MapPolicyTerminal = ({ json, defaultCollapsed }: { json: string; defaultCollapsed: boolean }) => {
  const [open, setOpen] = useState(!defaultCollapsed);
  return (
    <div className="mb-8 border border-amber-400/10 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-400/5 border-b border-amber-400/10 hover:bg-amber-400/[0.07] transition-colors">
        <p className="text-[10px] font-mono text-amber-400/70 uppercase tracking-widest">MAP_POLICY // agentsid.json</p>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-amber-400/40" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-400/40" />}
      </button>
      {open && <pre className="p-4 text-[11px] font-mono text-amber-400/60 overflow-x-auto leading-relaxed">{json}</pre>}
    </div>
  );
};

export const RegistryServerV1 = () => {
  const { slug } = useParams<{ slug: string }>();
  const server = HALL_SERVERS.find(s => s.id === slug);
  const [expandAll, setExpandAll] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!server) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="text-center font-mono">
        <p className="text-white/30 text-sm mb-4">SERVER_NOT_FOUND</p>
        <Link to="/registry-v1" className="text-amber-400/70 hover:text-amber-400 text-xs">← REGISTRY</Link>

      </div>
    </div>
  );

  const level = server.score >= 70 ? "SAFE" : server.score >= 50 ? "REVIEW" : server.score >= 30 ? "RISKY" : "DANGEROUS";
  const levelColor = server.score >= 70 ? "text-emerald-400" : server.score >= 50 ? "text-yellow-400" : server.score >= 30 ? "text-orange-400" : "text-red-400";
  const totalFindings = server.findings.high + server.findings.medium + server.findings.low;
  const installCmd = `npx -y ${server.package}`;

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
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Dot grid bg */}
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/registry-v1" className="inline-flex items-center gap-1.5 text-xs font-mono text-white/30 hover:text-white/60 mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> REGISTRY
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-amber-400/50" />
              <span className="text-[10px] font-mono text-white/20">{server.package.startsWith("@") ? server.package.split("/")[0] : "npm"}</span>
              <span className={`text-[10px] font-mono font-bold border px-1.5 py-0.5 rounded ${levelColor} border-current/30`}>{level}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-mono text-white mb-2 break-all">
              {server.package.replace(/^@[^/]+\//, "")}
            </h1>
            {server.description && <p className="text-sm font-mono text-white/30 leading-relaxed max-w-xl">{server.description}</p>}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-[10px] font-mono text-white/20 mb-1">TRUST_SCORE</p>
            <EncryptedScore score={server.score} />
            <p className="text-[10px] font-mono text-white/20">/100</p>
          </div>
        </div>

        {/* Install */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/8 rounded-lg px-4 py-2.5 font-mono text-sm mb-6">
          <span className="text-amber-400/50 flex-shrink-0">$</span>
          <span className="text-white/50 flex-1 truncate">{installCmd}</span>
          <button onClick={() => copy(installCmd)} className="flex-shrink-0 p-1 hover:text-white/60 transition-colors text-white/20">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 text-xs font-mono text-white/30 mb-8 pb-8 border-b border-white/5">
          <span><span className="text-white/70">{server.tools}</span> tools</span>
          <span><span className="text-white/70">{totalFindings}</span> findings</span>
          {server.findings.high > 0 && <span><span className="text-red-400">{server.findings.high}</span> high</span>}
          {server.maintainer && <span><span className="text-white/50">{server.maintainer}</span></span>}
          {server.license && <span>{server.license}</span>}
          <span className="ml-auto">{new Date(server.scannedAt).toLocaleDateString()}</span>
        </div>

        {/* Dimension bars */}
        <div className="mb-8">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mb-3">ANALYSIS_DIMENSIONS</p>
          <div className="space-y-2.5">
            {Object.entries(dimScores).map(([label, score]) => <DimBar key={label} label={label} score={score} />)}
          </div>
        </div>

        {/* Findings */}
        {findingsByCategory.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">FINDINGS</p>
              <button onClick={() => setExpandAll(!expandAll)} className="text-[10px] font-mono text-white/20 hover:text-white/40 transition-colors">
                {expandAll ? "COLLAPSE_ALL" : "EXPAND_ALL"}
              </button>
            </div>
            <div className="space-y-1.5">
              {findingsByCategory.map(([cat, findings]) =>
                <FindingGroup key={cat} category={cat} findings={findings} forceOpen={expandAll} />
              )}
            </div>
          </div>
        )}

        {/* MAP policy */}
        {server.mapPolicy && (() => {
          const json = JSON.stringify(server.mapPolicy, null, 2);
          return <MapPolicyTerminal json={json} defaultCollapsed={json.length > 500} />;
        })()}

        <p className="text-[10px] font-mono text-white/10 text-center">
          npx @agentsid/scanner -- npx {server.package}
        </p>
      </div>
    </div>
  );
};
