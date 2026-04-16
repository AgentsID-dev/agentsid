/**
 * /registry/:slug — MCP server detail page, proposal #2 design.
 *
 * Sections:
 *   1. Breadcrumb
 *   2. Hero: title + tags + stats + install block + giant grade stamp
 *   3. Findings (per finding: severity, category, offending detail, suggested fix)
 *   4. Per-tool breakdown
 *   5. Embed badge + Claim this listing
 *   6. Related tools in same category
 */
import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, Copy, Shield } from "lucide-react";
import { GradeStamp, GRADE_COLORS, GRADE_NAMES, type GradeLetter } from "@/components/shared/grade";
import { HALL_SERVERS, type HallFinding, type HallServer } from "./hall-of-mcps-data";

// ---------------------------------------------------------------------------
// Finding helpers
// ---------------------------------------------------------------------------

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: GRADE_COLORS.F,
  HIGH: GRADE_COLORS.D,
  MEDIUM: GRADE_COLORS.C,
  LOW: GRADE_COLORS.B,
  INFO: "#71717a",
};

const CATEGORY_LABEL: Record<string, string> = {
  toxic_flow: "Toxic Data Flow",
  injection: "Prompt Injection",
  permissions: "Capability Risk",
  credential: "Data Exposure",
  schema: "Schema Issue",
  validation: "Input Validation",
  auth: "Authentication",
  output: "Output Safety",
  description: "Deceptive Language",
  naming: "Naming Mismatch",
  hallucination: "Hallucination Risk",
  supply_chain: "Supply Chain",
  "data-flow": "Data Flow",
  secrets: "Secret Exposure",
};

const SUGGESTED_FIX: Record<string, string> = {
  toxic_flow: "Scope the data sources and sinks so untrusted input cannot reach privileged operations.",
  injection: "Treat tool outputs as user input. Strip or escape special tokens before feeding back to the model.",
  permissions: "Require explicit user approval on destructive operations. Narrow the tool's allowed parameter space.",
  credential: "Never echo credentials in tool output or logs. Tokenize secrets at the boundary.",
  schema: "Add strict JSON schema with enums, min/max, and pattern constraints on every parameter.",
  validation: "Validate every parameter against a schema before invoking the underlying API.",
  auth: "Require signed tokens on every call. Reject anonymous invocations.",
  output: "Filter tool output for prompts, URLs, and control sequences before returning to the model.",
  description: "Replace operational imperatives ('secretly', 'silently', 'MUST') with neutral descriptions.",
  naming: "Align tool name with its behavior. Avoid misleading verbs.",
  hallucination: "Include a capability manifest so the model knows what the tool can and cannot do.",
  supply_chain: "Pin dependency versions. Require signed releases. Audit transitive deps.",
  "data-flow": "Draw an explicit boundary between trusted and untrusted data. Log crossings.",
  secrets: "Move secrets to env vars. Redact known secret patterns from all output.",
};

