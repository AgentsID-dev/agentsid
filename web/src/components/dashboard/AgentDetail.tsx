// ─── Agent Detail View ───
// Full-width detail view replacing the main content area when an agent is selected

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Shield,
  Clock,
  Activity,
  Check,
} from "lucide-react";
import type { Agent, AuditEntry, PermissionRule, AuditStats } from "./types";
import {
  agentGradient,
  agentInitial,
  agentPersonality,
  effectiveStatus,
  fullDate,
  expiresDisplay,
  maskToken,
  relativeTime,
  apiFetch,
} from "./utils";
import { PermissionEditor } from "./PermissionEditor";
import { ActivityTimeline } from "./ActivityTimeline";

// ─── Types ───

interface AgentDetailProps {
  readonly agent: Agent;
  readonly apiKey: string;
  readonly onBack: () => void;
  readonly onAgentsChanged: () => void;
}

interface DetailData {
  readonly audit: readonly AuditEntry[];
  readonly auditTotal: number;
  readonly permissions: readonly PermissionRule[];
  readonly stats: AuditStats;
}

// ─── Helpers ───

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500 text-white",
  expiring: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  revoked: "bg-red-500 text-white",
  expired: "bg-muted-foreground/10 text-muted-foreground",
};

function computeStats(audit: readonly AuditEntry[], total: number): AuditStats {
  const allows = audit.filter((e) => e.action === "allow").length;
  const denies = audit.filter((e) => e.action === "deny").length;
  const byTool: Record<string, number> = {};
  for (const entry of audit) {
    byTool[entry.tool] = (byTool[entry.tool] ?? 0) + 1;
  }
  const denyRate = total > 0 ? (denies / Math.min(total, audit.length)) * 100 : 0;
  return { total_events: total, deny_rate_pct: denyRate, by_action: { allow: allows, deny: denies }, by_tool: byTool };
}

function mostUsedTool(byTool?: Record<string, number>): string {
  if (!byTool) return "--";
  const entries = Object.entries(byTool);
  if (entries.length === 0) return "--";
  return [...entries].sort((a, b) => b[1] - a[1])[0][0];
}

// ─── Copyable ID ───

function CopyableId({ value }: { readonly value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-mono text-sm hover:text-primary transition-colors bg-transparent border-none cursor-pointer p-0 text-foreground"
      title="Copy to clipboard"
    >
      <span className="truncate max-w-[180px]">{value}</span>
      {copied ? <Check className="w-3 h-3 text-green-500 shrink-0" /> : <Copy className="w-3 h-3 text-muted-foreground shrink-0" />}
    </button>
  );
}

// ─── Info Field ───

function InfoField({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm mt-0.5">{children}</div>
    </div>
  );
}

// ─── Main Component ───

