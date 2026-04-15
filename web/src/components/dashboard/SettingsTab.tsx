// ─── Settings Tab ───
// Project info, API key management, webhook config, danger zone

import { useState, useCallback, useEffect, useMemo } from "react";
import type { ProjectInfo } from "./types";
import { apiFetch, fullDate, getCookieConsent, setCookieConsent } from "./utils";

// ─── Props ───

interface SettingsTabProps {
  readonly apiKey: string;
  readonly projectInfo: ProjectInfo | null;
}

// ─── Webhook Types ───

interface Webhook {
  readonly id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly created_at: string;
  readonly active: boolean;
}

// ─── Settings Tab ───

function SettingsTab({ apiKey, projectInfo }: SettingsTabProps) {
  // API Key display
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState<readonly Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhooksError, setWebhooksError] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState("auth.allow,auth.deny");
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);

  // Cookie consent
  const [cookieConsent, setCookieConsentState] = useState(getCookieConsent);

  // Usage stats
  const [usageEvents, setUsageEvents] = useState<number | null>(null);
  const usageLimit = 100_000;

  // Danger zone
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  // ─── Load usage stats ───
  useEffect(() => {
    let cancelled = false;
    async function loadUsage() {
      try {
        const stats = await apiFetch<{ total_events: number }>(
          "/audit/stats?days=365",
          apiKey,
        );
        if (!cancelled) setUsageEvents(stats.total_events ?? 0);
      } catch {
        // Non-critical, ignore
      }
    }
    loadUsage();
    return () => { cancelled = true; };
  }, [apiKey]);

  // ─── Load webhooks ───
  useEffect(() => {
    let cancelled = false;
    async function loadWebhooks() {
      try {
        setWebhooksLoading(true);
        setWebhooksError("");
        const data = await apiFetch<readonly Webhook[]>(
          "/webhooks/",
          apiKey,
        );
        if (!cancelled) setWebhooks(data ?? []);
      } catch (err) {
        if (!cancelled) {
          // Webhooks may not be implemented yet, that's ok
          setWebhooksError(
            err instanceof Error ? err.message : "Failed to load webhooks",
          );
        }
      } finally {
        if (!cancelled) setWebhooksLoading(false);
      }
    }
    loadWebhooks();
    return () => { cancelled = true; };
  }, [apiKey]);

  // ─── API Key helpers ───
  const maskedKey = useMemo(() => {
    if (!apiKey) return "****...****";
    if (apiKey.length <= 12) return apiKey;
    return apiKey.slice(0, 8) + "****...****" + apiKey.slice(-4);
  }, [apiKey]);

  const handleCopyKey = useCallback(() => {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [apiKey]);

  const handleToggleReveal = useCallback(() => {
    setRevealed((prev) => !prev);
  }, []);

  // ─── Cookie consent ───
  const handleCookieToggle = useCallback(() => {
    const newValue = cookieConsent === "accepted" ? "declined" : "accepted";
    setCookieConsent(newValue);
    setCookieConsentState(newValue);
  }, [cookieConsent]);

  // ─── Webhook handlers ───
  const handleCreateWebhook = useCallback(async () => {
    const url = newWebhookUrl.trim();
    if (!url) return;

    try {
      new URL(url);
    } catch {
      setWebhooksError("Invalid URL format");
      return;
    }

    setCreatingWebhook(true);
    setWebhooksError("");
    try {
      const events = newWebhookEvents
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const created = await apiFetch<Webhook>("/webhooks/", apiKey, {
        method: "POST",
        body: JSON.stringify({ url, events }),
      });
      setWebhooks((prev) => [...prev, created]);
      setNewWebhookUrl("");
    } catch (err) {
      setWebhooksError(
        err instanceof Error ? err.message : "Failed to create webhook",
      );
    } finally {
      setCreatingWebhook(false);
    }
  }, [apiKey, newWebhookUrl, newWebhookEvents]);

  const handleDeleteWebhook = useCallback(
    async (webhookId: string) => {
      try {
        await apiFetch(`/webhooks/${webhookId}`, apiKey, {
          method: "DELETE",
        });
        setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
      } catch (err) {
        setWebhooksError(
          err instanceof Error ? err.message : "Failed to delete webhook",
        );
      }
    },
    [apiKey],
  );

  const handleTestWebhook = useCallback(
    async (webhookId: string) => {
      setTestingWebhookId(webhookId);
      try {
        await apiFetch(`/webhooks/${webhookId}/test`, apiKey, {
          method: "POST",
        });
      } catch {
        // Test send is fire-and-forget
      } finally {
        setTimeout(() => setTestingWebhookId(null), 1500);
      }
    },
    [apiKey],
  );

  // ─── Danger zone handlers ───
  const handleRotateKey = useCallback(async () => {
    if (!confirm("This will invalidate your current key immediately. Continue?")) {
      return;
    }
    setRotatingKey(true);
    try {
      await apiFetch("/projects/rotate-key", apiKey, { method: "POST" });
      alert("Key rotated. You will be signed out. Please sign in with your new key.");
      window.location.reload();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to rotate key",
      );
    } finally {
      setRotatingKey(false);
    }
  }, [apiKey]);

  const handleDeleteProject = useCallback(async () => {
    if (deleteInput !== "DELETE") return;
    if (!projectInfo?.id) {
      alert("Missing project info — refresh and try again.");
      return;
    }
    setDeleting(true);
    try {
      await apiFetch(`/projects/${projectInfo.id}`, apiKey, { method: "DELETE" });
      alert("Project deleted. You will be signed out.");
      window.location.reload();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete project",
      );
    } finally {
      setDeleting(false);
    }
  }, [apiKey, deleteInput, projectInfo?.id]);

  // ─── Usage bar ───
  const usagePct =
    usageEvents !== null
      ? Math.min(100, Math.round((usageEvents / usageLimit) * 100))
      : 0;
  const usageBarColor =
    usagePct < 60
      ? "from-green-500 to-blue-500"
      : usagePct < 85
        ? "from-amber-500 to-green-500"
        : "from-red-500 to-amber-500";

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Project configuration and API keys
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* ─── Project Information ─── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {"\uD83D\uDCC4"} Project Information
          </h3>
          <div className="space-y-3">
            <SettingsRow label="Project ID">
              <span className="font-mono text-xs text-muted-foreground">
                {projectInfo?.id ?? "--"}
              </span>
            </SettingsRow>
            <SettingsRow label="Project Name">
              <span className="text-sm text-foreground">
                {projectInfo?.name ?? "--"}
              </span>
            </SettingsRow>
            <SettingsRow label="Plan">
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-primary/10 text-primary border border-primary/20">
                {projectInfo?.plan ?? "--"}
              </span>
            </SettingsRow>
            <SettingsRow label="Created">
              <span className="text-xs text-muted-foreground">
                {fullDate(projectInfo?.created_at)}
              </span>
            </SettingsRow>
          </div>
        </section>

        {/* ─── API Key ─── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {"\uD83D\uDD11"} API Key
          </h3>
          <SettingsRow label="Your API Key">
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded border border-border break-all">
                {revealed ? apiKey : maskedKey}
              </code>
              <button
                onClick={handleToggleReveal}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border rounded"
              >
                {revealed ? "Hide" : "Reveal"}
              </button>
              <button
                onClick={handleCopyKey}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-border rounded"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </SettingsRow>
        </section>

        {/* ─── Usage ─── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {"\uD83D\uDCC8"} Usage
          </h3>
          <SettingsRow label="Audit Events">
            <div className="flex items-center gap-3">
              <div className="w-40 h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${usageBarColor} transition-all duration-500`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {usageEvents !== null
                  ? `${usageEvents.toLocaleString()} / ${usageLimit.toLocaleString()}`
                  : "-- / --"}
              </span>
            </div>
          </SettingsRow>
        </section>

        {/* ─── Webhooks ─── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {"\uD83D\uDD17"} Webhooks
          </h3>

          {webhooksError && (
            <div className="text-xs text-red-500 mb-3 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
              {webhooksError}
            </div>
          )}

          {webhooksLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!webhooksLoading && webhooks.length > 0 && (
            <div className="space-y-2 mb-4">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="flex items-center gap-3 bg-muted/20 border border-border rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-foreground truncate">
                      {wh.url}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {wh.events.join(", ")}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestWebhook(wh.id)}
                    disabled={testingWebhookId === wh.id}
                    className="text-[10px] px-2 py-1 border border-border rounded text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {testingWebhookId === wh.id ? "Sent!" : "Test"}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="text-[10px] px-2 py-1 border border-red-500/20 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {!webhooksLoading && webhooks.length === 0 && !webhooksError && (
            <p className="text-xs text-muted-foreground mb-4">
              No webhooks configured.
            </p>
          )}

          {/* Create webhook form */}
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] text-muted-foreground mb-1">
                Endpoint URL
              </label>
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="min-w-[160px]">
              <label className="block text-[10px] text-muted-foreground mb-1">
                Events (comma-separated)
              </label>
              <input
                type="text"
                value={newWebhookEvents}
                onChange={(e) => setNewWebhookEvents(e.target.value)}
                placeholder="auth.allow,auth.deny"
                className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={handleCreateWebhook}
              disabled={creatingWebhook || !newWebhookUrl.trim()}
              className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {creatingWebhook ? "Adding..." : "Add Webhook"}
            </button>
          </div>
        </section>

        {/* ─── Cookie Consent ─── */}
        <section className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {"\uD83C\uDF6A"} Privacy
          </h3>
          <SettingsRow label="Analytics Cookies">
            <button
              onClick={handleCookieToggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                cookieConsent === "accepted" ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                  cookieConsent === "accepted" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </SettingsRow>
        </section>

        {/* ─── Danger Zone ─── */}
        <section className="bg-red-500/[0.03] border border-red-500/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-500 mb-4">
            Danger Zone
          </h3>
          <div className="space-y-4">
            {/* Rotate Key */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-foreground">
                  Rotate API Key
                </div>
                <div className="text-[11px] text-muted-foreground">
                  This will invalidate your current key immediately.
                </div>
              </div>
              <button
                onClick={handleRotateKey}
                disabled={rotatingKey}
                className="px-3 py-1.5 text-xs border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50 shrink-0"
              >
                {rotatingKey ? "Rotating..." : "Rotate Key"}
              </button>
            </div>

            {/* Delete Project */}
            <div className="pt-3 border-t border-red-500/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Delete Project
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Permanently delete this project and all associated data.
                  </div>
                </div>
                <button
                  onClick={() => setConfirmDelete((prev) => !prev)}
                  className="px-3 py-1.5 text-xs border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                >
                  {confirmDelete ? "Cancel" : "Delete Project"}
                </button>
              </div>
              {confirmDelete && (
                <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-red-600 mb-2">
                    Type <strong>DELETE</strong> to confirm:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="DELETE"
                      className="flex-1 px-3 py-1.5 text-xs bg-background border border-red-500/30 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-red-500/30"
                    />
                    <button
                      onClick={handleDeleteProject}
                      disabled={deleteInput !== "DELETE" || deleting}
                      className="px-3 py-1.5 text-xs bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── Settings Row Helper ───

interface SettingsRowProps {
  readonly label: string;
  readonly children: React.ReactNode;
}

function SettingsRow({ label, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-xs font-medium text-muted-foreground shrink-0">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

export { SettingsTab };
