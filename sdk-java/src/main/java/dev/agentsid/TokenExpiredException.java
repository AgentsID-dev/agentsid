package dev.agentsid;

/**
 * Thrown when an agent token has expired (HTTP 401).
 */
public class TokenExpiredException extends AgentsIDException {

    /**
     * Create a token expired exception.
     */
    public TokenExpiredException() {
        super("Agent token has expired", "TOKEN_EXPIRED", 401);
    }
}
