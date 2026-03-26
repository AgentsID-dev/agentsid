package dev.agentsid;

/**
 * Base exception for all AgentsID errors.
 *
 * <p>Contains an error code and optional HTTP status code for
 * programmatic error handling.</p>
 */
public class AgentsIDException extends Exception {

    private final String code;
    private final Integer statusCode;

    /**
     * Create a new AgentsID exception.
     *
     * @param message    human-readable error description
     * @param code       machine-readable error code (e.g. "API_ERROR")
     * @param statusCode HTTP status code, or {@code null} if not applicable
     */
    public AgentsIDException(String message, String code, Integer statusCode) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
    }

    /**
     * Create a new AgentsID exception without an HTTP status code.
     *
     * @param message human-readable error description
     * @param code    machine-readable error code
     */
    public AgentsIDException(String message, String code) {
        this(message, code, null);
    }

    /** @return machine-readable error code */
    public String getCode() {
        return code;
    }

    /** @return HTTP status code, or {@code null} if not applicable */
    public Integer getStatusCode() {
        return statusCode;
    }
}
