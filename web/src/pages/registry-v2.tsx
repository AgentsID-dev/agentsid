/**
 * Version B — "Observatory"
 * Aurora hero, glare cards with frosted glass, smooth category tab edge fade.
 */
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
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

const scoreGradient: Record<string, string> = {
  Safe: "from-emerald-400 to-emerald-300",
  Review: "from-amber-400 to-yellow-300",
  Risky: "from-orange-500 to-amber-400",
  Dangerous: "from-red-500 to-orange-400",
};

const safetyBadge: Record<string, string> = {
  Safe: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
  Review: "text-yellow-300 bg-yellow-400/10 border-yellow-400/20",
  Risky: "text-orange-300 bg-orange-400/10 border-orange-400/20",
  Dangerous: "text-red-300 bg-red-400/10 border-red-400/20",
};

const ICON_COLORS = ["from-blue-500 to-indigo-600","from-violet-500 to-purple-600","from-emerald-500 to-teal-600","from-orange-500 to-amber-600","from-pink-500 to-rose-600","from-cyan-500 to-sky-600","from-red-500 to-rose-600","from-yellow-500 to-amber-600"];

function getIconSources(pkg: string, iconUrl: string | null, repoUrl: string | null): string[] {
  const srcs: string[] = [];
  if (iconUrl && !iconUrl.includes("clearbit")) srcs.push(iconUrl);
  if (repoUrl) {
    const m = repoUrl.match(/github\.com\/([^/]+)/);
    if (m) srcs.push(`https://github.com/${m[1]}.png?size=48`);
  }
  const domain = pkg.startsWith("@") ? pkg.split("/")[0].replace("@", "") + ".com" : null;
  if (domain) srcs.push(`https://logo.clearbit.com/${domain}`);
  return srcs;
}

const ServerIcon = ({ pkg, iconUrl, repoUrl }: { pkg: string; iconUrl: string | null; repoUrl?: string | null }) => {
  const idx = pkg.charCodeAt(0) % ICON_COLORS.length;
  const letter = pkg.replace(/[@\/\-_]/g, "").charAt(0).toUpperCase() || "M";
  const sources = getIconSources(pkg, iconUrl, repoUrl ?? null);
  const [srcIdx, setSrcIdx] = useState(0);

  useEffect(() => { setSrcIdx(0); }, [pkg]);

  if (sources.length > 0 && srcIdx < sources.length) return (
    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10 backdrop-blur-sm">
      <img src={sources[srcIdx]} alt="" className="w-7 h-7 object-contain" onError={() => setSrcIdx(i => i + 1)} />
    </div>
  );
  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ICON_COLORS[idx]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
      <span className="text-sm font-bold text-white">{letter}</span>
    </div>
  );
};

