// ─── Overview Tab (Command Center) ───
// Stats cards, agent constellation, recent activity, quick actions

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Agent, AuditEntry, AuditStats, SidebarTab } from "./types";
import {
  agentColor,
  agentInitial,
  relativeTime,
  effectiveStatus,
  generateSparklineData,
  apiFetch,
} from "./utils";
import { AgentConstellation } from "./AgentConstellation";
import { EventsChart } from "./EventsChart";
import { StatsCardSkeleton } from "./Skeletons";

// ─── Props ───

interface OverviewTabProps {
  readonly apiKey: string;
  readonly agents: readonly Agent[];
  readonly auditStats: AuditStats | null;
  readonly onTabChange: (tab: SidebarTab) => void;
  readonly onRegisterAgent?: () => void;
}

// ─── Animated Counter Hook ───

function useAnimatedCounter(target: number, duration = 800): number {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = display;
    if (start === target) return;

    const diff = target - start;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // We intentionally only react to target changes, not display
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

// ─── Sparkline Component ───

interface SparklineProps {
  readonly data: readonly number[];
}

function Sparkline({ data }: SparklineProps) {
  const maxVal = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-6">
      {data.map((v, i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-primary/30 transition-all duration-300"
          style={{ height: Math.max(2, (v / maxVal) * 24) }}
        />
      ))}
    </div>
  );
}

// ─── Stat Card ───

interface StatCardProps {
  readonly label: string;
  readonly value: number;
  readonly suffix?: string;
  readonly detail: string;
  readonly seed: number;
}

function StatCard({ label, value, suffix, detail, seed }: StatCardProps) {
  const animatedValue = useAnimatedCounter(value);
  const sparkData = useMemo(() => generateSparklineData(seed, 12), [seed]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex-1 min-w-[140px]">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className="text-2xl font-bold text-foreground mt-1">
        {animatedValue}
        {suffix ?? ""}
      </div>
      <Sparkline data={sparkData} />
      <div className="text-[11px] text-muted-foreground mt-1">{detail}</div>
    </div>
  );
}

// ─── Activity Item ───

interface ActivityItemProps {
  readonly entry: AuditEntry;
  readonly agentMap: Record<string, Agent>;
  readonly index: number;
}

