// ─── Audit Feed ───
// Real-time audit log with auto-refresh, filters, and expandable rows

import { useState, useEffect, useCallback, useRef } from "react";
import type { Agent, AuditEntry, AuditStats } from "./types";
import {
  agentColor,
  agentInitial,
  relativeTime,
  fullDate,
  apiFetch,
} from "./utils";
import { AuditRowSkeleton } from "./Skeletons";

const AUDIT_REFRESH_MS = 5000;
const AUDIT_PAGE_SIZE = 50;

interface AuditFeedProps {
  readonly apiKey: string;
  readonly agents: readonly Agent[];
  readonly agentMap: Record<string, Agent>;
  readonly auditStats: AuditStats | null;
  readonly isActive: boolean;
}

function AuditFeed({
  apiKey,
  agents,
  agentMap,
  auditStats,
  isActive,
}: AuditFeedProps) {
  const [entries, setEntries] = useState<readonly AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    agent_id: "",
    tool: "",
    action: "",
    search: "",
  });
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [verifyResult, setVerifyResult] = useState<{
    type: "success" | "failure";
    message: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const previousIdsRef = useRef<Set<number>>(new Set());
  const [newIds, setNewIds] = useState<Set<number>>(new Set());

  const loadAudit = useCallback(async () => {
    try {
      let params = `?limit=${AUDIT_PAGE_SIZE}&offset=${offset}`;
      if (filters.agent_id)
        params += "&agent_id=" + encodeURIComponent(filters.agent_id);
      if (filters.tool)
        params += "&tool=" + encodeURIComponent(filters.tool);
      if (filters.action)
        params += "&action=" + encodeURIComponent(filters.action);

      const data = await apiFetch<{
        entries: AuditEntry[];
        total: number;
      }>("/audit/" + params, apiKey);
      const newEntries = data.entries ?? [];
      const currentIds = new Set(newEntries.map((e) => e.id));

      // Track new entries for animation
      const freshIds = new Set<number>();
      if (previousIdsRef.current.size > 0) {
        currentIds.forEach((id) => {
          if (!previousIdsRef.current.has(id)) freshIds.add(id);
        });
      }
      setNewIds(freshIds);
      previousIdsRef.current = currentIds;

      setEntries(newEntries);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error("Failed to load audit:", e);
    } finally {
      setInitialLoading(false);
    }
  }, [apiKey, offset, filters]);

  // Initial load and auto-refresh
  useEffect(() => {
    if (!isActive) return;
    loadAudit();
    const timer = setInterval(loadAudit, AUDIT_REFRESH_MS);
    return () => clearInterval(timer);
  }, [isActive, loadAudit]);

  const handleFilterChange = useCallback(
    (key: string, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setOffset(0);
    },
    [],
  );

  const verifyChain = useCallback(async () => {
    setVerifying(true);
    try {
      const result = await apiFetch<{
        verified: boolean;
        entries_checked: number;
        message?: string;
      }>("/audit/verify", apiKey);
      if (result.verified) {
        setVerifyResult({
          type: "success",
          message: `Chain Intact \u2014 ${result.entries_checked} entries verified`,
        });
      } else {
        setVerifyResult({
          type: "failure",
          message: `Tampered \u2014 ${result.message ?? "Unknown issue"}`,
        });
      }
    } catch (e) {
      setVerifyResult({
        type: "failure",
        message: `Verification failed: ${e instanceof Error ? e.message : "Unknown error"}`,
      });
    } finally {
      setVerifying(false);
      setTimeout(() => setVerifyResult(null), 10000);
    }
  }, [apiKey]);

  // Apply search filter client-side
  const filteredEntries = filters.search
    ? entries.filter((e) => {
        const s = filters.search.toLowerCase();
        const agentName = agentMap[e.agent_id]?.name ?? "";
        return (
          (e.tool ?? "").toLowerCase().includes(s) ||
          (e.agent_id ?? "").toLowerCase().includes(s) ||
          (e.result ?? "").toLowerCase().includes(s) ||
          agentName.toLowerCase().includes(s)
        );
      })
    : entries;

  // Build tool options from stats and entries
  const toolOptions = new Set<string>();
  if (auditStats?.by_tool) {
    Object.keys(auditStats.by_tool).forEach((t) => toolOptions.add(t));
  }
  entries.forEach((e) => {
    if (e.tool) toolOptions.add(e.tool);
  });

  const showing = filteredEntries.length;
  const canPrev = offset > 0;
  const canNext = offset + AUDIT_PAGE_SIZE < total;

  return (
    <div>
      {/* Verify result */}
      {verifyResult && (
        <div
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold mb-3 animate-in fade-in zoom-in duration-300 ${
            verifyResult.type === "success"
              ? "bg-green-500/10 text-green-600 border border-green-500/30"
              : "bg-red-500/10 text-red-600 border border-red-500/30"
          }`}
        >
          {verifyResult.type === "success" ? "\u2713" : "\u2717"}{" "}
          {verifyResult.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          className="bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all min-w-[240px]"
          placeholder="Search events..."
        />
        <select
          value={filters.agent_id}
          onChange={(e) => handleFilterChange("agent_id", e.target.value)}
          className="bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none cursor-pointer w-[160px] appearance-none"
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={filters.tool}
          onChange={(e) => handleFilterChange("tool", e.target.value)}
          className="bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none cursor-pointer w-[160px] appearance-none"
        >
          <option value="">All Tools</option>
          {[...toolOptions].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={filters.action}
          onChange={(e) => handleFilterChange("action", e.target.value)}
          className="bg-background border border-border rounded-lg px-3.5 py-2 text-sm text-foreground outline-none cursor-pointer w-[120px] appearance-none"
        >
          <option value="">All Actions</option>
          <option value="allow">Allow</option>
          <option value="deny">Deny</option>
        </select>
        <button
          onClick={verifyChain}
          disabled={verifying}
          className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:border-primary/30 hover:text-foreground transition-all disabled:opacity-40 overflow-hidden min-w-[120px] justify-center"
        >
          {verifying && (
            <span className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary to-blue-500 opacity-30 animate-pulse w-full" />
          )}
          <span className="relative z-10">
            {verifying ? "Verifying..." : "Verify Chain"}
          </span>
        </button>
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold ml-auto tracking-wider">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Live header */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Feed
          <label className="ml-auto flex items-center gap-1.5 cursor-pointer text-[11px] text-muted-foreground/70 normal-case tracking-normal font-normal">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="accent-green-500"
            />
            Auto-scroll
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border w-11" />
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  Tool
                </th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  Result
                </th>
                <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {initialLoading ? (
                Array.from({ length: 8 }, (_, i) => (
                  <AuditRowSkeleton key={i} />
                ))
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="text-center py-12 text-muted-foreground">
                      <div className="text-4xl opacity-50 mb-3">
                        {"\uD83D\uDCCB"}
                      </div>
                      <p className="text-sm">No events found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const agent = agentMap[entry.agent_id];
                  const agentName = agent?.name ?? entry.agent_id;
                  const color = agentColor(entry.agent_id);
                  const initial = agentInitial(agentName);
                  const isAllow = entry.action === "allow";
                  const isNew = newIds.has(entry.id);
                  const isExpanded = expandedRow === entry.id;

                  const resultBadge =
                    entry.result === "success"
                      ? "bg-green-500 text-white"
                      : entry.result === "blocked"
                        ? "bg-red-500 text-white"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20";

                  return (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      agentName={agentName}
                      color={color}
                      initial={initial}
                      isAllow={isAllow}
                      isNew={isNew}
                      isExpanded={isExpanded}
                      resultBadgeClass={resultBadge}
                      onToggle={() =>
                        setExpandedRow(isExpanded ? null : entry.id)
                      }
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 text-xs text-muted-foreground border-t border-border">
          <div>
            {total > 0
              ? `Showing ${offset + 1}\u2013${offset + showing} of ${total}`
              : "No events"}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setOffset(Math.max(0, offset - AUDIT_PAGE_SIZE))}
              disabled={!canPrev}
              className="px-3 py-1.5 border border-border rounded-lg text-muted-foreground text-xs hover:border-primary/30 hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {"\u00AB"} Prev
            </button>
            <button
              onClick={() => setOffset(offset + AUDIT_PAGE_SIZE)}
              disabled={!canNext}
              className="px-3 py-1.5 border border-border rounded-lg text-muted-foreground text-xs hover:border-primary/30 hover:text-foreground transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next {"\u00BB"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Audit Row ───

interface AuditRowProps {
  readonly entry: AuditEntry;
  readonly agentName: string;
  readonly color: string;
  readonly initial: string;
  readonly isAllow: boolean;
  readonly isNew: boolean;
  readonly isExpanded: boolean;
  readonly resultBadgeClass: string;
  readonly onToggle: () => void;
}

function AuditRow({
  entry,
  agentName,
  color,
  initial,
  isAllow,
  isNew,
  isExpanded,
  resultBadgeClass,
  onToggle,
}: AuditRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b border-border transition-colors ${
          isAllow
            ? "bg-green-500/5 hover:bg-green-500/10"
            : "bg-red-500/5 hover:bg-red-500/10"
        } ${isNew ? "animate-in slide-in-from-top-2 fade-in duration-400" : ""}`}
      >
        <td className="px-4 py-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: color }}
          >
            {initial}
          </div>
        </td>
        <td className="px-4 py-2.5 text-sm font-semibold">{agentName}</td>
        <td className="px-4 py-2.5 font-mono text-xs text-foreground">
          {entry.tool}
        </td>
        <td className="px-4 py-2.5">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold ${
              isAllow ? "bg-green-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {isAllow ? "ALLOW" : "DENY"}
          </span>
        </td>
        <td className="px-4 py-2.5">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-xl text-[11px] font-semibold ${resultBadgeClass}`}
          >
            {entry.result === "success"
              ? "Success"
              : entry.result === "blocked"
                ? "Blocked"
                : "Error"}
          </span>
        </td>
        <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
          {relativeTime(entry.created_at)}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-card border-b border-border">
          <td colSpan={6}>
            <div className="px-5 py-4 text-xs">
              <div className="grid grid-cols-3 gap-3 max-md:grid-cols-1">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Event ID
                  </div>
                  <div className="text-sm font-mono mt-0.5">
                    #{entry.id}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Agent ID
                  </div>
                  <div className="text-sm font-mono mt-0.5">
                    {entry.agent_id}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Full Timestamp
                  </div>
                  <div className="text-sm mt-0.5">
                    {fullDate(entry.created_at)}
                  </div>
                </div>
              </div>

              {entry.delegation_chain && (
                <div className="mt-3.5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Delegation Chain
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    {entry.delegation_chain.map((c, i) => (
                      <span key={i}>
                        {i > 0 && (
                          <span className="text-muted-foreground/50 mx-1">
                            {"\u2192"}
                          </span>
                        )}
                        <span className="bg-muted-foreground/10 text-muted-foreground px-2.5 py-0.5 rounded-xl text-[11px] font-semibold">
                          {c.type}: {c.id}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {entry.delegated_by && (
                <div className="mt-3.5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Delegated By
                  </div>
                  <div className="text-xs font-mono mt-1">
                    {entry.delegated_by}
                  </div>
                </div>
              )}

              {entry.error_message && (
                <div className="mt-3.5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Error
                  </div>
                  <div className="text-destructive text-xs mt-1">
                    {entry.error_message}
                  </div>
                </div>
              )}

              {entry.params && (
                <div className="mt-3.5">
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Parameters
                  </div>
                  <pre className="bg-background px-4 py-3 rounded-lg font-mono text-[11px] overflow-x-auto mt-2 text-muted-foreground border border-border">
                    {JSON.stringify(entry.params, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export { AuditFeed };
