import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Shield, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { HALL_SERVERS, HALL_STATS, type HallServer } from "./hall-of-mcps-data";

// ─── Safety level ─────────────────────────────────────────────────────────────

type SafetyLevel = "All" | "Safe" | "Review" | "Risky" | "Dangerous";

function safetyLevel(score: number): Exclude<SafetyLevel, "All"> {
  if (score >= 70) return "Safe";
  if (score >= 50) return "Review";
  if (score >= 30) return "Risky";
  return "Dangerous";
}

const safetyStyle: Record<Exclude<SafetyLevel, "All">, string> = {
  Safe: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Review: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  Risky: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Dangerous: "text-red-400 bg-red-400/10 border-red-400/20",
};

const scoreStyle: Record<Exclude<SafetyLevel, "All">, string> = {
  Safe: "text-emerald-400",
  Review: "text-yellow-400",
  Risky: "text-orange-400",
  Dangerous: "text-red-400",
};

// ─── Category detection ───────────────────────────────────────────────────────

type Category =
  | "All"
  | "Developer Tools"
  | "Database & SQL"
  | "Cloud & Infrastructure"
  | "Communication"
  | "Search & Knowledge"
  | "Data Science & ML"
  | "Security & Auth"
  | "Other";

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
  const haystack = `${server.package} ${server.name} ${server.riskTags.join(" ")}`;
  for (const [cat, re] of CATEGORY_PATTERNS) {
    if (re.test(haystack)) return cat;
  }
  return "Other";
}

// ─── Time ago ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Icon ─────────────────────────────────────────────────────────────────────

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