// Glare card with mouse tracking
const GlareCard = ({ server }: { server: HallServer & { category: Category } }) => {
  const level = safetyLevel(server.score);
  const totalFindings = server.findings.high + server.findings.medium + server.findings.low;
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setGlare({ x, y, opacity: 1 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setGlare(g => ({ ...g, opacity: 0 }));
  }, []);

  return (
    <Link
      ref={cardRef}
      to={`/registry/${server.id}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative block rounded-2xl overflow-hidden border border-white/8 bg-white/[0.03] backdrop-blur-sm hover:border-white/15 transition-all duration-300 group"
    >
      {/* Glare overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: glare.opacity,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
        }}
      />
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ServerIcon pkg={server.package} iconUrl={server.iconUrl ?? null} repoUrl={server.repoUrl ?? null} />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                {server.package.replace(/^@[^/]+\//, "")}
              </h3>
              {server.package.startsWith("@") && (
                <p className="text-[10px] text-white/30 truncate">{server.package.split("/")[0]}</p>
              )}
            </div>
          </div>
          <span className={`text-2xl font-black tabular-nums flex-shrink-0 bg-gradient-to-br ${scoreGradient[level]} bg-clip-text text-transparent`}>
            {server.score}
          </span>
        </div>

        <p className="text-xs text-white/40 line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">
          {server.description ?? server.name}
        </p>

        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${safetyBadge[level]}`}>{level}</span>
          {totalFindings > 0 && <span className="text-white/25">{totalFindings} findings</span>}
          {server.tools > 0 && <span className="text-white/25">{server.tools} tools</span>}
          {server.stars != null && <span className="ml-auto text-white/20 text-[10px]">⭐ {server.stars.toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  );
};

const CATEGORIES: Category[] = ["All","Developer Tools","Database & SQL","Search & Knowledge","Cloud & Infrastructure","Communication","Data Science & ML","Security & Auth","Other"];
const PAGE_SIZE = 24;

export const RegistryV2 = () => {
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
    <div className="min-h-screen bg-[#050508]">
      {/* Aurora hero */}
      <div className="relative overflow-hidden border-b border-white/5 py-14 px-4">
        {/* Aurora layers — amber/orange brand palette */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[400px] rounded-full opacity-25"
          style={{ background: "radial-gradient(ellipse, #f59e0b 0%, #d97706 40%, transparent 70%)", filter: "blur(90px)" }} />
        <div className="absolute -top-20 right-0 w-[500px] h-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(ellipse, #ea580c 0%, #c2410c 40%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute top-10 left-1/3 w-[400px] h-[200px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #fbbf24 0%, #f59e0b 40%, transparent 70%)", filter: "blur(60px)" }} />

        <div className="relative max-w-2xl mx-auto text-center">
          <p className="text-xs font-medium text-white/40 uppercase tracking-[0.2em] mb-3">MCP Security Registry</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
            {HALL_STATS.total.toLocaleString()}
            <span className="text-white/30"> servers</span>
          </h1>
          <p className="text-sm text-white/30 mb-8">
            {HALL_STATS.fGrade.toLocaleString()} dangerous · {HALL_STATS.totalFindings.toLocaleString()} findings · zero A grades
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search MCP servers..."
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-11 pr-4 py-3.5 bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-2xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.07] transition-all"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category tabs with edge fade */}
        <div className="relative mb-4">
          <div className="flex items-center gap-1">
            <button onClick={() => tabsRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
              className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white/70 flex-shrink-0 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="relative flex-1 overflow-hidden">
              <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto scrollbar-none">
                {CATEGORIES.map(cat => {
                  const count = cat === "All" ? enriched.length : (categoryCounts[cat] ?? 0);
                  if (!count && cat !== "All") return null;
                  return (
                    <button key={cat} onClick={() => { setCategoryFilter(cat); resetPage(); }}
                      className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                        categoryFilter === cat ? "bg-amber-500 text-black" : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
                      }`}>
                      {cat} <span className="opacity-50">{count.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
              {/* Edge fades */}
              <div className="absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-[#050508] to-transparent pointer-events-none" />
              <div className="absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-[#050508] to-transparent pointer-events-none" />
            </div>
            <button onClick={() => tabsRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
              className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white/70 flex-shrink-0 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Safety pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(["All","Safe","Review","Risky","Dangerous"] as SafetyLevel[]).map(level => {
            const count = safetyCounts[level] ?? 0;
            const active = safetyFilter === level;
            return (
              <button key={level} onClick={() => { setSafetyFilter(level); resetPage(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  active ? "bg-amber-500 text-black border-amber-500" : "bg-white/5 text-white/40 border-white/5 hover:bg-white/8 hover:text-white/60"
                }`}>
                {level === "All" ? "All Levels" : level} <span className="opacity-60">{count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-white/20 mb-4">
          {filtered.length.toLocaleString()} servers{totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {pageItems.map(s => <GlareCard key={s.id} server={s} />)}
          {pageItems.length === 0 && (
            <div className="col-span-3 text-center text-white/20 py-16 text-sm">No servers match.</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mb-12">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-2 rounded-xl bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 disabled:opacity-20 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {(() => {
              const pages: number[] = [];
              if (totalPages <= 7) {
                for (let i = 0; i < totalPages; i++) pages.push(i);
              } else {
                const start = Math.max(0, Math.min(page - 3, totalPages - 7));
                for (let i = 0; i < 7; i++) pages.push(start + i);
              }
              return pages.map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-xl text-xs font-medium transition-all ${
                    page === p ? "bg-amber-500 text-black" : "bg-white/5 text-white/30 hover:bg-white/10"
                  }`}>
                  {p + 1}
                </button>
              ));
            })()}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="p-2 rounded-xl bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 disabled:opacity-20 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