function fmtRel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "recently";
  const d = Math.floor((Date.now() - t) / 86400000);
  if (d < 1) return "today";
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function registrySlugFromPackage(pkg: string): string {
  return pkg.replace(/^@/, "").replace(/\//g, "-");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const RegistryServerV2 = () => {
  const { slug } = useParams<{ slug: string }>();

  const server = useMemo(() => {
    if (!slug) return null;
    return (
      HALL_SERVERS.find((s) => s.id === slug) ??
      HALL_SERVERS.find((s) => registrySlugFromPackage(s.package) === slug) ??
      null
    );
  }, [slug]);

  if (!server) {
    return <NotFound slug={slug} />;
  }

  return <ServerDetail server={server} />;
};

// ---------------------------------------------------------------------------
// Detail shell
// ---------------------------------------------------------------------------

function ServerDetail({ server: s }: { server: HallServer }) {
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const grade = s.grade;
  const critical = (s.findings as { critical?: number }).critical ?? 0;
  const { high, medium, low } = s.findings;

  const installCmd = s.package.startsWith("npm-")
    ? `npm install ${s.package.replace(/^npm-/, "")}`
    : s.package.startsWith("pypi-")
    ? `pip install ${s.package.replace(/^pypi-/, "")}`
    : `npx -y ${s.package}`;

  const registrySlug = registrySlugFromPackage(s.package);
  const badgeUrl = `https://agentsid.dev/badge/${registrySlug}.svg`;
  const markdownSnippet = `[![AgentsID](${badgeUrl})](https://agentsid.dev/registry/${registrySlug})`;

  const copyToClipboard = (value: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(value).then(() => {
      setter(true);
      setTimeout(() => setter(false), 1800);
    });
  };

  // Related: other tools with same top-finding category
  const topCat = s.topFindings[0]?.category ?? "";
  const related = useMemo(
    () =>
      HALL_SERVERS.filter(
        (other) =>
          other.id !== s.id &&
          other.topFindings[0]?.category === topCat
      ).slice(0, 3),
    [s.id, topCat]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 15% 0%, rgba(245,158,11,0.06), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-8 pt-10 pb-20">
        {/* Breadcrumb */}
        <div className="font-mono text-[11px] text-muted-foreground mb-4">
          <Link to="/registry" className="hover:text-foreground">
            <ArrowLeft className="inline size-3 -mt-0.5 mr-1" />
            Registry
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{s.package}</span>
        </div>

        {/* ───── HERO ───── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 md:gap-12 items-start py-8">
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Tag>{detectKind(s)}</Tag>
              {grade === "F" && <Tag tone="F">⚠ hostile</Tag>}
              <Tag>scanned {fmtRel(s.scannedAt)}</Tag>
            </div>
            <h1
              className="font-extrabold tracking-[-0.04em] leading-[0.92] break-words"
              style={{ fontSize: "clamp(2rem, 4.2vw, 3.5rem)" }}
            >
              {s.package}
            </h1>
            {s.description && (
              <p className="text-lg mt-3 max-w-3xl text-muted-foreground">
                {s.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-mono text-muted-foreground">
              <div>
                <span className="text-muted-foreground/70">version</span>{" "}
                <span className="text-foreground">{s.version}</span>
              </div>
              <div>
                <span className="text-muted-foreground/70">tools</span>{" "}
                <span className="text-foreground">{s.tools}</span>
              </div>
              <div>
                <span className="text-muted-foreground/70">last scanned</span>{" "}
                <span className="text-foreground">{fmtRel(s.scannedAt)}</span>
              </div>
              {s.repoUrl && (
                <a
                  href={s.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#f59e0b] hover:underline"
                >
                  github ↗
                </a>
              )}
            </div>

            {/* Install block — shows the CLI output with inline grade */}
            <div className="mt-8 rounded-lg bg-black border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  install
                </span>
                <button
                  onClick={() => copyToClipboard(installCmd, setCopiedInstall)}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  {copiedInstall ? (
                    <>
                      <Check className="size-3" /> copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> copy
                    </>
                  )}
                </button>
              </div>
              <pre className="px-5 py-4 font-mono text-[12px] md:text-[12.5px] leading-relaxed whitespace-pre-wrap break-all">
                <span className="text-foreground">$ {installCmd}</span>
                {"\n"}
                <span className="text-muted-foreground">
                  added {s.tools + 12} packages
                </span>
                {"\n\n"}
                <span className="text-muted-foreground">
                  ─ AgentsID ──────────────────────────────
                </span>
                {"\n"}
                <span>  {s.package}  </span>
                <span style={{ color: GRADE_COLORS[grade] }}>
                  [ {grade} · {GRADE_NAMES[grade]} ]
                </span>
                {"\n"}
                <span className="text-muted-foreground">
                  {"  "}
                  {critical ? `${critical} CRITICAL · ` : ""}
                  {high ? `${high} HIGH · ` : ""}
                  {medium ? `${medium} MEDIUM` : ""}
                </span>
                {"\n"}
                <span style={{ color: "#f59e0b" }}>
                  {"  "}agentsid.dev/registry/{registrySlug}
                </span>
                {"\n"}
                <span className="text-muted-foreground">
                  ─────────────────────────────────────────
                </span>
              </pre>
            </div>
          </div>

          {/* Grade pillar */}
          <aside className="flex flex-col items-center gap-4 w-full lg:w-auto lg:sticky lg:top-8">
            <GradeStamp letter={grade} size="hero" className="text-[8rem] md:text-[9rem]" />
            <div className="text-center">
              <div
                className="text-3xl font-extrabold tracking-[-0.03em]"
                style={{ color: GRADE_COLORS[grade] }}
              >
                {GRADE_NAMES[grade]}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mt-1 text-muted-foreground">
                AgentsID Grade
              </div>
            </div>
            <div className="w-full mt-2 rounded-lg bg-card border border-border p-4">
              <SevRow label="CRITICAL" count={critical} tone="F" />
              <SevRow label="HIGH" count={high} tone="D" />
              <SevRow label="MEDIUM" count={medium} tone="C" />
              <SevRow label="LOW" count={low} tone="B" />
              <div className="h-px my-2 bg-border" />
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">tools scanned</span>
                <span>{s.tools}</span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">trust score</span>
                <span>{s.score}</span>
              </div>
            </div>
          </aside>
        </section>

        {/* ───── FINDINGS ───── */}
        {s.topFindings.length > 0 && (
          <section className="py-10 md:py-12 border-t border-border">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-1 text-[#f59e0b]">
                  Findings
                </div>
                <h2 className="font-extrabold text-2xl md:text-3xl tracking-[-0.03em]">
                  {critical + high + medium + low} issue
                  {critical + high + medium + low === 1 ? "" : "s"} detected.
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {s.topFindings.map((f, i) => (
                <FindingCard key={i} finding={f} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ───── EMBED + CLAIM ───── */}
        <section className="py-10 md:py-12 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="p-6 md:p-8 rounded-lg bg-card border border-border">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
              Embed this badge
            </div>
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <img
                src={badgeUrl}
                alt={`AgentsID Grade ${grade}`}
                className="h-7"
                onError={(e) => {
                  // Fallback in dev: render a local badge if API isn't up yet
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="font-mono text-xs text-muted-foreground">
                ↑ auto-updates as grade changes
              </span>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-2 text-muted-foreground">
              Markdown
            </div>
            <pre className="rounded bg-black border border-border px-4 py-3 font-mono text-[11.5px] overflow-x-auto mb-3 text-muted-foreground">
              {markdownSnippet}
            </pre>
            <button
              onClick={() => copyToClipboard(markdownSnippet, setCopiedMarkdown)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-border bg-background hover:bg-secondary"
            >
              {copiedMarkdown ? (
                <>
                  <Check className="size-3.5" /> copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" /> copy markdown
                </>
              )}
            </button>
          </div>

          <div className="p-6 md:p-8 rounded-lg bg-card border border-[#f59e0b]">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
              Are you the maintainer?
            </div>
            <div className="font-extrabold text-2xl tracking-[-0.02em] mb-3">
              Claim this listing.
            </div>
            <p className="text-sm mb-5 text-muted-foreground">
              See every finding in full detail, download the per-release scan
              report, get email alerts when your grade changes, and file a
              dispute if you believe a finding is wrong.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Link
                to={`/claim/${registrySlug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold bg-[#f59e0b] text-background"
              >
                Claim {s.package} →
              </Link>
              <Link
                to={`/claim/${registrySlug}?report=1`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold border border-border bg-background"
              >
                Report incorrect finding
              </Link>
            </div>
          </div>
        </section>

        {/* ───── RELATED ───── */}
        {related.length > 0 && (
          <section className="py-10 md:py-12 border-t border-border">
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-extrabold text-2xl md:text-3xl tracking-[-0.03em]">
                Related tools with similar findings.
              </h2>
              <Link
                to="/registry"
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#f59e0b] hover:underline"
              >
                browse all →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  to={`/registry/${r.id}`}
                  className={`p-4 rounded-lg border flex items-center gap-3 transition-colors hover:bg-secondary ${
                    r.grade === "F"
                      ? "border-[#ef4444]"
                      : "border-border bg-card"
                  }`}
                  style={
                    r.grade === "F"
                      ? { background: "rgba(239,68,68,0.04)" }
                      : undefined
                  }
                >
                  <GradeStamp letter={r.grade} size="md" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {r.package}
                    </div>
                    <div
                      className="text-[11px] font-mono"
                      style={{
                        color:
                          r.grade === "F"
                            ? GRADE_COLORS.F
                            : "var(--color-muted-foreground)",
                      }}
                    >
                      {describeFindings(r)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SevRow({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: GradeLetter;
}) {
  const active = count > 0;
  const color = active ? GRADE_COLORS[tone] : "var(--color-muted-foreground)";
  return (
    <div className="flex justify-between text-xs font-mono py-0.5">
      <span style={{ color }}>{label}</span>
      <span style={{ color }}>{count}</span>
    </div>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: GradeLetter;
}) {
  if (tone === "F") {
    return (
      <span
        className="inline-block px-2 py-0.5 rounded text-[10px] tracking-wide font-medium"
        style={{ background: "rgba(239,68,68,0.12)", color: GRADE_COLORS.F }}
      >
        {children}
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] tracking-wide font-medium bg-secondary text-muted-foreground">
      {children}
    </span>
  );
}

function FindingCard({
  finding: f,
  index,
}: {
  finding: HallFinding;
  index: number;
}) {
  const color = SEVERITY_COLOR[f.severity] ?? SEVERITY_COLOR.MEDIUM;
  const catKey = f.category.toLowerCase();
  const catLabel = CATEGORY_LABEL[catKey] ?? humanize(f.category);
  const fix =
    SUGGESTED_FIX[catKey] ??
    "Review the tool's contract and narrow its parameter space or scope.";

  return (
    <div className="p-5 md:p-6 rounded-lg bg-card border border-border">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.2em] font-semibold"
            style={{ color }}
          >
            ● {f.severity}
          </span>
          <span className="font-semibold text-sm md:text-base">
            {catLabel}
          </span>
          {f.tool && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
              {f.tool}
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          finding #{index + 1}
        </span>
      </div>
      <p className="text-sm mb-4 text-muted-foreground">
        {f.description}
      </p>
      <div
        className="text-sm p-3 rounded"
        style={{
          background: "rgba(245,158,11,0.05)",
          borderLeft: "2px solid #f59e0b",
        }}
      >
        <span className="font-mono uppercase tracking-[0.2em] text-[10px] text-[#f59e0b]">
          suggested fix
        </span>
        <div className="mt-1 text-muted-foreground">{fix}</div>
      </div>
    </div>
  );
}

function NotFound({ slug }: { slug: string | undefined }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-8">
      <div className="max-w-lg text-center">
        <Shield className="mx-auto size-12 text-muted-foreground mb-4" />
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-2 text-muted-foreground">
          Not in the index
        </div>
        <h1 className="font-extrabold text-3xl tracking-[-0.03em] mb-3">
          No scan report for "{slug}".
        </h1>
        <p className="text-muted-foreground mb-6">
          We haven't scanned this server yet, or the slug doesn't match a
          package in our registry.
        </p>
        <Link
          to="/registry"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-semibold bg-[#f59e0b] text-background"
        >
          <ArrowLeft className="size-4" /> Back to registry
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function detectKind(s: HallServer): string {
  if (s.package.startsWith("npm-")) return "npm · MCP";
  if (s.package.startsWith("pypi-")) return "PyPI · MCP";
  return "MCP server";
}

function humanize(s: string): string {
  return s
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function describeFindings(s: HallServer): string {
  const critical = (s.findings as { critical?: number }).critical ?? 0;
  const { high, medium, low } = s.findings;
  if (critical) return `${critical} CRITICAL`;
  if (high) return `${high} HIGH`;
  if (medium) return `${medium} medium`;
  if (low) return `${low} low`;
  return "0 findings";
}
