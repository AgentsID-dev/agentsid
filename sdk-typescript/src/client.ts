/**
 * AgentsID — main SDK client
 *
 * Usage:
 *   const aid = new AgentsID({ projectKey: 'aid_proj_...' });
 *   const agent = await aid.registerAgent({ name: 'bot', onBehalfOf: 'user_123' });
 *   const check = await aid.checkPermission(agent.agent.id, 'save_memory');
 */

import { AgentsIDError, AuthenticationError } from "./errors.js";
import type {
  AgentIdentity,
  AgentsIDConfig,
  AuditQueryOptions,
  AuditQueryResult,
  ListAgentsOptions,
  PermissionCheck,
  PermissionRule,
  RegisterAgentOptions,
  RegisterAgentResult,
  ValidateResult,
} from "./types.js";

const DEFAULT_BASE_URL = "https://agentsid.dev";
const DEFAULT_TIMEOUT = 10_000;

export class AgentsID {
  private readonly projectKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: AgentsIDConfig) {
    if (!config.projectKey) {
      throw new AgentsIDError("projectKey is required", "CONFIG_ERROR");
    }
    this.projectKey = config.projectKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  // ═══════════════════════════════════════════
  // AGENTS
  // ═══════════════════════════════════════════

  /** Register a new agent identity and issue a token. */
  async registerAgent(options: RegisterAgentOptions): Promise<RegisterAgentResult> {
    const body = {
      name: options.name,
      on_behalf_of: options.onBehalfOf,
      permissions: options.permissions,
      ttl_hours: options.ttlHours,
      metadata: options.metadata,
    };
    const data = await this.request("POST", "/agents/", body);
    return {
      agent: this.mapAgent(data.agent),
      token: data.token,
      tokenId: data.token_id,
      expiresAt: data.expires_at,
    };
  }

  /** Get agent details by ID. */
  async getAgent(agentId: string): Promise<AgentIdentity> {
    const data = await this.request("GET", `/agents/${agentId}`);
    return this.mapAgent(data);
  }

  /** List all agents in the project. */
  async listAgents(options?: ListAgentsOptions): Promise<AgentIdentity[]> {
    const params = new URLSearchParams();
    if (options?.status && options.status !== "all") params.set("status", options.status);
    if (options?.limit) params.set("limit", String(options.limit));
    const qs = params.toString();
    const data = await this.request("GET", `/agents/${qs ? `?${qs}` : ""}`);
    return (data as unknown[]).map((a: any) => this.mapAgent(a));
  }

  /** Revoke an agent — all tokens immediately invalidated. */
  async revokeAgent(agentId: string): Promise<void> {
    await this.request("DELETE", `/agents/${agentId}`);
  }

  // ═══════════════════════════════════════════
  // PERMISSIONS
  // ═══════════════════════════════════════════

  /** Set permission rules for an agent (replaces existing rules). */
  async setPermissions(agentId: string, rules: PermissionRule[]): Promise<void> {
    const body = rules.map((r) => ({
      tool_pattern: r.toolPattern,
      action: r.action,
      conditions: r.conditions,
      priority: r.priority ?? 0,
    }));
    await this.request("PUT", `/agents/${agentId}/permissions`, body);
  }

  /** Get permission rules for an agent. */
  async getPermissions(agentId: string): Promise<PermissionRule[]> {
    const data = await this.request("GET", `/agents/${agentId}/permissions`);
    return (data.rules || []).map((r: any) => ({
      toolPattern: r.tool_pattern,
      action: r.action,
      conditions: r.conditions,
      priority: r.priority,
    }));
  }

  /** Check if an agent is allowed to call a specific tool. */
  async checkPermission(
    agentId: string,
    tool: string,
    params?: Record<string, unknown>,
  ): Promise<PermissionCheck> {
    const data = await this.request("POST", "/check", {
      agent_id: agentId,
      tool,
      params,
    });
    return {
      allowed: data.allowed,
      reason: data.reason,
      matchedRule: data.matched_rule
        ? { toolPattern: data.matched_rule.tool_pattern, action: data.matched_rule.action }
        : null,
    };
  }

  // ═══════════════════════════════════════════
  // TOKEN VALIDATION
  // ═══════════════════════════════════════════

  /** Validate an agent token. Optionally check permission for a tool. */
  async validateToken(token: string, tool?: string, params?: Record<string, unknown>): Promise<ValidateResult> {
    const data = await this.request("POST", "/validate", { token, tool, params });
    return {
      valid: data.valid,
      reason: data.reason,
      agentId: data.agent_id,
      projectId: data.project_id,
      delegatedBy: data.delegated_by,
      expiresAt: data.expires_at,
      permission: data.permission
        ? {
            allowed: data.permission.allowed,
            reason: data.permission.reason,
            matchedRule: data.permission.matched_rule
              ? { toolPattern: data.permission.matched_rule.tool_pattern, action: data.permission.matched_rule.action }
              : null,
          }
        : undefined,
    };
  }

  // ═══════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════

  /** Query the audit log. */
  async getAuditLog(options?: AuditQueryOptions): Promise<AuditQueryResult> {
    const params = new URLSearchParams();
    if (options?.agentId) params.set("agent_id", options.agentId);
    if (options?.tool) params.set("tool", options.tool);
    if (options?.action) params.set("action", options.action);
    if (options?.since) params.set("since", options.since);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    const data = await this.request("GET", `/audit/${qs ? `?${qs}` : ""}`);
    return {
      entries: (data.entries || []).map((e: any) => ({
        id: e.id,
        agentId: e.agent_id,
        delegatedBy: e.delegated_by,
        tool: e.tool,
        action: e.action,
        params: e.params,
        result: e.result,
        delegationChain: e.delegation_chain,
        errorMessage: e.error_message,
        createdAt: e.created_at,
      })),
      total: data.total,
      limit: data.limit,
      offset: data.offset,
    };
  }

  // ═══════════════════════════════════════════
  // HTTP CLIENT
  // ═══════════════════════════════════════════

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.projectKey}`,
      "Content-Type": "application/json",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new AuthenticationError();
      }

      if (response.status === 204) {
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new AgentsIDError(
          data.detail || `Request failed: ${response.status}`,
          "API_ERROR",
          response.status,
        );
      }

      return data;
    } catch (err) {
      if (err instanceof AgentsIDError) throw err;
      if ((err as Error).name === "AbortError") {
        throw new AgentsIDError("Request timed out", "TIMEOUT");
      }
      throw new AgentsIDError(`Network error: ${(err as Error).message}`, "NETWORK_ERROR");
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private mapAgent(data: any): AgentIdentity {
    return {
      id: data.id,
      name: data.name,
      status: data.status,
      createdBy: data.created_by,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      metadata: data.metadata,
      revokedAt: data.revoked_at,
    };
  }
}
