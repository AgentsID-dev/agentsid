import { useState } from "react";
import { Link } from "react-router-dom";
import { GradeChip, GRADE_COLORS, type GradeLetter } from "@/components/shared/grade";
import { Button } from "@/components/ui/button";

const LETTERS: GradeLetter[] = ["A", "B", "C", "D", "F"];

const API_HOST = "https://api.agentsid.dev";

const DEMO_SLUG = "modelcontextprotocol-server-filesystem";
const DEMO_NAME = "your-mcp-server";
const DEMO_GRADE: GradeLetter = "A";

const SIZES: { id: "sm" | "md" | "lg"; label: string }[] = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

const THEMES: { id: "dark" | "light"; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

/** Client-rendered badge that matches the /badge/:slug.svg design — so demo sections
 * look right even when the live API hasn't scanned a demo slug. */
function BadgePreview({
  grade,
  name,
  size = "md",
  theme = "dark",
}: {
  grade: GradeLetter;
  name: string;
  size?: "sm" | "md" | "lg";
  theme?: "dark" | "light";
}) {
  const isDark = theme === "dark";
  const color = GRADE_COLORS[grade];
  // Scale via real CSS dims so the badge's layout size matches its visual size
  const dims =
    size === "sm"
      ? { fontSize: 11, padX: 10, padY: 4, dot: 6, maxName: 120 }
      : size === "lg"
        ? { fontSize: 16, padX: 14, padY: 8, dot: 10, maxName: 180 }
        : { fontSize: 13, padX: 12, padY: 6, dot: 8, maxName: 140 };

  return (
    <div
      className="inline-flex items-stretch rounded overflow-hidden font-mono max-w-full"
      style={{
        fontSize: dims.fontSize,
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <span
        className="inline-flex items-center gap-2 font-semibold shrink-0"
        style={{
          padding: `${dims.padY}px ${dims.padX}px`,
          background: isDark ? "#09090b" : "#ffffff",
          color: isDark ? "#fafafa" : "#09090b",
        }}
      >
        <span
          className="inline-block rounded-full shrink-0"
          style={{ width: dims.dot, height: dims.dot, background: "#f59e0b" }}
        />
        AgentsID
      </span>
      <span
        className="inline-flex items-center gap-1.5 font-bold min-w-0"
        style={{
          padding: `${dims.padY}px ${dims.padX}px`,
          background: color,
          color: grade === "C" ? "#09090b" : "#fafafa",
        }}
      >
        <span className="shrink-0">{grade}</span>
        <span className="opacity-70 shrink-0">·</span>
        <span
          className="truncate"
          style={{ maxWidth: dims.maxName }}
        >
          {name}
        </span>
      </span>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="group relative rounded-lg bg-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/50">
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-4 font-mono text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[/_]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "") || DEMO_SLUG;
}

function nameFromInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return DEMO_NAME;
  // show the last path segment for display (e.g. "@org/my-mcp" → "my-mcp")
  return trimmed.split("/").pop() || trimmed;
}

export function Badges() {
  const [input, setInput] = useState("");
  const [previewGrade, setPreviewGrade] = useState<GradeLetter>("A");

  const previewName = nameFromInput(input);
  const submitted = input.trim() ? normalizeSlug(input) : DEMO_SLUG;

  const mdSnippet = `[![AgentsID Grade](${API_HOST}/badge/${submitted}.svg)](https://agentsid.dev/registry/${submitted})`;
  const htmlSnippet = `<a href="https://agentsid.dev/registry/${submitted}"><img src="${API_HOST}/badge/${submitted}.svg" alt="AgentsID Grade"></a>`;
  const jsxSnippet = `<a href="https://agentsid.dev/registry/${submitted}">\n  <img src="${API_HOST}/badge/${submitted}.svg" alt="AgentsID Grade" />\n</a>`;

  return (
    <main className="relative min-h-screen bg-background text-foreground">
      {/* Ambient amber glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 85% 0%, rgba(245,158,11,0.06), transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-6 md:px-10">
        {/* Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-16 items-center pt-20 pb-24">
          <div>
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
              AgentsID Badges
            </div>
            <h1 className="font-extrabold tracking-[-0.04em] leading-[0.92] text-[clamp(3.5rem,7vw,6.5rem)]">
              Show your grade.
              <br />
              <span className="font-light tracking-[-0.035em] text-muted-foreground">
                Embed it
              </span>{" "}
              anywhere.
            </h1>
            <p className="mt-8 max-w-lg text-xl text-muted-foreground">
              Every server in the registry ships with a live SVG badge. Drop it
              into your README, docs, or dashboard —{" "}
              <span
                className="text-foreground"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 55%, rgba(245,158,11,0.3) 55%)",
                }}
              >
                it updates automatically
              </span>{" "}
              every time we rescan.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {LETTERS.map((l) => (
                <GradeChip key={l} letter={l} />
              ))}
            </div>
          </div>

          <div
            className="flex justify-center items-center"
            style={{ filter: "drop-shadow(0 0 40px rgba(245,158,11,0.15))" }}
          >
            <BadgePreview grade={DEMO_GRADE} name={DEMO_NAME} size="lg" theme="dark" />
          </div>
        </section>

        {/* Sizes */}
        <section className="border-t border-border py-20">
          <div className="max-w-3xl">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
              Three sizes
            </div>
            <h2 className="font-extrabold tracking-[-0.04em] text-[3rem] md:text-[3.2rem] leading-[0.92]">
              Small. Medium. Large.
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">
              Pick the one that fits the surface. Same live data, same update
              cadence, different pixel budget.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {SIZES.map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-4">
                <div className="flex items-center justify-center h-[80px]">
                  <BadgePreview grade={DEMO_GRADE} name={DEMO_NAME} size={s.id} theme="dark" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                    ?size={s.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Themes */}
        <section className="border-t border-border py-20">
          <div className="max-w-3xl">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
              Two themes
            </div>
            <h2 className="font-extrabold tracking-[-0.04em] text-[3rem] md:text-[3.2rem] leading-[0.92]">
              Dark. Light.
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">
              Match the surface it lives on. GitHub READMEs, docs sites,
              dashboards — one of these two will blend in.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {THEMES.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border p-10 flex flex-col items-center gap-4"
                style={{
                  background: t.id === "dark" ? "#09090b" : "#ffffff",
                  borderColor: t.id === "dark" ? "#27272a" : "#e4e4e7",
                }}
              >
                <BadgePreview grade={DEMO_GRADE} name={DEMO_NAME} size="md" theme={t.id} />
                <div
                  className="mt-4 font-mono text-[11px]"
                  style={{ color: t.id === "dark" ? "#a1a1aa" : "#52525b" }}
                >
                  ?theme={t.id}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Snippets */}
        <section className="border-t border-border py-20">
          <div className="max-w-3xl">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
              Drop-in snippets
            </div>
            <h2 className="font-extrabold tracking-[-0.04em] text-[3rem] md:text-[3.2rem] leading-[0.92]">
              Copy one line. Done.
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">
              No build step, no dependency, no API key. The badge is a plain
              SVG served from <span className="font-mono text-foreground">api.agentsid.dev</span>.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CodeBlock language="Markdown" code={mdSnippet} />
            <CodeBlock language="HTML" code={htmlSnippet} />
            <CodeBlock language="JSX" code={jsxSnippet} />
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            Replace{" "}
            <span className="font-mono text-foreground">{submitted}</span> with
            your registry slug.{" "}
            <Link
              to="/registry"
              className="text-[#f59e0b] hover:underline underline-offset-4"
            >
              Browse the registry →
            </Link>
          </p>
        </section>

        {/* Live preview */}
        <section className="border-t border-border py-20">
          <div className="max-w-3xl">
            <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
              Live preview
            </div>
            <h2 className="font-extrabold tracking-[-0.04em] text-[3rem] md:text-[3.2rem] leading-[0.92]">
              Try it on your server.
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">
              Paste a registry slug and see the live badge in all six variants
              at once.
            </p>
          </div>

          <div className="mt-10 max-w-3xl space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Server name
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="@yourorg/your-mcp-server"
                className="w-full rounded-md border border-border bg-card px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#f59e0b] focus:ring-1 focus:ring-[#f59e0b]"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Preview as grade
              </label>
              <div className="flex flex-wrap gap-2">
                {LETTERS.map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => setPreviewGrade(l)}
                    className="rounded-md border px-4 py-2 text-sm font-semibold transition-colors"
                    style={{
                      borderColor:
                        previewGrade === l ? GRADE_COLORS[l] : "hsl(var(--border))",
                      background:
                        previewGrade === l ? `${GRADE_COLORS[l]}15` : "transparent",
                      color: previewGrade === l ? GRADE_COLORS[l] : undefined,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This is just a preview — the real badge pulls your actual grade live
              from <span className="font-mono text-foreground">api.agentsid.dev</span>.
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {THEMES.map((t) => (
              <div key={t.id}>
                <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  {t.label} theme
                </div>
                <div
                  className="rounded-lg border p-8 flex flex-wrap items-end justify-around gap-10"
                  style={{
                    background: t.id === "dark" ? "#09090b" : "#ffffff",
                    borderColor: t.id === "dark" ? "#27272a" : "#e4e4e7",
                  }}
                >
                  {SIZES.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col items-center gap-3"
                    >
                      <BadgePreview
                        grade={previewGrade}
                        name={previewName}
                        size={s.id}
                        theme={t.id}
                      />
                      <div
                        className="font-mono text-[10px]"
                        style={{
                          color: t.id === "dark" ? "#71717a" : "#71717a",
                        }}
                      >
                        {s.label.toLowerCase()} · {t.id}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-border py-24 text-center">
          <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#f59e0b]">
            Every server should show its grade
          </div>
          <h2 className="font-extrabold tracking-[-0.04em] text-[3rem] md:text-[4rem] leading-[0.92] max-w-3xl mx-auto">
            Transparency by default.
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-xl text-muted-foreground">
            If your server passes, wear the A. If it doesn't, let the community
            see you responding.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="bg-[#f59e0b] text-zinc-950 hover:bg-[#f59e0b]/90">
              <Link to="/registry">Browse registry</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/claim">Claim your server</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/grade">How we grade</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