function AgentDetail({ agent, apiKey, onBack, onAgentsChanged }: AgentDetailProps) {
  const [data, setData] = useState<DetailData | null>(null);
  const [editingPerms, setEditingPerms] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = effectiveStatus(agent);
  const gradient = agentGradient(agent.id);
  const initial = agentInitial(agent.name);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [auditRes, permRes] = await Promise.all([
        apiFetch<{ entries: AuditEntry[]; total: number }>(`/audit/?agent_id=${agent.id}&limit=50`, apiKey)
          .catch(() => ({ entries: [] as AuditEntry[], total: 0 })),
        apiFetch<{ rules: PermissionRule[] }>(`/agents/${agent.id}/permissions`, apiKey)
          .catch(() => ({ rules: [] as PermissionRule[] })),
      ]);
      const audit = auditRes.entries ?? [];
      const total = auditRes.total ?? 0;
      setData({ audit, auditTotal: total, permissions: permRes.rules ?? [], stats: computeStats(audit, total) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agent data");
    }
  }, [agent.id, apiKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRevoke = useCallback(async () => {
    setRevoking(true);
    try {
      await apiFetch(`/agents/${agent.id}`, apiKey, { method: "DELETE" });
      onAgentsChanged();
      onBack();
    } catch (e) {
      alert("Failed to revoke: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setRevoking(false);
    }
  }, [agent.id, apiKey, onAgentsChanged, onBack]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await apiFetch(`/agents/${agent.id}/refresh`, apiKey, { method: "POST" });
      onAgentsChanged();
    } catch (e) {
      alert("Failed to refresh: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setRefreshing(false);
    }
  }, [agent.id, apiKey, onAgentsChanged]);

  // Derived values
  const stats = data?.stats;
  const denyRate = stats?.deny_rate_pct ?? 0;
  const totalEvents = stats?.total_events ?? 0;
  const allowRate = totalEvents > 0 ? 100 - denyRate : 0;
  const personality = agentPersonality(denyRate, totalEvents);
  const lastUsed = data?.audit && data.audit.length > 0 ? relativeTime(data.audit[0].created_at) : "--";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="mb-6 p-6 bg-card border border-border rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ background: gradient }} />
        <div className="relative">
          <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground text-sm bg-transparent border-none p-0 mb-4 hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> All Agents
          </button>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-3xl text-white shrink-0 shadow-lg" style={{ background: gradient }}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold tracking-tight m-0">{agent.name}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold ${STATUS_STYLES[status] ?? STATUS_STYLES.expired}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {data ? `${personality.emoji} ${personality.label} -- ${personality.desc}` : "Loading..."}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {status === "expiring" && (
                <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh Token
                </button>
              )}
              {agent.status === "active" && (
                <button onClick={handleRevoke} disabled={revoking} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-destructive/40 text-destructive rounded-lg bg-transparent hover:bg-destructive hover:text-white transition-all disabled:opacity-50 cursor-pointer">
                  {revoking ? "Revoking..." : "Revoke Agent"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Info Cards Row */}
      <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-1">
        <div className="bg-card border border-border rounded-xl p-5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Identity</span>
          </div>
          <div className="space-y-2.5">
            <InfoField label="Agent ID"><CopyableId value={agent.id} /></InfoField>
            <InfoField label="Created by">{agent.created_by}</InfoField>
            <InfoField label="Created at">{fullDate(agent.created_at)}</InfoField>
            <InfoField label="Expires at">{agent.expires_at ? fullDate(agent.expires_at) : "Never"}</InfoField>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Token</span>
          </div>
          <div className="space-y-2.5">
            <InfoField label="Token ID"><span className="font-mono">{maskToken("tok_" + agent.id.slice(4))}</span></InfoField>
            <InfoField label="Status">{status.charAt(0).toUpperCase() + status.slice(1)}</InfoField>
            <InfoField label="TTL Remaining">{expiresDisplay(agent.expires_at)}</InfoField>
            <InfoField label="Last used">{lastUsed}</InfoField>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Stats</span>
          </div>
          <div className="space-y-2.5">
            <InfoField label="Total events"><span className="font-semibold">{totalEvents}</span></InfoField>
            <InfoField label="Allow rate">{totalEvents > 0 ? `${Math.round(allowRate)}%` : "--"}</InfoField>
            <InfoField label="Deny rate">{totalEvents > 0 ? `${Math.round(denyRate)}%` : "--"}</InfoField>
            <InfoField label="Most used tool"><span className="font-mono">{mostUsedTool(stats?.by_tool)}</span></InfoField>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Permissions ({data?.permissions.length ?? "..."} rules)
          </div>
          {data && !editingPerms && (
            <button onClick={() => setEditingPerms(true)} className="px-3 py-1 text-[11px] font-semibold text-primary border border-primary/30 rounded-lg bg-transparent hover:bg-primary/10 transition-colors cursor-pointer">
              Edit Permissions
            </button>
          )}
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 min-h-[100px]">
          {!data ? (
            <div className="flex justify-center py-6">
              <span className="inline-block w-6 h-6 border-3 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : editingPerms ? (
            <PermissionEditor agentId={agent.id} apiKey={apiKey} initialRules={data.permissions} onSaved={() => { setEditingPerms(false); loadData(); }} />
          ) : data.permissions.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">No permission rules configured</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.permissions.map((rule, i) => (
                <span key={i} className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium ${rule.action === "allow" ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>
                  {rule.action === "allow" ? "\u2713" : "\u2717"} {rule.tool_pattern}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">Activity Timeline</div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <ActivityTimeline entries={data?.audit ?? []} loading={!data} />
        </div>
      </div>
    </div>
  );
}

export { AgentDetail };
