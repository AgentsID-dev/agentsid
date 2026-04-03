// ─── Agent Cards ───
// Grid of agent cards with search, filtering, and profile view

import { useState, useEffect, useCallback, useRef } from "react";
import type { Agent, AuditEntry, AuditStats, PermissionRule } from "./types";
import {
  agentGradient,
  agentInitial,
  agentPersonality,
  effectiveStatus,
  relativeTime,
  apiFetch,
} from "./utils";
import { Plus, LayoutGrid, Network } from "lucide-react";
import { RegisterAgentModal } from "./RegisterAgentModal";
import { AgentDetail } from "./AgentDetail";
import { AgentCardSkeleton } from "./Skeletons";
import { AgentGraph } from "./AgentGraph";

// ─── Token Expiry Helpers ───

function tokenTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

interface AgentCardsProps {
  readonly agents: readonly Agent[];
  readonly apiKey: string;
  readonly agentMap: Record<string, Agent>;
  readonly onAgentsChanged: () => void;
  readonly projectInfo?: { name: string; plan: string; id: string } | null;
  readonly auditStats?: AuditStats | null;
}

interface AgentAuditCache {
  readonly entries: readonly AuditEntry[];
  readonly allows: number;
  readonly denies: number;
}

function AgentCards({
  agents,
  apiKey,
  agentMap,
  onAgentsChanged,
  projectInfo = null,
  auditStats = null,
}: AgentCardsProps) {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "graph">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewingAgentId, setViewingAgentId] = useState<string | null>(null);
  const [auditCache, setAuditCache] = useState<
    Record<string, AgentAuditCache>
  >({});
  const [permissionCounts, setPermissionCounts] = useState<
    Record<string, number>
  >({});
  const [refreshingAgentId, setRefreshingAgentId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load audit data for all agents
  useEffect(() => {
    if (agents.length === 0) return;
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadAuditData = async () => {
      const cache: Record<string, AgentAuditCache> = {};
      await Promise.all(
        agents.map(async (agent) => {
          try {
            const audit = await apiFetch<{
              entries: AuditEntry[];
              total: number;
            }>("/audit/?agent_id=" + agent.id + "&limit=30", apiKey);
            const entries = audit.entries ?? [];
            const allows = entries.filter((e) => e.action === "allow").length;
            const denies = entries.filter((e) => e.action === "deny").length;
            cache[agent.id] = { entries, allows, denies };
          } catch {
            cache[agent.id] = { entries: [], allows: 0, denies: 0 };
          }
        }),
      );
      setAuditCache(cache);
    };

    const loadPermCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        agents.map(async (agent) => {
          try {
            const data = await apiFetch<{ rules: PermissionRule[] }>(
              "/agents/" + agent.id + "/permissions",
              apiKey,
            );
            counts[agent.id] = (data.rules ?? []).length;
          } catch {
            counts[agent.id] = 0;
          }
        }),
      );
      setPermissionCounts(counts);
    };

    loadAuditData();
    loadPermCounts();
  }, [agents, apiKey]);

  // Reset loaded ref when agents change
  useEffect(() => {
    loadedRef.current = false;
  }, [agents.length]);

  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.created_by.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      !statusFilter || effectiveStatus(a) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openProfile = useCallback(
    (agentId: string) => {
      setViewingAgentId(agentId);
    },
    [],
  );

  const refreshToken = useCallback(
    async (agentId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setRefreshingAgentId(agentId);
      try {
        await apiFetch("/agents/" + agentId + "/refresh", apiKey, {
          method: "POST",
        });
        onAgentsChanged();
      } catch (e) {
        alert(
          "Failed to refresh token: " +
            (e instanceof Error ? e.message : "Unknown error"),
        );
      } finally {
        setRefreshingAgentId(null);
      }
    },
    [apiKey, onAgentsChanged],
  );

  // ─── Detail View ───
  if (viewingAgentId) {
    const agent = agentMap[viewingAgentId];
    if (!agent) return null;
    return (
      <AgentDetail
        agent={agent}
        apiKey={apiKey}
        onBack={() => setViewingAgentId(null)}
        onAgentsChanged={onAgentsChanged}
      />
    );
  }

  // ─── Grid View ───
  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all min-w-[240px]"
          placeholder="Search agents..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary cursor-pointer w-[140px] appearance-none"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="revoked">Revoked</option>
          <option value="expired">Expired</option>
        </select>

        {/* View Toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            onClick={() => setViewMode("graph")}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors border-l border-border ${
              viewMode === "graph"
                ? "bg-primary/10 text-primary"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
            title="Graph view"
          >
            <Network className="w-3.5 h-3.5" />
            Graph
          </button>
        </div>

        <button
          onClick={() => setRegisterOpen(true)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-primary to-amber-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Register Agent
        </button>
      </div>

      {/* Register Agent Modal */}
      <RegisterAgentModal
        open={registerOpen}
        apiKey={apiKey}
        onClose={() => setRegisterOpen(false)}
        onSuccess={onAgentsChanged}
      />

      {/* Graph View */}
      {viewMode === "graph" && (
        <AgentGraph
          agents={filteredAgents}
          apiKey={apiKey}
          projectInfo={projectInfo}
          auditStats={auditStats}
          onAgentSelect={openProfile}
        />
      )}

      {/* Grid View */}
      {viewMode === "grid" && agents.length > 0 && Object.keys(auditCache).length === 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          <AgentCardSkeleton />
          <AgentCardSkeleton />
          <AgentCardSkeleton />
        </div>
      ) : viewMode === "grid" && filteredAgents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl opacity-50 mb-3">{"\uD83D\uDC65"}</div>
          <p className="text-sm">No agents found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredAgents.map((agent) => {
            const agentAudit = auditCache[agent.id] ?? {
              entries: [],
              allows: 0,
              denies: 0,
            };
            const totalEvents = agentAudit.allows + agentAudit.denies;
            const denyRate =
              totalEvents > 0 ? (agentAudit.denies / totalEvents) * 100 : 0;
            const personality = agentPersonality(denyRate, totalEvents);
            const status = effectiveStatus(agent);
            const statusLabel =
              status.charAt(0).toUpperCase() + status.slice(1);
            const gradient = agentGradient(agent.id);
            const initial = agentInitial(agent.name);
            const sparkEntries = [...(agentAudit.entries ?? [])]
              .slice(0, 20)
              .reverse();

            return (
              <div
                key={agent.id}
                onClick={() => openProfile(agent.id)}
                className="bg-card border border-border rounded-2xl p-6 cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md hover:border-border/80 group relative overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-3.5 mb-4">
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center font-extrabold text-[22px] text-white shrink-0"
                    style={{ background: gradient }}
                  >
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-bold tracking-tight truncate">
                      {agent.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {personality.emoji} {personality.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                        status === "active"
                          ? "bg-green-500 shadow-[0_0_6px_rgba(22,163,74,0.3)] animate-pulse"
                          : status === "expiring"
                            ? "bg-amber-500 shadow-[0_0_4px_rgba(217,119,6,0.3)] animate-pulse"
                            : status === "revoked"
                              ? "bg-red-500 shadow-[0_0_4px_rgba(220,38,38,0.3)]"
                              : "bg-muted-foreground"
                      }`}
                    />
                    <span
                      className={`text-[11px] ${
                        status === "expiring"
                          ? "text-amber-500 font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Token Expiry Warning */}
                {status === "expiring" && (
                  <div className="flex items-center justify-between gap-2 mb-2 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <span
                      className="text-[11px] text-amber-600 truncate"
                      title={`Token expires in ${tokenTimeRemaining(agent.expires_at)} — refresh to extend`}
                    >
                      Expires in {tokenTimeRemaining(agent.expires_at)} — refresh to extend
                    </span>
                    <button
                      onClick={(e) => refreshToken(agent.id, e)}
                      disabled={refreshingAgentId === agent.id}
                      className="shrink-0 px-2 py-0.5 text-[10px] font-semibold bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50"
                    >
                      {refreshingAgentId === agent.id ? "..." : "Refresh"}
                    </button>
                  </div>
                )}

                {/* Sparkline */}
                <div className="flex items-end gap-px h-5 mb-2.5">
                  {sparkEntries.length > 0
                    ? sparkEntries.map((e, i) => (
                        <span
                          key={i}
                          className="flex-1 rounded-sm min-h-[1px]"
                          style={{
                            height: `${Math.floor(Math.random() * 12) + 6}px`,
                            background:
                              e.action === "allow"
                                ? "var(--color-green-500, #16a34a)"
                                : "var(--color-red-500, #dc2626)",
                          }}
                        />
                      ))
                    : Array.from({ length: 15 }, (_, i) => (
                        <span
                          key={i}
                          className="flex-1 rounded-sm bg-muted-foreground/30"
                          style={{ height: "3px" }}
                        />
                      ))}
                </div>

                {/* Meta */}
                <div className="flex justify-between text-[11px] text-muted-foreground/70">
                  <span>
                    Last seen:{" "}
                    {relativeTime(
                      agentAudit.entries.length > 0
                        ? agentAudit.entries[0].created_at
                        : agent.created_at,
                    )}
                  </span>
                  <span className="bg-primary/10 text-primary px-1.5 py-px rounded-md text-[10px] font-semibold border border-primary/20">
                    {permissionCounts[agent.id] ?? "..."} rules
                  </span>
                </div>

                {/* Hover hint */}
                <div className="text-center text-[11px] text-primary opacity-0 mt-2 pt-2 border-t border-border transition-opacity group-hover:opacity-100">
                  Click for details {"\u2192"}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export { AgentCards };
