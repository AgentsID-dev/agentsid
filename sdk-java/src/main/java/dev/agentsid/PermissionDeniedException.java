package dev.agentsid;

/**
 * Thrown when an agent lacks permission for a tool call (HTTP 403).
 */
public class PermissionDeniedException extends AgentsIDException {

    private final String tool;
    private final String reason;

    /**
     * Create a permission denied exception.
     *
     * @param tool   the tool that was denied
     * @param reason explanation of why permission was denied
     */
    public PermissionDeniedException(String tool, String reason) {
        super("Permission denied for tool \"" + tool + "\": " + reason, "PERMISSION_DENIED", 403);
        this.tool = tool;
        this.reason = reason;
    }

    /** @return the tool name that was denied */
    public String getTool() {
        return tool;
    }

    /** @return the denial reason */
    public String getReason() {
        return reason;
    }
}
