/**
 * /registry — AgentsID tool directory, proposal #2 design.
 *
 * Sections:
 *   1. Header (title + live timestamp)
 *   2. Hall of Shame (5 worst F-graded servers with quotes)
 *   3. Search + filter chips (grade · finding-type · sort)
 *   4. Sidebar (categories + tier) + results list with grade stamps
 *   5. Pagination
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { GradeStamp, GRADE_COLORS, type GradeLetter } from "@/components/shared/grade";
import { HALL_SERVERS, HALL_STATS, type HallServer } from "./hall-of-mcps-data";

// ---------------------------------------------------------------------------
// Categorization — keyword-driven so every scanned server lands somewhere.
// ---------------------------------------------------------------------------

type Category =
  | "All"
  | "AI / ML"
  | "Code & Dev"
  | "Data & Analytics"
  | "DevOps"
  | "Productivity"
  | "Storage"
  | "Payments"
  | "Search"
  | "Security"
  | "Media"
  | "Other";

const CATEGORY_PATTERNS: [Category, RegExp][] = [
  ["AI / ML", /ai|ml|llm|model|training|dataset|torch|tensor|hugging|openai|anthropic|nlp|embed|vector/i],
  ["Code & Dev", /github|gitlab|git|jira|linear|figma|npm|code|ide|vscode|test|lint|debug|ci\/?cd/i],
  ["Data & Analytics", /postgres|mysql|sqlite|mongo|redis|sql|db|database|supabase|neon|drizzle|analytics|metric|dashboard/i],
  ["DevOps", /aws|azure|gcp|cloud|k8s|kubernetes|docker|terraform|s3|lambda|vercel|railway|infra|deploy|pipeline/i],
  ["Productivity", /slack|email|notion|asana|trello|calendar|gmail|discord|teams|telegram|whatsapp|twilio|sendgrid|doc/i],
  ["Storage", /storage|blob|bucket|file|ftp|sftp|drive/i],
  ["Payments", /stripe|plaid|pay|billing|invoice|ledger|coin|crypto|wallet|finance|bank/i],
  ["Search", /search|rag|elastic|algolia|pinecone|chroma|index/i],
  ["Security", /auth|oauth|jwt|security|vault|secret|cred|iam|rbac|key|cert|ssl|waf/i],
  ["Media", /image|video|audio|voice|tts|speech|media|photo|film|music/i],
];

function detectCategory(server: HallServer): Category {
  const haystack = `${server.package} ${server.name} ${server.description ?? ""}`;
  for (const [cat, re] of CATEGORY_PATTERNS) if (re.test(haystack)) return cat;
  return "Other";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GradeFilter = "All" | GradeLetter;

function findingCountLabel(s: HallServer): { label: string; tone: GradeLetter | "soft" } {
  const { critical = 0, high, medium, low } = s.findings as {
    critical?: number; high: number; medium: number; low: number;
  };
  if (critical) return { label: `${critical} CRIT${high ? ` · ${high} HIGH` : ""}`, tone: "F" };
  if (high) return { label: `${high} HIGH${medium ? ` · ${medium} MED` : ""}`, tone: "D" };
  if (medium) return { label: `${medium} MEDIUM`, tone: "C" };
  if (low) return { label: `${low} LOW`, tone: "B" };
  return { label: "0 findings", tone: "A" };
}

function topFindingCategory(s: HallServer): string {
  return s.topFindings[0]?.category ?? "—";
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export const RegistryV2 = () => {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("All");
  const [categoryFilter, setCategoryFilter] = useState<Category>("All");
  const [page, setPage] = useState(0);

  const enriched = useMemo(
    () =>
      HALL_SERVERS.map((s) => ({
        ...s,
        category: detectCategory(s),
      })),
    []
  );

  const gradeCounts = useMemo(() => {
    const c: Record<GradeLetter, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const s of enriched) c[s.grade] = (c[s.grade] ?? 0) + 1;
    return c;
  }, [enriched]);

  const categoryCounts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    for (const s of enriched) c[s.category] = (c[s.category] ?? 0) + 1;
    return c;
  }, [enriched]);

  const hallOfShame = useMemo(
    () =>
      enriched
        .filter((s) => s.grade === "F")
        .sort(
          (a, b) =>
            (b.findings as { critical?: number }).critical ?? 0
              ? ((b.findings as { critical?: number }).critical ?? 0) -
                ((a.findings as { critical?: number }).critical ?? 0)
              : b.findings.high - a.findings.high
        )
        .slice(0, 5),
    [enriched]
  );

  const filtered = useMemo(() => {
    let list = enriched;
    if (gradeFilter !== "All") list = list.filter((s) => s.grade === gradeFilter);
    if (categoryFilter !== "All") list = list.filter((s) => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.package.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q)
      );
    }
    // Sort: worst grade first
    const order: Record<GradeLetter, number> = { F: 0, D: 1, C: 2, B: 3, A: 4 };
    return [...list].sort((a, b) => order[a.grade] - order[b.grade]);
  }, [enriched, gradeFilter, categoryFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const resetPage = () => setPage(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient amber glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 15% 0%, rgba(245,158,11,0.06), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-8 pt-12 pb-20">
        {/* ---------------------- Header ---------------------- */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
              The registry
            </div>
            <h1
              className="font-extrabold tracking-[-0.04em] leading-[0.92]"
              style={{ fontSize: "clamp(2.2rem, 4.5vw, 4rem)" }}
            >
              {fmtNum(enriched.length)} MCP tools.
              <br />
              Every single one graded.
            </h1>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] flex gap-6 text-muted-foreground">
            <span>indexed hourly</span>
            <span>·</span>
            <span>{fmtNum(HALL_STATS.totalFindings)} findings total</span>
          </div>
        </div>

        {/* ---------------------- Hall of Shame ---------------------- */}
        {hallOfShame.length > 0 && (
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-baseline gap-3">
                <div
                  className="font-mono text-[11px] uppercase tracking-[0.2em]"
                  style={{ color: GRADE_COLORS.F }}
                >
                  ⚠ hall of shame
                </div>
                <div className="font-extrabold text-2xl tracking-[-0.02em]">
                  F-graded servers with CRITICAL findings
                </div>
              </div>
              <button
                onClick={() => {
                  setGradeFilter("F");
                  resetPage();
                }}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#f59e0b] hover:underline"
              >
                see all {gradeCounts.F} →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {hallOfShame.map((s) => (
                <Link
                  key={s.id}
                  to={`/registry/${s.id}`}
                  className="p-4 rounded-lg flex flex-col gap-3 transition-colors hover:bg-card"
                  style={{
                    background: "rgba(239,68,68,0.06)",
                    border: `1px solid ${GRADE_COLORS.F}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <GradeStamp letter="F" size="md" />
                    <div
                      className="font-mono text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: GRADE_COLORS.F }}
                    >
                      {((s.findings as { critical?: number }).critical ?? 0) +
                        s.findings.high}{" "}
                      CRIT
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold truncate">
                      {s.package}
                    </div>
                    <div className="text-[11px] mt-1 leading-snug text-muted-foreground line-clamp-2">
                      {s.topFindings[0]?.description ?? s.description ?? "—"}
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {topFindingCategory(s)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------- Search + filters ---------------------- */}
        <div className="mb-6">
          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder={`Search ${fmtNum(enriched.length)} tools — try 'notion', 'stripe', 'github'…`}
              className="w-full pl-11 pr-16 py-3 rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b] transition-colors"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">
              ⌘K
            </div>
          </div>

          {/* Grade filter chips */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] mr-1 text-muted-foreground">
              grade
            </span>
            <FilterChip
              active={gradeFilter === "All"}
              onClick={() => {
                setGradeFilter("All");
                resetPage();
              }}
            >
              all · {fmtNum(enriched.length)}
            </FilterChip>
            {(["A", "B", "C", "D", "F"] as GradeLetter[]).map((g) => (
              <FilterChip
                key={g}
                active={gradeFilter === g}
                tone={g}
                onClick={() => {
                  setGradeFilter(g);
                  resetPage();
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block mr-1.5"
                  style={{ background: GRADE_COLORS[g] }}
                />
                {g} · {fmtNum(gradeCounts[g] ?? 0)}
              </FilterChip>
            ))}
            <Link
              to="/grade"
              className="ml-auto font-mono text-[11px] text-[#f59e0b] hover:underline whitespace-nowrap"
            >
              how we grade →
            </Link>
          </div>
        </div>

        {/* ---------------------- Main grid: sidebar + list ---------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 md:gap-8">
          {/* Sidebar */}
          <aside>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-4 text-muted-foreground">
              Category
            </div>
            <div className="space-y-0.5">
              <CategoryLink
                label="All tools"
                count={enriched.length}
                active={categoryFilter === "All"}
                onClick={() => {
                  setCategoryFilter("All");
                  resetPage();
                }}
              />
              {(
                [
                  "AI / ML",
                  "Code & Dev",
                  "Data & Analytics",
                  "DevOps",
                  "Productivity",
                  "Storage",
                  "Payments",
                  "Search",
                  "Security",
                  "Media",
                  "Other",
                ] as Category[]
              ).map((c) => (
                <CategoryLink
                  key={c}
                  label={c}
                  count={categoryCounts[c] ?? 0}
                  active={categoryFilter === c}
                  onClick={() => {
                    setCategoryFilter(c);
                    resetPage();
                  }}
                />
              ))}
            </div>

            <div className="mt-8 p-4 rounded-lg bg-card border border-border">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-2 text-[#f59e0b]">
                is your tool listed?
              </div>
              <p className="text-xs mb-3 text-muted-foreground">
                Claim it to see every finding in detail and get alerts when
                grades change.
              </p>
              <Link
                to="/claim"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold bg-[#f59e0b] text-background"
              >
                Claim a tool →
              </Link>
            </div>
          </aside>

          {/* Results */}
          <main>
            <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
              <div className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="text-foreground">
                  {page * PAGE_SIZE + 1}–
                  {Math.min((page + 1) * PAGE_SIZE, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="text-foreground">
                  {fmtNum(filtered.length)} results
                  {search.trim() ? ` for "${search}"` : ""}
                </span>
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                page {page + 1} / {totalPages}
              </div>
            </div>

            {pageItems.length === 0 ? (
              <div className="p-12 rounded-lg bg-card border border-border text-center text-muted-foreground">
                No results. Try clearing filters or changing your search.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pageItems.map((s) => (
                  <ToolRow key={s.id} server={s} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}-
                  {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
                  {fmtNum(filtered.length)}
                </div>
                <div className="flex gap-1">
                  <PageBtn
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    ← prev
                  </PageBtn>
                  <PageBtn active>{page + 1}</PageBtn>
                  {page + 1 < totalPages && (
                    <PageBtn onClick={() => setPage((p) => p + 1)}>
                      {page + 2}
                    </PageBtn>
                  )}
                  {page + 2 < totalPages && <span className="px-2 text-muted-foreground">…</span>}
                  <PageBtn
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  >
                    next →
                  </PageBtn>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterChip({
  children,
  active,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  tone?: GradeLetter;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer";

  if (active && tone === "F") {
    return (
      <button
        onClick={onClick}
        className={base}
        style={{
          background: GRADE_COLORS.F,
          color: "#09090b",
          borderColor: GRADE_COLORS.F,
        }}
      >
        {children}
      </button>
    );
  }
  if (active) {
    return (
      <button
        onClick={onClick}
        className={`${base} bg-foreground text-background border-foreground`}
      >
        {children}
      </button>
    );
  }
  if (tone === "F") {
    return (
      <button
        onClick={onClick}
        className={`${base}`}
        style={{
          background: "rgba(239,68,68,0.12)",
          color: GRADE_COLORS.F,
          borderColor: "rgba(239,68,68,0.3)",
        }}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`${base} bg-card text-muted-foreground border-border hover:bg-secondary hover:text-foreground`}
    >
      {children}
    </button>
  );
}

function CategoryLink({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex justify-between items-center px-3 py-1.5 rounded text-[13px] transition-colors ${
        active
          ? "bg-card text-[#f59e0b] font-semibold"
          : "text-muted-foreground hover:bg-card hover:text-foreground"
      }`}
    >
      <span>{label}</span>
      <span className="font-mono text-[11px] text-muted-foreground">
        {fmtNum(count)}
      </span>
    </button>
  );
}

function ToolRow({ server: s }: { server: HallServer & { category: Category } }) {
  const { label: findingLabel, tone: findingTone } = findingCountLabel(s);
  const toneColor =
    findingTone === "soft"
      ? "var(--color-muted-foreground)"
      : GRADE_COLORS[findingTone as GradeLetter];

  return (
    <Link
      to={`/registry/${s.id}`}
      className={`grid grid-cols-[52px_1fr_auto] md:grid-cols-[64px_1fr_auto_auto_auto] gap-3 md:gap-5 items-center p-4 md:p-5 rounded-lg bg-card border transition-colors hover:border-muted-foreground hover:bg-secondary ${
        s.grade === "F" ? "border-[#ef4444]" : "border-border"
      }`}
      style={s.grade === "F" ? { background: "rgba(239,68,68,0.04)" } : undefined}
    >
      <GradeStamp letter={s.grade} size="lg" className="text-[2rem] md:text-[2.4rem]" />

      <div className="min-w-0">
        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
          <div className="font-semibold text-base truncate">{s.package}</div>
          <TagPill>{s.category}</TagPill>
          {s.grade === "F" && (
            <TagPill tone="F">⚠ hostile</TagPill>
          )}
        </div>
        <div className="text-sm truncate text-muted-foreground">
          {s.topFindings[0]?.description ?? s.description ?? "—"}
        </div>
        <div className="mt-1.5 hidden md:flex gap-4 text-[11px] font-mono text-muted-foreground">
          <span>v{s.version}</span>
          <span>{s.tools} tools</span>
          <span>scanned {formatRelative(s.scannedAt)}</span>
        </div>
      </div>

      <div className="text-right hidden md:block">
        <div
          className="font-mono text-[11px] uppercase tracking-[0.2em]"
          style={{ color: toneColor }}
        >
          {findingLabel}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">
          {topFindingCategory(s)}
        </div>
      </div>

      <span
        className="hidden md:inline-flex items-stretch rounded border text-[11px] font-semibold overflow-hidden"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <span className="flex items-center gap-1.5 bg-black text-foreground px-2 py-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "#f59e0b",
              boxShadow: "0 0 4px #f59e0b",
            }}
          />
          AgentsID
        </span>
        <span
          className="px-2 py-1 font-black text-white"
          style={{
            background: GRADE_COLORS[s.grade],
            color: s.grade === "C" ? "#1a1a00" : "white",
          }}
        >
          {s.grade}
        </span>
      </span>

      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

function TagPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: GradeLetter;
}) {
  if (tone === "F") {
    return (
      <span
        className="inline-block px-1.5 py-0.5 rounded text-[10px] tracking-wide font-medium"
        style={{ background: "rgba(239,68,68,0.12)", color: GRADE_COLORS.F }}
      >
        {children}
      </span>
    );
  }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] tracking-wide font-medium bg-secondary text-muted-foreground">
      {children}
    </span>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center px-3 py-1 rounded text-xs border transition-colors ${
        active
          ? "bg-foreground text-background border-foreground"
          : disabled
          ? "text-muted-foreground border-border opacity-40 cursor-not-allowed"
          : "text-foreground border-border bg-card hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

function formatRelative(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "recently";
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}
