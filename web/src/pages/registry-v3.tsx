/**
 * Version C — "Minimal Punch"
 * Flat cards, colored left border by safety level, huge bold scores, shimmer on hover.
 */
import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Shield } from "lucide-react";
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

const borderColor: Record<string, string> = {
  Safe: "border-l-emerald-500",
  Review: "border-l-yellow-500",
  Risky: "border-l-orange-500",
  Dangerous: "border-l-red-500",
};

const scoreColor: Record<string, string> = {
  Safe: "text-emerald-400",
  Review: "text-yellow-400",
  Risky: "text-orange-400",
  Dangerous: "text-red-400",
};

const badgeColor: Record<string, string> = {
  Safe: "text-emerald-400 bg-emerald-400/8",
  Review: "text-yellow-400 bg-yellow-400/8",
  Risky: "text-orange-400 bg-orange-400/8",
  Dangerous: "text-red-400 bg-red-400/8",
};

const ICON_COLORS = ["bg-blue-500","bg-purple-500","bg-emerald-500","bg-orange-500","bg-pink-500","bg-cyan-500","bg-red-500","bg-yellow-500"];

const ServerIcon = ({ pkg, iconUrl }: { readonly pkg: string; readonly iconUrl: string | null }) => {
  const idx = pkg.charCodeAt(0) % ICON_COLORS.length;
  const letter = pkg.replace(/[@\/\-_]/g, "").charAt(0).toUpperCase() || "M";
  if (iconUrl) return (
    <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
      <img src={iconUrl} alt="" className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
    </div>
  );
  return (
    <div className={`w-9 h-9 rounded-lg ${ICON_COLORS[idx]} flex items-center justify-center flex-shrink-0`}>
      <span className="text-xs font-bold text-white">{letter}</span>
    </div>
  );
};

const PunchCard = ({ server }: { readonly server: HallServer & { category: Category } }) => {
  const level = safetyLevel(server.score);
  const totalFindings = server.findings.high + server.findings.medium + server.findings.low;

  return (
    <Link
      to={`/registry-v3/${server.id}`}
      className={`relative block bg-neutral-900 border-l-2 ${borderColor[level]} border border-white/5 rounded-r-xl overflow-hidden group hover:bg-neutral-800/80 transition-colors`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.025) 50%, transparent 60%)" }} />
      <div className="relative p-4">
        <div className="flex items-start gap-3">
          <ServerIcon pkg={server.package} iconUrl={server.iconUrl ?? null} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors leading-tight">
                {server.package.replace(/^@[^/]+\//, "")}
              </h3>
              <span className={`text-xl font-black tabular-nums flex-shrink-0 leading-none ${scoreColor[level]}`}>
                {server.score}
              </span>
            </div>
            <p className="text-xs text-white/40 line-clamp-1 mb-2.5">
              {server.description ?? server.name}
            </p>
            <div className="flex items-center gap-2 text-[10px]">
              <span className={`px-1.5 py-0.5 rounded font-semibold ${badgeColor[level]}`}>{level}</span>
              {totalFindings > 0 && <span className="text-white/25">{totalFindings} findings</span>}
              {server.tools > 0 && <span className="text-white/25">{server.tools} tools</span>}
              {server.stars != null && <span className="ml-auto text-white/20">★ {server.stars.toLocaleString()}</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const CATEGORIES: Category[] = ["All","Developer Tools","Database & SQL","Search & Knowledge","Cloud & Infrastructure","Communication","Data Science & ML","Security & Auth","Other"];
const PAGE_SIZE = 30;

export const RegistryV3 = () => {
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
    <div className="min-h-screen bg-neutral-950">
      <div className="border-b border-white/5 px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-white/40" />
                <h1 className="text-lg font-bold text-white">MCP Registry</h1>
              </div>
              <p className="text-xs text-white/30">
                {HALL_STATS.total.toLocaleString()} scanned · {HALL_STATS.fGrade.toLocaleString()} dangerous · {HALL_STATS.totalFindings.toLocaleString()} findings
              </p>
            </div>
            <div className="hidden sm:flex gap-2">
              {([["Safe","emerald"],["Review","yellow"],["Risky","orange"],["Dangerous","red"]] as const).map(([label, color]) => (
                <div key={label} className="border border-white/5 rounded-xl px-3 py-2 text-center bg-white/[0.02]">
                  <p className={`text-base font-black tabular-nums text-${color}-400`}>
                    {((safetyCounts as Record<string, number>)[label] ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-white/25">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input type="text" placeholder="Search servers..." value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/8 rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/15 transition-colors" />
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => tabsRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
              className="p-1 text-white/20 hover:text-white/50 flex-shrink-0 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div ref={tabsRef} className="flex gap-1 overflow-x-auto scrollbar-none flex-1">
              {CATEGORIES.map(cat => {
                const count = cat === "All" ? enriched.length : (categoryCounts[cat] ?? 0);
                if (!count && cat !== "All") return null;
                return (
                  <button key={cat} onClick={() => { setCategoryFilter(cat); resetPage(); }}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                      categoryFilter === cat ? "bg-white/10 text-white font-medium" : "text-white/30 hover:text-white/60 hover:bg-white/5"
                    }`}>
                    {cat} <span className="opacity-40">{count.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => tabsRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
              className="p-1 text-white/20 hover:text-white/50 flex-shrink-0 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center gap-1.5 mb-5 overflow-x-auto scrollbar-none">
          {(["All","Safe","Review","Risky","Dangerous"] as SafetyLevel[]).map(level => (
            <button key={level} onClick={() => { setSafetyFilter(level); resetPage(); }}
              className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs transition-colors ${
                safetyFilter === level ? "bg-white/10 text-white font-medium" : "text-white/30 hover:text-white/60"
              }`}>
              {level === "All" ? "All" : level} <span className="opacity-50">{(safetyCounts[level] ?? 0).toLocaleString()}</span>
            </button>
          ))}
          <span className="ml-auto text-xs text-white/20 flex-shrink-0">{filtered.length.toLocaleString()} results</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
          {pageItems.map(s => <PunchCard key={s.id} server={s} />)}
          {pageItems.length === 0 && (
            <div className="col-span-2 text-center text-white/20 py-16 text-sm">No servers match.</div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mb-12">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 disabled:opacity-20 transition-all">
              ← Prev
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const p = totalPages <= 7 ? i : Math.max(0, Math.min(page - 3 + i, totalPages - 1));
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs transition-all ${page === p ? "bg-white/10 text-white" : "text-white/25 hover:text-white/50"}`}>
                  {p + 1}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/5 disabled:opacity-20 transition-all">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
