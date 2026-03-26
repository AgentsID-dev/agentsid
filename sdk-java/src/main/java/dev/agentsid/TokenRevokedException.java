package dev.agentsid;

/**
 * Thrown when an agent token has been revoked (HTTP 401).
 */
public class TokenRevokedException extends AgentsIDException {

    /**
     * Create a token revoked exception.
     */
    public TokenRevokedException() {
        super("Agent token has been revoked", "TOKEN_REVOKED", 401);
    }
}
