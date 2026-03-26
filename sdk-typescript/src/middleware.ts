/**
 * AgentsID MCP Middleware
 *
 * Drop-in middleware for any MCP server. Validates agent tokens,
 * checks per-tool permissions, and logs every action to the audit trail.
 *
 * Usage:
 *   import { AgentsID } from '@agentsid/sdk';
 *   const aid = new AgentsID({ projectKey: 'aid_proj_...' });
 *
 *   // Option 1: ASGI wrapper for HTTP MCP servers
 *   const wrappedApp = aid.wrapMcpApp(mcpApp);
 *
 *   // Option 2: Manual validation in tool handlers
 *   server.tool('save_memory', async (params, context) => {
 *     const auth = await aid.validateToolCall(context, 'save_memory', params);
 *     if (!auth.allowed) throw new Error(auth.reason);
 *     // ... tool logic
 *   });
 */

import { PermissionDeniedError, TokenExpiredError, TokenRevokedError } from "./errors.js";
import type { AgentsIDConfig, ValidateResult } from "./types.js";

const DEFAULT_BASE_URL = "https://agentsid.dev";

export interface MiddlewareConfig {
  /** Project API key */
  projectKey: string;
  /** AgentsID server URL */
  baseUrl?: string;
  /** Called when a tool call is denied (default: throw PermissionDeniedError) */
  onDenied?: (tool: string, reason: string) => void;
  /** Called on every tool call for logging/telemetry */
  onToolCall?: (tool: string, agentId: string, allowed: boolean) => void;
  /** Skip validation for these tools */
  skipTools?: string[];
}

/**
 * Validate a tool call against AgentsID.
 *
 * This is the function MCP middleware calls on every tool invocation.
 * It extracts the bearer token from the request, validates it,
 * checks permissions for the specific tool, and returns the result.
 */
export async function validateToolCall(
  config: MiddlewareConfig,
  token: string,
  tool: string,
  params?: Record<string, unknown>,
): Promise<ValidateResult> {
  // Skip validation for whitelisted tools
  if (config.skipTools?.includes(tool)) {
    return {
      valid: true,
      reason: "Tool in skip list",
    };
  }

  const baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = `${baseUrl}/api/v1/validate`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, tool, params }),
  });

  if (!response.ok) {
    return {
      valid: false,
      reason: `AgentsID validation failed: ${response.status}`,
    };
  }

  const result = await response.json();

  // Notify callbacks
  if (config.onToolCall) {
    config.onToolCall(tool, result.agent_id || "unknown", result.permission?.allowed ?? false);
  }

  // Map to SDK types
  const mapped: ValidateResult = {
    valid: result.valid,
    reason: result.reason,
    agentId: result.agent_id,
    projectId: result.project_id,
    delegatedBy: result.delegated_by,
    expiresAt: result.expires_at,
    permission: result.permission
      ? {
          allowed: result.permission.allowed,
          reason: result.permission.reason,
          matchedRule: result.permission.matched_rule
            ? {
                toolPattern: result.permission.matched_rule.tool_pattern,
                action: result.permission.matched_rule.action,
              }
            : null,
        }
      : undefined,
  };

  return mapped;
}

/**
 * Create an ASGI/HTTP middleware wrapper that intercepts MCP requests,
 * extracts the bearer token, validates it, and blocks unauthorized calls.
 *
 * For use with streamable HTTP MCP servers.
 */
export function createHttpMiddleware(config: MiddlewareConfig) {
  return {
    /**
     * Validate an incoming MCP tool call request.
     *
     * Call this at the start of every tool handler:
     *
     *   const auth = await middleware.validate(bearerToken, toolName, params);
     *   if (!auth.valid || !auth.permission?.allowed) {
     *     throw new Error('Unauthorized');
     *   }
     */
    async validate(
      bearerToken: string,
      tool: string,
      params?: Record<string, unknown>,
    ): Promise<ValidateResult> {
      const result = await validateToolCall(config, bearerToken, tool, params);

      if (!result.valid) {
        if (result.reason?.includes("expired")) throw new TokenExpiredError();
        if (result.reason?.includes("revoked")) throw new TokenRevokedError();
      }

      if (result.permission && !result.permission.allowed) {
        if (config.onDenied) {
          config.onDenied(tool, result.permission.reason);
        } else {
          throw new PermissionDeniedError(tool, result.permission.reason);
        }
      }

      return result;
    },

    /**
     * Quick check — returns true/false without throwing.
     */
    async isAllowed(bearerToken: string, tool: string): Promise<boolean> {
      try {
        const result = await validateToolCall(config, bearerToken, tool);
        return result.valid && (result.permission?.allowed ?? false);
      } catch {
        return false;
      }
    },
  };
}

/**
 * Extract bearer token from HTTP Authorization header.
 * Works with standard MCP HTTP transport.
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
