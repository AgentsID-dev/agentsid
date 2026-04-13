// ─── Dashboard Types ───

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly status: "active" | "revoked" | "expired";
  readonly created_at: string;
  readonly created_by: string;
  readonly expires_at: string | null;
  readonly project_id: string;
  readonly permissions?: readonly string[];
  readonly agent_type?: string | null;
  readonly parent_agent_id?: string | null;
}

export interface LineageNode {
  readonly id: string;
  readonly name: string;
  readonly agent_type: string | null;
  readonly parent_agent_id: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly children: readonly LineageNode[];
}

export interface AuditEntry {
  readonly id: number;
  readonly agent_id: string;
  readonly tool: string;
  readonly action: "allow" | "deny";
  readonly result: "success" | "blocked" | "error";
  readonly created_at: string;
  readonly error_message?: string;
  readonly delegated_by?: string;
  readonly delegation_chain?: readonly DelegationLink[];
  readonly params?: Record<string, unknown>;
}

export interface DelegationLink {
  readonly type: string;
  readonly id: string;
}

export interface AuditStats {
  readonly total_events: number;
  readonly deny_rate_pct: number;
  readonly by_action: {
    readonly allow: number;
    readonly deny: number;
  };
  readonly by_tool?: Record<string, number>;
}

export interface ProjectInfo {
  readonly id: string;
  readonly name: string;
  readonly plan: string;
  readonly created_at: string;
}

export interface PermissionSchedule {
  readonly hours_start?: number;
  readonly hours_end?: number;
  readonly timezone?: string;
  readonly days?: readonly string[];
}

export interface PermissionRateLimit {
  readonly max?: number;
  readonly per?: string;
}

export interface PermissionIpAllowlist {
  readonly cidrs?: readonly string[];
  readonly ips?: readonly string[];
}

export interface PermissionBudget {
  readonly max?: number;
  readonly unit?: string;
  readonly per?: string;
}

export interface PermissionCooldown {
  readonly seconds?: number;
}

export interface PermissionSequenceRequirements {
  readonly requires_prior?: readonly string[];
  readonly within_seconds?: number;
}

export interface PermissionSessionLimits {
  readonly max_duration_minutes?: number;
  readonly max_idle_minutes?: number;
  readonly max_calls?: number;
}

export interface PermissionRule {
  readonly id?: string;
  readonly tool_pattern: string;
  readonly action: "allow" | "deny";
  readonly conditions?: Record<string, unknown>;
  readonly priority?: number;
  readonly schedule?: PermissionSchedule;
  readonly rate_limit?: PermissionRateLimit;
  readonly data_level?: readonly string[];
  readonly requires_approval?: boolean;
  readonly ip_allowlist?: PermissionIpAllowlist;
  readonly max_chain_depth?: number;
  readonly budget?: PermissionBudget;
  readonly cooldown?: PermissionCooldown;
  readonly sequence_requirements?: PermissionSequenceRequirements;
  readonly session_limits?: PermissionSessionLimits;
  readonly risk_score_threshold?: number;
}

export interface Personality {
  readonly emoji: string;
  readonly label: string;
  readonly desc: string;
}

export type AuthTab = "signin" | "signup" | "apikey";

export type SidebarTab = "overview" | "agents" | "policies" | "audit" | "team" | "settings";

export interface TeamMember {
  readonly email: string;
  readonly role: "owner" | "admin" | "member" | "viewer";
  readonly invited_at: string;
  readonly joined_at: string | null;
}

export interface TeamInfo {
  readonly id: string;
  readonly name: string;
  readonly owner_email: string;
  readonly created_at: string;
  readonly members: readonly TeamMember[];
}
