// ─── Dashboard Page (Orchestrator) ───
// Main dashboard that wires together auth, sidebar, and content tabs

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Agent, AuditStats, ProjectInfo, SidebarTab } from "../components/dashboard/types";
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  apiFetch,
} from "../components/dashboard/utils";
import { AuthPanel } from "../components/dashboard/AuthPanel";
import { Sidebar } from "../components/dashboard/Sidebar";
import { OverviewTab } from "../components/dashboard/OverviewTab";
import { AgentCards } from "../components/dashboard/AgentCards";
import { AuditFeed } from "../components/dashboard/AuditFeed";
import { SettingsTab } from "../components/dashboard/SettingsTab";
import { OnboardingWizard } from "../components/dashboard/OnboardingWizard";
import { RegisterAgentModal } from "../components/dashboard/RegisterAgentModal";
import { DashboardSkeleton } from "../components/dashboard/Skeletons";

// ─── Auth Config ───

interface AuthConfig {
  readonly supabase_url?: string;
  readonly supabase_anon_key?: string;
  readonly posthog_key?: string;
}

// ─── Constants ───

const REFRESH_INTERVAL_MS = 30_000;

// ─── Dashboard Component ───

function Dashboard() {
  // ─── Core State ───
  const [apiKey, setApiKey] = useState(() => getStoredApiKey());
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // ─── Data State ───
  const [agents, setAgents] = useState<readonly Agent[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  // ─── Loading / Error ───
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ─── Refs for intervals ───
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Derived State ───
  const agentMap = useMemo(() => {
    const map: Record<string, Agent> = {};
    for (const a of agents) {
      map[a.id] = a;
    }
    return map;
  }, [agents]);

  // ─── Fetch Auth Config (runs once on mount) ───
  useEffect(() => {
    let cancelled = false;
    async function fetchAuthConfig() {
      try {
        const resp = await fetch("/api/v1/auth/config");
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setAuthConfig(data);
        }
      } catch {
        // Auth config is optional, silently ignore
      }
    }
    fetchAuthConfig();
    return () => { cancelled = true; };
  }, []);

  // ─── Validate stored API key on mount ───
  useEffect(() => {
    if (!apiKey) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;
    async function validate() {
      try {
        await apiFetch<readonly Agent[]>("/agents/?limit=1", apiKey);
        if (!cancelled) setAuthenticated(true);
      } catch {
        // Key failed validation — show auth panel but DON'T clear the key.
        // If user signs in via Supabase, the AuthPanel will re-validate or fetch a new key.
        if (!cancelled) setAuthenticated(false);
      }
    }
    validate().finally(() => {
      if (!cancelled) setInitialLoading(false);
    });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Load Dashboard Data (when authenticated) ───
  const loadDashboardData = useCallback(async () => {
    if (!apiKey) return;

    try {
      setLoadError("");
      const [agentsData, statsData] = await Promise.all([
        apiFetch<readonly Agent[]>("/agents/?limit=200", apiKey),
        apiFetch<AuditStats>("/audit/stats?days=1", apiKey).catch(() => null),
      ]);

      setAgents(agentsData ?? []);
      if (statsData) setAuditStats(statsData);

      // Derive project info from first agent if available
      if (agentsData && agentsData.length > 0) {
        const first = agentsData[0];
        setProjectInfo((prev) =>
          prev ?? {
            id: first.project_id,
            name: "Project",
            plan: "free",
            created_at: first.created_at,
          },
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
      setLoadError(msg);

      if (msg === "Unauthorized") {
        clearStoredApiKey();
        setApiKey("");
        setAuthenticated(false);
      }
    }
  }, [apiKey]);

  // ─── Initial data load after authentication ───
  useEffect(() => {
    if (authenticated) {
      loadDashboardData();
    }
  }, [authenticated, loadDashboardData]);

  // ─── Auto-refresh every 30s ───
  useEffect(() => {
    if (!authenticated) return;

    refreshTimerRef.current = setInterval(() => {
      loadDashboardData();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current !== null) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [authenticated, loadDashboardData]);

  // ─── Auth callback ───
  const handleAuthenticated = useCallback((key: string) => {
    setStoredApiKey(key);
    setApiKey(key);
    setAuthenticated(true);
    setInitialLoading(false);
  }, []);

  // ─── Logout ───
  const handleLogout = useCallback(() => {
    // Stop refresh
    if (refreshTimerRef.current !== null) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Keep the API key in localStorage — it's permanent.
    // Sign out just resets the UI session, not the key.
    setAuthenticated(false);
    setAgents([]);
    setAuditStats(null);
    setProjectInfo(null);
    setActiveTab("overview");
    setMobileSidebarOpen(false);
  }, []);

  // ─── Tab change ───
  const handleTabChange = useCallback((tab: SidebarTab) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  }, []);

  // ─── Mobile sidebar ───
  const handleMobileToggle = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const handleOpenRegisterModal = useCallback(() => {
    setRegisterModalOpen(true);
  }, []);

  const handleCloseRegisterModal = useCallback(() => {
    setRegisterModalOpen(false);
  }, []);

  // ─── Agents changed (refresh) ───
  const handleAgentsChanged = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ─── Initial loading state ───
  if (initialLoading) {
    return <DashboardSkeleton />;
  }

  // ─── Not authenticated → Auth Panel ───
  if (!authenticated) {
    return (
      <AuthPanel
        authConfig={authConfig}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  // ─── Authenticated with 0 agents → Onboarding ───
  if (agents.length === 0 && !loadError) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          agentCount={0}
          projectInfo={projectInfo}
          onLogout={handleLogout}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={handleMobileClose}
        />
        <main className="flex-1 md:ml-60 min-h-screen">
          {/* Mobile hamburger */}
          <MobileHeader onToggle={handleMobileToggle} />
          <div className="p-4 md:px-8 md:py-4 max-w-[1400px] mx-auto">
            <OnboardingWizard apiKey={apiKey} />
          </div>
        </main>
      </div>
    );
  }

  // ─── Full Dashboard ───
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        agentCount={agents.length}
        projectInfo={projectInfo}
        onLogout={handleLogout}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={handleMobileClose}
      />

      <main className="flex-1 md:ml-60 min-h-screen">
        {/* Mobile hamburger */}
        <MobileHeader onToggle={handleMobileToggle} />

        {/* Error banner */}
        {loadError && (
          <div className="mx-4 mt-4 md:mx-8 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-red-500">{loadError}</span>
            <button
              onClick={loadDashboardData}
              className="text-xs text-red-500 underline hover:no-underline ml-4"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="p-4 md:px-8 md:py-4 max-w-[1400px] mx-auto">
          {activeTab === "overview" && (
            <OverviewTab
              apiKey={apiKey}
              agents={agents}
              auditStats={auditStats}
              onTabChange={handleTabChange}
              onRegisterAgent={handleOpenRegisterModal}
            />
          )}
          {activeTab === "agents" && (
            <AgentCards
              agents={agents}
              apiKey={apiKey}
              agentMap={agentMap}
              onAgentsChanged={handleAgentsChanged}
              projectInfo={projectInfo}
              auditStats={auditStats}
            />
          )}
          {activeTab === "audit" && (
            <AuditFeed
              apiKey={apiKey}
              agents={agents}
              agentMap={agentMap}
              auditStats={auditStats}
              isActive={activeTab === "audit"}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              apiKey={apiKey}
              projectInfo={projectInfo}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-6 px-4 mt-12 border-t border-border text-[11px] text-muted-foreground">
          <a href="/docs" className="text-muted-foreground hover:text-foreground mx-1.5">
            Docs
          </a>
          {" \u00B7 "}
          <a href="/guides" className="text-muted-foreground hover:text-foreground mx-1.5">
            Guides
          </a>
          {" \u00B7 "}
          <a href="/dashboard" className="text-muted-foreground hover:text-foreground mx-1.5">
            Dashboard
          </a>
          {" \u00B7 "}
          <a
            href="https://github.com/stevenkozeniesky02/agentsid"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground mx-1.5"
          >
            GitHub
          </a>
          {" \u00B7 "}
          <a href="/terms" className="text-muted-foreground hover:text-foreground mx-1.5">
            Terms
          </a>
          {" \u00B7 "}
          <a href="/privacy" className="text-muted-foreground hover:text-foreground mx-1.5">
            Privacy
          </a>
          <div className="mt-1.5">{"\u00A9"} 2026 AgentsID</div>
        </footer>
      </main>

      {/* Register Agent Modal (accessible from Overview + Agents tabs) */}
      <RegisterAgentModal
        open={registerModalOpen}
        apiKey={apiKey}
        onClose={handleCloseRegisterModal}
        onSuccess={handleAgentsChanged}
      />
    </div>
  );
}

// ─── Mobile Header ───

interface MobileHeaderProps {
  readonly onToggle: () => void;
}

function MobileHeader({ onToggle }: MobileHeaderProps) {
  return (
    <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
      <button
        onClick={onToggle}
        className="w-8 h-8 flex flex-col items-center justify-center gap-1 rounded-lg hover:bg-primary/5 transition-colors"
        aria-label="Toggle sidebar"
      >
        <span className="block w-4 h-0.5 bg-foreground rounded" />
        <span className="block w-4 h-0.5 bg-foreground rounded" />
        <span className="block w-4 h-0.5 bg-foreground rounded" />
      </button>
      <span className="text-sm font-bold bg-gradient-to-br from-primary to-blue-500 bg-clip-text text-transparent">
        AgentsID
      </span>
    </div>
  );
}

export { Dashboard };