function ActivityItem({ entry, agentMap, index }: ActivityItemProps) {
  const agent = agentMap[entry.agent_id];
  const agentName = agent ? agent.name : entry.agent_id;
  const color = agentColor(entry.agent_id);
  const initial = agentInitial(agentName);
  const isAllow = entry.action === "allow";

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isAllow ? "hover:bg-green-500/5" : "hover:bg-red-500/5"
      }`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ background: color }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-foreground truncate">
          {agentName}
        </span>
        <span className="text-xs text-muted-foreground font-mono truncate">
          {entry.tool}
        </span>
        <span
          className={`inline-block px-1.5 py-px rounded text-[10px] font-semibold ${
            isAllow
              ? "bg-green-500/10 text-green-600"
              : "bg-red-500/10 text-red-600"
          }`}
        >
          {isAllow ? "Allow" : "Deny"}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground shrink-0">
        {relativeTime(entry.created_at)}
      </div>
    </div>
  );
}

// ─── Plan Limits ───

const FREE_PLAN_EVENT_LIMIT = 10_000;  // Launch promo
const FREE_PLAN_AGENT_LIMIT = 25;     // Launch promo
const USAGE_WARNING_THRESHOLD = 0.80;
const USAGE_CRITICAL_THRESHOLD = 0.95;

interface UsageBannerProps {
  readonly usagePct: number;
  readonly usageLabel: string;
  readonly onSettingsClick: () => void;
}

function UsageBanner({ usagePct, usageLabel, onSettingsClick }: UsageBannerProps) {
  if (usagePct <= USAGE_WARNING_THRESHOLD * 100) return null;

  const isCritical = usagePct > USAGE_CRITICAL_THRESHOLD * 100;
  const pctDisplay = Math.round(usagePct);

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium ${
        isCritical
          ? "bg-red-500/10 border border-red-500/30 text-red-600"
          : "bg-amber-500/10 border border-amber-500/30 text-amber-600"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">{isCritical ? "\u26A0" : "\u26A0"}</span>
        <span className="truncate">
          {isCritical
            ? `You're almost at your ${usageLabel} limit (${pctDisplay}%). New events may be rejected.`
            : `You've used ${pctDisplay}% of your monthly ${usageLabel}. Upgrade to avoid interruptions.`}
        </span>
      </div>
      <button
        onClick={onSettingsClick}
        className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
          isCritical
            ? "bg-red-500 text-white hover:bg-red-600"
            : "bg-amber-500 text-white hover:bg-amber-600"
        }`}
      >
        Upgrade Plan
      </button>
    </div>
  );
}

// ─── Overview Tab ───

function OverviewTab({
  apiKey,
  agents,
  auditStats,
  onTabChange,
  onRegisterAgent,
}: OverviewTabProps) {
  const [recentEntries, setRecentEntries] = useState<readonly AuditEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [activityError, setActivityError] = useState("");

  // Build agent map from agents prop (immutable)
  const agentMap = useMemo(() => {
    const map: Record<string, Agent> = {};
    for (const a of agents) {
      map[a.id] = a;
    }
    return map;
  }, [agents]);

  // Fetch recent audit entries
  useEffect(() => {
    let cancelled = false;

    async function fetchRecent() {
      try {
        setLoadingActivity(true);
        setActivityError("");
        const data = await apiFetch<{ entries: AuditEntry[] }>(
          "/audit/?limit=10&offset=0",
          apiKey,
        );
        if (!cancelled) {
          setRecentEntries(data.entries ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setActivityError(
            err instanceof Error ? err.message : "Failed to load activity",
          );
        }
      } finally {
        if (!cancelled) setLoadingActivity(false);
      }
    }

    fetchRecent();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Computed stats
  const totalAgents = agents.length;
  const activeCount = useMemo(
    () => agents.filter((a) => a.status === "active").length,
    [agents],
  );
  const inactiveCount = totalAgents - activeCount;
  const totalEvents = auditStats?.total_events ?? 0;
  const allowCount = auditStats?.by_action.allow ?? 0;
  const denyCount = auditStats?.by_action.deny ?? 0;
  const denyRate = auditStats?.deny_rate_pct ?? 0;
  const activeTokens = useMemo(
    () => agents.filter((a) => effectiveStatus(a) === "active").length,
    [agents],
  );

  // Usage percentages for plan limit warnings
  const eventUsagePct = (totalEvents / FREE_PLAN_EVENT_LIMIT) * 100;
  const agentUsagePct = (totalAgents / FREE_PLAN_AGENT_LIMIT) * 100;

  const handleConstellationClick = useCallback(
    (_agentId: string) => {
      onTabChange("agents");
    },
    [onTabChange],
  );

  const handleSettingsClick = useCallback(() => {
    onTabChange("settings");
  }, [onTabChange]);

  return (
    <div>
      {/* Usage Limit Banners */}
      <UsageBanner
        usagePct={eventUsagePct}
        usageLabel="events"
        onSettingsClick={handleSettingsClick}
      />
      <UsageBanner
        usagePct={agentUsagePct}
        usageLabel="agents"
        onSettingsClick={handleSettingsClick}
      />

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground">
          Your agent ecosystem at a glance
        </p>
      </div>

      {/* Pulse bar */}
      <div className="h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full mb-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" />
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {auditStats === null ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Agents"
              value={totalAgents}
              detail={`${activeCount} active, ${inactiveCount} inactive`}
              seed={totalAgents}
            />
            <StatCard
              label="Auth Events (24h)"
              value={totalEvents}
              detail={`${allowCount} allowed, ${denyCount} denied`}
              seed={totalEvents}
            />
            <StatCard
              label="Deny Rate"
              value={Math.round(denyRate)}
              suffix="%"
              detail={`${denyCount} denied of ${totalEvents} total`}
              seed={Math.round(denyRate)}
            />
            <StatCard
              label="Active Tokens"
              value={activeTokens}
              detail="Valid right now"
              seed={activeTokens}
            />
          </>
        )}
      </div>

      {/* Events Chart */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Events (Last 7 Days)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalEvents} total events
          </p>
        </div>
        <EventsChart apiKey={apiKey} />
      </div>

      {/* Two-column grid: Activity + Constellation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Activity Stream */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Activity Stream
            </h3>
            <div className="flex items-center gap-1.5 text-[11px] text-green-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {loadingActivity && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
            {!loadingActivity && activityError && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                <p>Failed to load activity</p>
                <p className="text-xs mt-1">{activityError}</p>
              </div>
            )}
            {!loadingActivity &&
              !activityError &&
              recentEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <span className="text-2xl mb-1">{"\uD83D\uDCCB"}</span>
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            {!loadingActivity &&
              !activityError &&
              recentEntries.length > 0 && (
                <div className="p-1">
                  {recentEntries.map((entry, i) => (
                    <ActivityItem
                      key={entry.id}
                      entry={entry}
                      agentMap={agentMap}
                      index={i}
                    />
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Agent Constellation */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Agent Constellation
            </h3>
          </div>
          <AgentConstellation
            agents={agents}
            onAgentClick={handleConstellationClick}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => onRegisterAgent ? onRegisterAgent() : onTabChange("agents")}
          className="px-4 py-2.5 bg-gradient-to-br from-primary to-amber-600 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Register Agent
        </button>
        <button
          onClick={() => onTabChange("audit")}
          className="px-4 py-2.5 bg-card border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-primary/5 transition-colors"
        >
          View Audit Feed
        </button>
        <button
          onClick={() => onTabChange("settings")}
          className="px-4 py-2.5 bg-card border border-border text-foreground text-xs font-semibold rounded-lg hover:bg-primary/5 transition-colors"
        >
          Manage Settings
        </button>
      </div>
    </div>
  );
}

export { OverviewTab };
