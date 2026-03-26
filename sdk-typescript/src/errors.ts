/**
 * AgentsID error classes
 */

export class AgentsIDError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AgentsIDError";
  }
}

export class AuthenticationError extends AgentsIDError {
  constructor(message: string = "Invalid or missing API key") {
    super(message, "AUTH_ERROR", 401);
    this.name = "AuthenticationError";
  }
}

export class PermissionDeniedError extends AgentsIDError {
  constructor(
    public readonly tool: string,
    public readonly reason: string,
  ) {
    super(`Permission denied for tool "${tool}": ${reason}`, "PERMISSION_DENIED", 403);
    this.name = "PermissionDeniedError";
  }
}

export class TokenExpiredError extends AgentsIDError {
  constructor() {
    super("Agent token has expired", "TOKEN_EXPIRED", 401);
    this.name = "TokenExpiredError";
  }
}

export class TokenRevokedError extends AgentsIDError {
  constructor() {
    super("Agent token has been revoked", "TOKEN_REVOKED", 401);
    this.name = "TokenRevokedError";
  }
}

export class AgentNotFoundError extends AgentsIDError {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`, "AGENT_NOT_FOUND", 404);
    this.name = "AgentNotFoundError";
  }
}
