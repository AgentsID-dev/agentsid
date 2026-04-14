// ─── Dashboard Sidebar ───

import { AgentsIDLogo } from "@/components/blocks/logo";
import type { SidebarTab, ProjectInfo } from "./types";

interface SidebarProps {
  readonly activeTab: SidebarTab;
  readonly onTabChange: (tab: SidebarTab) => void;
  readonly agentCount: number;
  readonly projectInfo: ProjectInfo | null;
  readonly onLogout: () => void;
  readonly mobileOpen: boolean;
  readonly onMobileClose: () => void;
}

const NAV_ITEMS: readonly { readonly tab: SidebarTab; readonly icon: string; readonly label: string }[] = [
  { tab: "overview", icon: "\u25C9", label: "Command Center" },
  { tab: "agents", icon: "\u25C8", label: "Agents" },
  { tab: "policies", icon: "\u26A1", label: "Policies" },
  { tab: "audit", icon: "\u2630", label: "Audit Feed" },
  { tab: "team", icon: "\u2660", label: "Team" },
  { tab: "settings", icon: "\u2699", label: "Settings" },
];

function Sidebar({
  activeTab,
  onTabChange,
  agentCount,
  projectInfo,
  onLogout,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const handleTabClick = (tab: SidebarTab) => {
    onTabChange(tab);
    onMobileClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[99] md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`w-60 bg-card border-r border-border flex flex-col shrink-0 fixed top-0 left-0 bottom-0 z-[100] transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex items-center gap-2.5">
          <AgentsIDLogo className="w-7 h-7 shrink-0" />
          <div className="text-[17px] font-bold tracking-tight bg-gradient-to-br from-primary to-amber-600 bg-clip-text text-transparent">
            AgentsID
            <span className="block text-muted-foreground text-[11px] font-normal tracking-wider uppercase bg-none [-webkit-text-fill-color:initial]">
              Command Center
            </span>
          </div>
        </div>

        {/* Project info */}
        {projectInfo && (
          <div className="mx-2 mt-2 px-3.5 py-2.5 bg-primary/5 border border-border rounded-lg text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground text-xs">
                {projectInfo.name}
              </span>
              <span className="inline-block px-1.5 py-px rounded-md text-[9px] font-semibold uppercase bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary border border-primary/20 ml-1">
                {projectInfo.plan}
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground/70 break-all">
              {projectInfo.id}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 flex flex-col gap-1 mt-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium w-full text-left border border-transparent transition-all overflow-hidden
                ${
                  activeTab === item.tab
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                }`}
            >
              {/* Active indicator bar */}
              <span
                className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-primary to-amber-600 rounded-r-sm transition-opacity ${
                  activeTab === item.tab ? "opacity-100" : "opacity-0"
                }`}
              />
              <span className="text-base w-5 text-center shrink-0">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {item.tab === "agents" && (
                <span className="ml-auto bg-gradient-to-br from-primary/10 to-blue-500/10 text-blue-500 px-2 py-0.5 rounded-xl text-[11px] font-semibold border border-blue-500/20">
                  {agentCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom links */}
        <div className="px-2 pt-2 border-t border-border mt-auto flex flex-col gap-0.5">
          <a
            href="/docs"
            className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-muted-foreground text-[13px] font-medium no-underline hover:bg-primary/5 transition-colors"
          >
            <span className="text-sm w-5 text-center">{"\uD83D\uDCC4"}</span>
            Docs
          </a>
          <a
            href="/guides"
            className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-muted-foreground text-[13px] font-medium no-underline hover:bg-primary/5 transition-colors"
          >
            <span className="text-sm w-5 text-center">{"\uD83D\uDCDA"}</span>
            Guides
          </a>
          <a
            href="https://github.com/AgentsID-dev/agentsid"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3.5 py-2 rounded-lg text-muted-foreground text-[13px] font-medium no-underline hover:bg-primary/5 transition-colors"
          >
            <span className="text-sm w-5 text-center">{"\u2605"}</span>
            GitHub
          </a>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full py-2 border border-destructive/20 rounded-lg text-muted-foreground text-xs hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition-all flex items-center justify-center gap-1.5"
          >
            {"\u21A9"} Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export { Sidebar };
