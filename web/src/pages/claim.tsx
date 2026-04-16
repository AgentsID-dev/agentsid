/**
 * /claim and /claim/:slug — maintainer waitlist.
 *
 * This is a temporary placeholder while the real GitHub OAuth verification
 * flow is being built (see task #11). Collects email + handle + slug and
 * promises a 24 hour turnaround.
 */
import { useState, type FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { GradeStamp } from "@/components/shared/grade";
import { HALL_SERVERS } from "./hall-of-mcps-data";

type Status = "idle" | "submitting" | "success" | "error";

export function Claim() {
  const { slug } = useParams<{ slug?: string }>();

  const server = slug
    ? HALL_SERVERS.find((s) => s.id === slug) ??
      HALL_SERVERS.find((s) => s.package.replace(/^@/, "").replace(/\//g, "-") === slug)
    : null;

  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [pkg, setPkg] = useState(server?.package ?? slug ?? "");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/claims/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          github_handle: handle.trim(),
          package_slug: pkg.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Submission failed" }));
        setErrorMsg(
          typeof body?.detail === "string" ? body.detail : "Submission failed"
        );
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg("Network error — please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(245,158,11,0.08), transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-6 pt-12 pb-24">
        <Link
          to={slug ? `/registry/${slug}` : "/registry"}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground mb-10"
        >
          <ArrowLeft className="size-3" />
          back to {slug ? "listing" : "registry"}
        </Link>

        {status === "success" ? (
          <SuccessState server={server} pkg={pkg} />
        ) : (
          <>
            <div className="mb-10">
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 text-[#f59e0b]">
                Maintainer waitlist · early access
              </div>
              <h1
                className="font-extrabold tracking-[-0.04em] leading-[0.92]"
                style={{ fontSize: "clamp(2.2rem, 4.8vw, 3.6rem)" }}
              >
                Claim your
                <br />
                AgentsID listing.
              </h1>
              <p className="text-lg mt-5 text-muted-foreground">
                Verification via GitHub OAuth is rolling out in waves. Fill in
                the form below — we'll verify via your repo's maintainers and
                email you within 24 hours.
              </p>
              <div
                className="mt-6 p-4 rounded-lg text-sm"
                style={{
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <span className="font-mono uppercase tracking-[0.15em] text-[10px] text-[#f59e0b]">
                  early access
                </span>
                <div className="mt-1 text-foreground">
                  Verification is rolling out in waves. Early maintainers get
                  first access to the full findings report and re-scan on demand.
                </div>
              </div>
            </div>

            {server && (
              <div className="mb-8 p-5 rounded-lg bg-card border border-border flex items-center gap-4">
                <GradeStamp letter={server.grade} size="md" />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-0.5 text-muted-foreground">
                    claiming
                  </div>
                  <div className="font-semibold text-base truncate">
                    {server.package}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <Field
                label="Email"
                hint="We'll only use this for verification + one follow-up."
              >
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md bg-card border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b] transition-colors"
                />
              </Field>

              <Field
                label="GitHub handle"
                hint="The account that owns (or has push access to) the package's repo."
              >
                <input
                  type="text"
                  required
                  pattern="@?[A-Za-z0-9][A-Za-z0-9-]{0,38}"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="octocat"
                  className="w-full rounded-md bg-card border border-border px-4 py-3 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b] transition-colors"
                />
              </Field>

              <Field label="Package name" hint="npm or PyPI identifier.">
                <input
                  type="text"
                  required
                  value={pkg}
                  onChange={(e) => setPkg(e.target.value)}
                  placeholder="@your-org/your-mcp"
                  className="w-full rounded-md bg-card border border-border px-4 py-3 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b] transition-colors"
                />
              </Field>

              <Field
                label="Anything you'd like to tell us?"
                hint="Optional. Disputed findings, context on your roadmap, whatever."
              >
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Optional..."
                  className="w-full rounded-md bg-card border border-border px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#f59e0b] transition-colors resize-y"
                />
              </Field>

              {errorMsg && (
                <div
                  className="p-3 rounded-md text-sm"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-base font-semibold bg-[#f59e0b] text-background disabled:opacity-60 disabled:cursor-wait transition-opacity"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>Submit for verification →</>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Claims never change grades. An F is an F whether you claim it or
                not — that's the whole point.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 font-semibold text-sm">{label}</div>
      {children}
      {hint && (
        <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div>
      )}
    </label>
  );
}

function SuccessState({
  server,
  pkg,
}: {
  server: { package: string } | null | undefined;
  pkg: string;
}) {
  return (
    <div className="text-center py-12">
      <div
        className="inline-flex items-center justify-center size-16 rounded-full mb-6"
        style={{
          background: "rgba(16,185,129,0.12)",
          border: "1px solid #10b981",
        }}
      >
        <Check className="size-8" style={{ color: "#10b981" }} />
      </div>
      <h1 className="font-extrabold tracking-[-0.04em] text-4xl md:text-5xl mb-4">
        You're on the list.
      </h1>
      <p className="text-lg mb-8 text-muted-foreground max-w-md mx-auto">
        We'll verify your ownership via GitHub and email you within 24 hours.
        Your claim for <strong className="text-foreground">{server?.package ?? pkg}</strong>{" "}
        is in the queue.
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Link
          to="/registry"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold bg-[#f59e0b] text-background"
        >
          Browse the registry →
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold border border-border bg-background"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
