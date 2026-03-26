/**
 * @agentsid/sdk — Identity and auth for AI agents
 *
 * Quick start:
 *
 *   import { AgentsID } from '@agentsid/sdk';
 *
 *   const aid = new AgentsID({ projectKey: 'aid_proj_...' });
 *
 *   // Register an agent
 *   const { agent, token } = await aid.registerAgent({
 *     name: 'research-bot',
 *     onBehalfOf: 'user_123',
 *     permissions: ['search_memories', 'save_memory'],
 *   });
 *
 *   // Validate a token + check permission (used by MCP middleware)
 *   const result = await aid.validateToken(token, 'search_memories');
 *   // → { valid: true, permission: { allowed: true, ... } }
 *
 *   // MCP middleware
 *   import { createHttpMiddleware } from '@agentsid/sdk';
 *   const middleware = createHttpMiddleware({ projectKey: 'aid_proj_...' });
 *   const auth = await middleware.validate(bearerToken, 'save_memory', params);
 */

// Main client
export { AgentsID } from "./client.js";

// MCP middleware
export { createHttpMiddleware, extractBearerToken, validateToolCall } from "./middleware.js";

// Errors
export {
  AgentsIDError,
  AuthenticationError,
  PermissionDeniedError,
  TokenExpiredError,
  TokenRevokedError,
  AgentNotFoundError,
} from "./errors.js";

// Types
export type {
  AgentsIDConfig,
  RegisterAgentOptions,
  AgentIdentity,
  RegisterAgentResult,
  PermissionRule,
  PermissionCheck,
  ValidateResult,
  AuditEntry,
  AuditQueryOptions,
  AuditQueryResult,
  ListAgentsOptions,
  AgentsIDContext,
} from "./types.js";

export type { MiddlewareConfig } from "./middleware.js";
