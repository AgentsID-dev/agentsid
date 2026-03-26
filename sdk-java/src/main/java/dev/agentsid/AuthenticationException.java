package dev.agentsid;

/**
 * Thrown when the API key is invalid or missing (HTTP 401).
 */
public class AuthenticationException extends AgentsIDException {

    /**
     * Create an authentication exception with the default message.
     */
    public AuthenticationException() {
        this("Invalid or missing API key");
    }

    /**
     * Create an authentication exception with a custom message.
     *
     * @param message error description
     */
    public AuthenticationException(String message) {
        super(message, "AUTH_ERROR", 401);
    }
}