const ServerIcon = ({ pkg, iconUrl }: { readonly pkg: string; readonly iconUrl: string | null }) => {
  const idx = pkg.charCodeAt(0) % ICON_COLORS.length;
  const letter = pkg.replace(/[@\/\-_]/g, "").charAt(0).toUpperCase() || "M";
  if (iconUrl) {
    return (
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/30">
        <img
          src={iconUrl}
          alt=""
          className="w-8 h-8 object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    );
  }
  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ICON_COLORS[idx]} flex items-center justify-center flex-shrink-0`}>
      <span className="text-sm font-bold text-white">{letter}</span>
    </div>
  );
};

// ─── Server Card ──────────────────────────────────────────────────────────────

const ServerCard = ({ server }: { readonly server: HallServer & { category: Category } }) => {
  const level = safetyLevel(server.score);
  const totalFindings = server.findings.high + server.findings.medium + server.findings.low;
  const shortName = server.package.replace(/^@[^/]+\//, "");
  const scope = server.package.startsWith("@") ? server.package.split("/")[0] : null;

  return (
    <Link
      to={`/registry/${server.id}`}
      className="block bg-card border border-border/40 rounded-2xl p-4 hover:border-border hover:bg-muted/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <ServerIcon pkg={server.package} iconUrl={server.iconUrl ?? null} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {shortName}
              </h3>
              {level === "Safe" && (
                <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            {scope && (
              <p className="text-xs text-muted-foreground truncate">{scope}</p>
            )}
          </div>
        </div>
        <span className={`text-2xl font-black tabular-nums flex-shrink-0 ${scoreStyle[level]}`}>
          {server.score}
        </span>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">
        {server.description ?? (server.name !== server.package ? server.name : server.maintainer)}
      </p>

      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        <span className={`font-semibold px-2 py-0.5 rounded-full border ${safetyStyle[level]}`}>
          {level}
        </span>
        {totalFindings > 0 && (
          <span>{totalFindings} finding{totalFindings !== 1 ? "s" : ""}</span>
        )}
        {server.tools > 0 && (
          <span>{server.tools} tools</span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {server.stars != null && (
            <span>⭐ {server.stars.toLocaleString()}</span>
          )}
          <span className="text-muted-foreground/50">{timeAgo(server.scannedAt)}</span>
        </span>
      </div>
    </Link>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24;

const CATEGORIES: Category[] = [
  "All",
  "Developer Tools",
  "Database & SQL",
  "Search & Knowledge",
  "Cloud & Infrastructure",
  "Communication",
  "Data Science & ML",
  "Security & Auth",
  "Other",
];

export const Registry = () => {
  const [search, setSearch] = useState("");
  const [safetyFilter, setSafetyFilter] = useState<SafetyLevel>("All");
  const [categoryFilter, setCategoryFilter] = useState<Category>("All");
  const [page, setPage] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  const enriched = useMemo(
    () => HALL_SERVERS.filter((s) => s.tools > 0).map((s) => ({ ...s, category: detectCategory(s) })),
    []
  );

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<Category, number>> = {};
    for (const s of enriched) {
      counts[s.category] = (counts[s.category] ?? 0) + 1;
    }
    return counts;
  }, [enriched]);

  const safetyCounts = useMemo(() => {
    const counts: Partial<Record<SafetyLevel, number>> = { All: enriched.length };
    for (const s of enriched) {
      const l = safetyLevel(s.score);
      counts[l] = (counts[l] ?? 0) + 1;
    }
    return counts;
  }, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (safetyFilter !== "All") list = list.filter((s) => safetyLevel(s.score) === safetyFilter);
    if (categoryFilter !== "All") list = list.filter((s) => s.category === categoryFilter);
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
  }, [enriched, safetyFilter, categoryFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const resetPage = () => setPage(0);

  const scrollTabs = (dir: "left" | "right") => {
    if (tabsRef.current) {
      tabsRef.current.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
    }
  };

  // Pagination window
  const paginationPages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const pages: (number | "...")[] = [];
    pages.push(0);
    if (page > 3) pages.push("...");
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 4) pages.push("...");
    pages.push(totalPages - 1);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="min-h-screen">
      {/* Hero search */}
      <div className="border-b border-border/40 py-10 px-4">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            MCP Security Registry
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-1">
            {HALL_STATS.total.toLocaleString()} servers scanned
          </h1>
          <p className="text-sm text-muted-foreground">
            {HALL_STATS.fGrade.toLocaleString()} dangerous · {HALL_STATS.totalFindings.toLocaleString()} findings across {HALL_STATS.totalTools.toLocaleString()} tools
          </p>
        </div>
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search MCP servers..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-muted/50 transition-colors"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category tabs with scroll arrows */}
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => scrollTabs("left")}
            className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/30 flex-shrink-0 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {CATEGORIES.map((cat) => {
              const count = cat === "All" ? enriched.length : (categoryCounts[cat] ?? 0);
              if (count === 0 && cat !== "All") return null;
              return (
                <button
                  key={cat}
                  onClick={() => { setCategoryFilter(cat); resetPage(); }}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? "bg-foreground text-background"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {cat} <span className="opacity-50">{count.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => scrollTabs("right")}
            className="p-1.5 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/30 flex-shrink-0 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Safety level pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(["All", "Safe", "Review", "Risky", "Dangerous"] as SafetyLevel[]).map((level) => {
            const count = safetyCounts[level] ?? 0;
            const isAll = level === "All";
            const active = safetyFilter === level;
            return (
              <button
                key={level}
                onClick={() => { setSafetyFilter(level); resetPage(); }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  active
                    ? isAll
                      ? "bg-foreground text-background border-foreground"
                      : `${safetyStyle[level as Exclude<SafetyLevel, "All">]}`
                    : "bg-transparent text-muted-foreground border-border/50 hover:bg-muted/30"
                }`}
              >
                {isAll ? "All Levels" : level} <span className="opacity-70">{count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>

        {/* Count */}
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length.toLocaleString()} server{filtered.length !== 1 ? "s" : ""}
          {totalPages > 1 && ` · page ${page + 1} of ${totalPages}`}
        </p>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {pageItems.map((server) => (
            <ServerCard key={server.id} server={server} />
          ))}
          {pageItems.length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground py-16 text-sm">
              No servers match your search.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mb-12">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {paginationPages.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-muted-foreground">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    page === p
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/50 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {(p as number) + 1}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-2 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CTA */}
        <div className="border border-border/50 rounded-2xl p-6 bg-card text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Scan any MCP server</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Open-source. No data leaves your machine.</p>
          <code className="text-xs font-mono bg-muted px-4 py-2 rounded-lg text-muted-foreground">
            npx @agentsid/scanner -- npx &lt;your-mcp-server&gt;
          </code>
        </div>
      </div>
    </div>
  );
};
