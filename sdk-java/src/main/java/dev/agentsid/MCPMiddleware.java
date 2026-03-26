package dev.agentsid;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.BiConsumer;

import org.json.JSONObject;

/**
 * MCP middleware for validating agent tool calls against AgentsID.
 *
 * <p>Drop-in middleware for Java MCP servers. Validates agent tokens,
 * checks per-tool permissions, and blocks unauthorized calls.</p>
 *
 * <p>Usage:</p>
 * <pre>{@code
 * MCPMiddleware middleware = MCPMiddleware.builder("aid_proj_...")
 *     .skipTools(List.of("ping", "health"))
 *     .build();
 *
 * // In your MCP tool handler:
 * JSONObject auth = middleware.validate(bearerToken, "my_tool", params);
 * }</pre>
 */
public final class MCPMiddleware {

    private static final String DEFAULT_BASE_URL = "https://agentsid.dev";
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);

    private final String projectKey;
    private final String baseUrl;
    private final Set<String> skipTools;
    private final BiConsumer<String, String> onDenied;
    private final HttpClient httpClient;

    private MCPMiddleware(Builder builder) {
        this.projectKey = builder.projectKey;
        this.baseUrl = builder.baseUrl;
        this.skipTools = Collections.unmodifiableSet(new HashSet<>(builder.skipTools));
        this.onDenied = builder.onDenied;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(DEFAULT_TIMEOUT)
                .build();
    }

    /**
     * Create a builder for configuring an MCPMiddleware instance.
     *
     * @param projectKey your AgentsID project key (e.g. "aid_proj_...")
     * @return a new builder instance
     */
    public static Builder builder(String projectKey) {
        return new Builder(projectKey);
    }

    /**
     * Validate a tool call. Raises exceptions on denial unless an
     * {@code onDenied} callback is configured.
     *
     * @param token  the agent bearer token
     * @param tool   the MCP tool name being invoked
     * @param params optional parameters for the tool call
     * @return validation result with "valid", "agent", and "permission" fields
     * @throws TokenExpiredException      if the token has expired
     * @throws TokenRevokedException      if the token has been revoked
     * @throws PermissionDeniedException  if the tool call is not allowed
     * @throws AgentsIDException          on API or network errors
     */
    public JSONObject validate(String token, String tool, JSONObject params)
            throws AgentsIDException {
        if (skipTools.contains(tool)) {
            JSONObject skipped = new JSONObject();
            skipped.put("valid", true);
            skipped.put("reason", "Tool in skip list");
            return skipped;
        }

        JSONObject result = validateToolCall(token, tool, params);

        if (!result.optBoolean("valid", false)) {
            String reason = result.optString("reason", "Unknown");
            if (reason.contains("expired")) {
                throw new TokenExpiredException();
            }
            if (reason.contains("revoked")) {
                throw new TokenRevokedException();
            }
        }

        JSONObject permission = result.optJSONObject("permission");
        if (permission != null && !permission.optBoolean("allowed", true)) {
            String reason = permission.optString("reason", "Denied");
            if (onDenied != null) {
                onDenied.accept(tool, reason);
            } else {
                throw new PermissionDeniedException(tool, reason);
            }
        }

        return result;
    }

    /**
     * Quick permission check -- returns {@code true}/{@code false} without throwing.
     *
     * @param token the agent bearer token
     * @param tool  the MCP tool name to check
     * @return {@code true} if the tool call is allowed, {@code false} otherwise
     */
    public boolean isAllowed(String token, String tool) {
        try {
            JSONObject result = validateToolCall(token, tool, null);
            boolean valid = result.optBoolean("valid", false);
            JSONObject permission = result.optJSONObject("permission");
            boolean allowed = permission != null && permission.optBoolean("allowed", false);
            return valid && allowed;
        } catch (Exception e) {
            return false;
        }
    }

    private JSONObject validateToolCall(String token, String tool, JSONObject params)
            throws AgentsIDException {
        String url = baseUrl + "/api/v1/validate";

        JSONObject body = new JSONObject();
        body.put("token", token);
        body.put("tool", tool);
        body.putOpt("params", params);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(DEFAULT_TIMEOUT)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                JSONObject fallback = new JSONObject();
                fallback.put("valid", false);
                fallback.put("reason", "Validation failed: " + response.statusCode());
                return fallback;
            }

            return new JSONObject(response.body());

        } catch (IOException e) {
            throw new AgentsIDException("Network error: " + e.getMessage(), "NETWORK_ERROR");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AgentsIDException("Request interrupted", "INTERRUPTED");
        }
    }

    // ═══════════════════════════════════════════
    // BUILDER
    // ═══════════════════════════════════════════

    /**
     * Builder for configuring an {@link MCPMiddleware} instance.
     */
    public static final class Builder {

        private final String projectKey;
        private String baseUrl = DEFAULT_BASE_URL;
        private Set<String> skipTools = new HashSet<>();
        private BiConsumer<String, String> onDenied;

        private Builder(String projectKey) {
            Objects.requireNonNull(projectKey, "projectKey is required");
            if (projectKey.isBlank()) {
                throw new IllegalArgumentException("projectKey must not be blank");
            }
            this.projectKey = projectKey;
        }

        /**
         * Set the base URL for the AgentsID API.
         *
         * @param baseUrl API base URL (default: {@code https://agentsid.dev})
         * @return this builder
         */
        public Builder baseUrl(String baseUrl) {
            Objects.requireNonNull(baseUrl, "baseUrl must not be null");
            this.baseUrl = baseUrl.replaceAll("/+$", "");
            return this;
        }

        /**
         * Set tool names to skip validation for.
         *
         * @param tools list of tool names that bypass validation
         * @return this builder
         */
        public Builder skipTools(List<String> tools) {
            this.skipTools = new HashSet<>(tools != null ? tools : List.of());
            return this;
        }

        /**
         * Set a callback invoked when permission is denied, instead of throwing
         * {@link PermissionDeniedException}.
         *
         * @param onDenied callback receiving (toolName, reason)
         * @return this builder
         */
        public Builder onDenied(BiConsumer<String, String> onDenied) {
            this.onDenied = onDenied;
            return this;
        }

        /**
         * Build the {@link MCPMiddleware} instance.
         *
         * @return a configured middleware instance
         */
        public MCPMiddleware build() {
            return new MCPMiddleware(this);
        }
    }
}
