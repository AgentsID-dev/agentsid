/**
 * AgentsID SDK Types
 */

export interface AgentsIDConfig {
  /** Project API key (aid_proj_...) */
  projectKey: string;
  /** AgentsID server URL (default: https://agentsid.dev) */
  baseUrl?: string;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
}

export interface RegisterAgentOptions {
  /** Human-readable agent name */
  name: string;
  /** User ID of the human authorizing this agent */
  onBehalfOf: string;
  /** Tool patterns this agent can call (default: none — must be explicit) */
  permissions?: string[];
  /** Token lifetime in hours (default: 24, max: 720) */
  ttlHours?: number;
  /** Custom metadata key-value pairs */
  metadata?: Record<string, unknown>;
}

export interface AgentIdentity {
  id: string;
  name: string;
  status: "active" | "revoked" | "expired";
  createdBy: string;
  expiresAt: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  revokedAt?: string;
}

export interface RegisterAgentResult {
  agent: AgentIdentity;
  /** Bearer token for this agent (shown once) */
  token: string;
  tokenId: string;
  expiresAt: string;
}

export interface PermissionRule {
  /** Tool name or pattern (supports * wildcards) */
  toolPattern: string;
  /** allow or deny */
  action: "allow" | "deny";
  /** Parameter constraints (AND logic) */
  conditions?: Record<string, unknown>;
  /** Higher priority = evaluated first */
  priority?: number;
}

export interface PermissionCheck {
  allowed: boolean;
  reason: string;
  matchedRule: { toolPattern: string; action: string } | null;
}

export interface ValidateResult {
  valid: boolean;
  reason?: string;
  agentId?: string;
  projectId?: string;
  delegatedBy?: string;
  expiresAt?: number;
  permission?: PermissionCheck;
}

export interface AuditEntry {
  id: number;
  agentId: string;
  delegatedBy: string | null;
  tool: string;
  action: string;
  params: Record<string, unknown> | null;
  result: string;
  delegationChain: unknown[] | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AuditQueryOptions {
  agentId?: string;
  tool?: string;
  action?: string;
  since?: string;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  entries: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export interface ListAgentsOptions {
  status?: "active" | "revoked" | "expired" | "all";
  limit?: number;
}

/**
 * MCP middleware context — injected into tool call context
 */
export interface AgentsIDContext {
  agentId: string;
  projectId: string;
  delegatedBy: string;
  permissions: PermissionCheck;
}
