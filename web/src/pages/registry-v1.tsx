/**
 * Version A — "Classified"
 * Security-terminal aesthetic. Dot grid hero, animated border beams, monospace everything.
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Terminal } from "lucide-react";
import { HALL_SERVERS, HALL_STATS, type HallServer } from "./hall-of-mcps-data";

type SafetyLevel = "All" | "Safe" | "Review" | "Risky" | "Dangerous";
type Category = "All" | "Developer Tools" | "Database & SQL" | "Cloud & Infrastructure" | "Communication" | "Search & Knowledge" | "Data Science & ML" | "Security & Auth" | "Other";

function safetyLevel(score: number): Exclude<SafetyLevel, "All"> {
  if (score >= 70) return "Safe";
  if (score >= 50) return "Review";
  if (score >= 30) return "Risky";
  return "Dangerous";
}

const CATEGORY_PATTERNS: [Category, RegExp][] = [
  ["Database & SQL", /postgres|mysql|sqlite|mongo|redis|sql|db|database|supabase|neon|drizzle/i],
  ["Cloud & Infrastructure", /aws|azure|gcp|cloud|k8s|kubernetes|docker|terraform|s3|lambda|vercel|railway|infra/i],
  ["Communication", /slack|email|sms|discord|teams|telegram|whatsapp|twilio|sendgrid|message|chat/i],
  ["Search & Knowledge", /search|rag|vector|embed|knowledge|index|elastic|algolia|pinecone|chroma/i],
  ["Data Science & ML", /ml|ai|llm|model|training|dataset|torch|tensorflow|hugging|openai|anthropic|nlp|analytics/i],
  ["Security & Auth", /auth|oauth|jwt|security|vault|secret|cred|iam|rbac|key|cert|ssl/i],
  ["Developer Tools", /github|gitlab|git|jira|linear|figma|npm|code|vscode|ide|ci|cd|test|lint|debug/i],
];

function detectCategory(server: HallServer): Category {
  const haystack = `${server.package} ${server.name}`;
  for (const [cat, re] of CATEGORY_PATTERNS) if (re.test(haystack)) return cat;
  return "Other";
}

const beamColor: Record<string, string> = {
  Safe: "#34d399",
  Review: "#fbbf24",
  Risky: "#f97316",
  Dangerous: "#f87171",
};

const scoreText: Record<string, string> = {
  Safe: "text-emerald-400",
  Review: "text-yellow-400",
  Risky: "text-orange-400",
  Dangerous: "text-red-400",
};

const levelBadge: Record<string, string> = {
  Safe: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
  Review: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  Risky: "text-orange-400 border-orange-400/30 bg-orange-400/5",
  Dangerous: "text-red-400 border-red-400/30 bg-red-400/5",
};

// Encrypted score reveal
const CHARS = "0123456789";
const EncryptedScore = ({ score, level }: { score: number; level: string }) => {
  const [display, setDisplay] = useState("??");
  const [revealed, setRevealed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const reveal = () => {
    if (revealed) return;
    let iterations = 0;
    const target = String(score);
    intervalRef.current = setInterval(() => {
      setDisplay(
        target.split("").map((_, i) =>
          i < iterations ? target[i] : CHARS[Math.floor(Math.random() * CHARS.length)]
        ).join("")
      );
      iterations += 0.5;
      if (iterations >= target.length + 1) {
        clearInterval(intervalRef.current);
        setDisplay(target);
        setRevealed(true);
      }
    }, 40);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <span
      className={`text-2xl font-black font-mono tabular-nums ${scoreText[level]} cursor-default select-none`}
      onMouseEnter={reveal}
    >
      {display}
    </span>
  );
};

// Beam border card
const BeamCard = ({ server }: { server: HallServer & { category: Category } }) => {
  const level = safetyLevel(server.score);
  const color = beamColor[level];
  const totalFindings = server.findings.high + server.findings.medium + server.findings.low;

  return (
    <Link
      to={`/registry-v1/${server.id}`}
      className="block relative rounded-xl overflow-hidden group bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-colors"
      style={{ "--beam-color": color } as React.CSSProperties}
    >
      {/* Animated beam border */}
      <span className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(ellipse 80px 80px at var(--beam-x, 50%) var(--beam-y, 0%), ${color}22, transparent)`,
          border: `1px solid ${color}33`,
        }}
      />
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-white/30 mb-0.5 truncate">{server.package.startsWith("@") ? server.package.split("/")[0] : "npm"}</p>
            <h3 className="text-sm font-mono font-semibold text-white/90 truncate group-hover:text-white transition-colors">
              {server.package.replace(/^@[^/]+\//, "")}
            </h3>
          </div>
          <EncryptedScore score={server.score} level={level} />
        </div>
        <p className="text-xs text-white/40 line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem] font-mono">
          {server.description ?? server.name}
        </p>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className={`px-1.5 py-0.5 rounded border ${levelBadge[level]}`}>{level.toUpperCase()}</span>
          {totalFindings > 0 && <span className="text-white/30">{totalFindings} findings</span>}
          {server.tools > 0 && <span className="text-white/30">{server.tools} tools</span>}
          {server.stars != null && <span className="ml-auto text-white/20">★ {server.stars.toLocaleString()}</span>}
        </div>
      </div>
      {/* Bottom beam line */}
      <div
        className="absolute bottom-0 left-0 h-[1px] w-0 group-hover:w-full transition-all duration-700 ease-out"
        style={{ background: `linear-gradient(to right, transparent, ${color}88, transparent)` }}
      />
    </Link>
  );
};

const CATEGORIES: Category[] = ["All","Developer Tools","Database & SQL","Search & Knowledge","Cloud & Infrastructure","Communication","Data Science & ML","Security & Auth","Other"];
const PAGE_SIZE = 24;

export const RegistryV1 = () => {
  const [search, setSearch] = useState("");
  const [safetyFilter, setSafetyFilter] = useState<SafetyLevel>("All");
  const [categoryFilter, setCategoryFilter] = useState<Category>("All");
  const [page, setPage] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  const enriched = useMemo(() =>
    HALL_SERVERS.filter(s => s.tools > 0).map(s => ({ ...s, category: detectCategory(s) })), []);

  const categoryCounts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    for (const s of enriched) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [enriched]);

  const safetyCounts = useMemo(() => {
    const c: Partial<Record<SafetyLevel, number>> = { All: enriched.length };
    for (const s of enriched) { const l = safetyLevel(s.score); c[l] = (c[l] ?? 0) + 1; }
    return c;
  }, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (safetyFilter !== "All") list = list.filter(s => safetyLevel(s.score) === safetyFilter);
    if (categoryFilter !== "All") list = list.filter(s => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.package.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return list;
  }, [enriched, safetyFilter, categoryFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const resetPage = () => setPage(0);

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Dot grid hero */}
      <div className="relative border-b border-white/5 py-12 px-4 overflow-hidden">
        <div className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono text-emerald-400/70 border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE SCAN DATABASE · {HALL_STATS.total.toLocaleString()} SERVERS
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-mono text-white mb-2 tracking-tight">
            MCP Security Registry
          </h1>
          <p className="text-sm font-mono text-white/30 mb-6">
            {HALL_STATS.fGrade.toLocaleString()} dangerous · {HALL_STATS.totalFindings.toLocaleString()} findings · {HALL_STATS.totalTools.toLocaleString()} tools analyzed
          </p>
          <div className="relative max-w-xl mx-auto">
            <Terminal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
            <input
              type="text"
              placeholder="search servers..."
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-lg text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-400/30 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category tabs */}
        <div className="flex items-center gap-1 mb-4">
          <button onClick={() => tabsRef.current?.scrollBy({ left: -200, behavior: "smooth" })} className="p-1.5 rounded border border-white/5 text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div ref={tabsRef} className="flex gap-1 overflow-x-auto scrollbar-none flex-1">
            {CATEGORIES.map(cat => {
              const count = cat === "All" ? enriched.length : (categoryCounts[cat] ?? 0);
              if (!count && cat !== "All") return null;
              return (
                <button key={cat} onClick={() => { setCategoryFilter(cat); resetPage(); }}
                  className={`flex-shrink-0 px-3 py-1 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                    categoryFilter === cat ? "bg-white/10 text-white border border-white/10" : "text-white/30 hover:text-white/60"
                  }`}>
                  {cat} <span className="opacity-40">{count.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
          <button onClick={() => tabsRef.current?.scrollBy({ left: 200, behavior: "smooth" })} className="p-1.5 rounded border border-white/5 text-white/30 hover:text-white/60 transition-colors flex-shrink-0">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Safety filters */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {(["All","Safe","Review","Risky","Dangerous"] as SafetyLevel[]).map(level => {
            const count = safetyCounts[level] ?? 0;
            const active = safetyFilter === level;
            const color = level === "Safe" ? "emerald" : level === "Review" ? "yellow" : level === "Risky" ? "orange" : level === "Dangerous" ? "red" : null;
            return (
              <button key={level} onClick={() => { setSafetyFilter(level); resetPage(); }}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors border ${
                  active && color ? `text-${color}-400 border-${color}-400/30 bg-${color}-400/5` :
                  active ? "text-white border-white/20 bg-white/5" :
                  "text-white/30 border-white/5 hover:text-white/60 hover:border-white/10"
                }`}>
                {level === "All" ? "ALL LEVELS" : level.toUpperCase()} <span className="opacity-50">{count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] font-mono text-white/20 mb-4">
          {filtered.length.toLocaleString()} RESULTS {totalPages > 1 && `· PAGE ${page + 1}/${totalPages}`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-8">
          {pageItems.map(s => <BeamCard key={s.id} server={s} />)}
          {pageItems.length === 0 && (
            <div className="col-span-3 text-center text-white/20 font-mono py-16 text-sm">NO RESULTS</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mb-12">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-2 rounded border border-white/5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3 + i, totalPages - 1));
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-xs font-mono transition-colors ${
                    page === p ? "bg-white/10 text-white border border-white/20" : "text-white/30 hover:text-white/50"
                  }`}>
                  {p + 1}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="p-2 rounded border border-white/5 text-white/30 hover:text-white/60 disabled:opacity-20 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
