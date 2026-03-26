package dev.agentsid;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.StringJoiner;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * AgentsID client -- register agents, validate tokens, manage permissions.
 *
 * <p>Usage:</p>
 * <pre>{@code
 * AgentsID client = AgentsID.builder("aid_proj_...")
 *     .baseUrl("https://agentsid.dev")
 *     .timeout(Duration.ofSeconds(10))
 *     .build();
 *
 * JSONObject agent = client.registerAgent("my-agent", "user@example.com",
 *     List.of("read", "write"), 24, null);
 * }</pre>
 */
public final class AgentsID {

    private static final String DEFAULT_BASE_URL = "https://agentsid.dev";
    private static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);

    private final String projectKey;
    private final String baseUrl;
    private final Duration timeout;
    private final HttpClient httpClient;

    private AgentsID(Builder builder) {
        this.projectKey = builder.projectKey;
        this.baseUrl = builder.baseUrl;
        this.timeout = builder.timeout;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(builder.timeout)
                .build();
    }

    /**
     * Create a builder for configuring an AgentsID client.
     *
     * @param projectKey your AgentsID project key (e.g. "aid_proj_...")
     * @return a new builder instance
     */
    public static Builder builder(String projectKey) {
        return new Builder(projectKey);
    }

    // ═══════════════════════════════════════════
    // AGENTS
    // ═══════════════════════════════════════════

    /**
     * Register a new agent identity and issue a token.
     *
     * @param name        agent display name
     * @param onBehalfOf  the user or entity this agent acts on behalf of
     * @param permissions optional list of permission strings
     * @param ttlHours    optional token time-to-live in hours
     * @param metadata    optional key-value metadata
     * @return the created agent with its token
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject registerAgent(
            String name,
            String onBehalfOf,
            List<String> permissions,
            Integer ttlHours,
            Map<String, Object> metadata
    ) throws AgentsIDException {
        JSONObject body = new JSONObject();
        body.put("name", name);
        body.put("on_behalf_of", onBehalfOf);
        body.putOpt("permissions", permissions != null ? new JSONArray(permissions) : null);
        body.putOpt("ttl_hours", ttlHours);
        body.putOpt("metadata", metadata != null ? new JSONObject(metadata) : null);
        return requestObject("POST", "/agents/", body);
    }

    /**
     * Get details for a specific agent.
     *
     * @param agentId the agent identifier
     * @return agent details
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject getAgent(String agentId) throws AgentsIDException {
        return requestObject("GET", "/agents/" + agentId, null);
    }

    /**
     * List agents, optionally filtered by status.
     *
     * @param status optional status filter (e.g. "active", "revoked")
     * @param limit  maximum number of agents to return (default 50)
     * @return list of agent objects
     * @throws AgentsIDException on API or network errors
     */
    public JSONArray listAgents(String status, int limit) throws AgentsIDException {
        StringJoiner qs = new StringJoiner("&");
        if (status != null && !status.isEmpty()) {
            qs.add("status=" + status);
        }
        if (limit != 50) {
            qs.add("limit=" + limit);
        }
        String path = qs.length() > 0 ? "/agents/?" + qs : "/agents/";
        return requestArray("GET", path, null);
    }

    /**
     * List agents with default limit of 50.
     *
     * @param status optional status filter
     * @return list of agent objects
     * @throws AgentsIDException on API or network errors
     */
    public JSONArray listAgents(String status) throws AgentsIDException {
        return listAgents(status, 50);
    }

    /**
     * List all agents with default parameters.
     *
     * @return list of agent objects
     * @throws AgentsIDException on API or network errors
     */
    public JSONArray listAgents() throws AgentsIDException {
        return listAgents(null, 50);
    }

    /**
     * Revoke an agent, invalidating its token.
     *
     * @param agentId the agent identifier to revoke
     * @throws AgentsIDException on API or network errors
     */
    public void revokeAgent(String agentId) throws AgentsIDException {
        request("DELETE", "/agents/" + agentId, null);
    }

    // ═══════════════════════════════════════════
    // PERMISSIONS
    // ═══════════════════════════════════════════

    /**
     * Set permission rules for an agent.
     *
     * <p>Each rule should contain:</p>
     * <ul>
     *   <li>{@code tool_pattern} -- glob pattern for matching tools</li>
     *   <li>{@code action} -- "allow" or "deny"</li>
     *   <li>{@code conditions} -- optional conditions object</li>
     *   <li>{@code priority} -- optional priority (default 0)</li>
     * </ul>
     *
     * @param agentId the agent identifier
     * @param rules   list of permission rule objects
     * @return the updated permissions
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject setPermissions(String agentId, List<JSONObject> rules) throws AgentsIDException {
        JSONArray body = new JSONArray();
        for (JSONObject r : rules) {
            JSONObject normalized = new JSONObject();
            String toolPattern = r.optString("tool_pattern", r.optString("toolPattern", ""));
            normalized.put("tool_pattern", toolPattern);
            normalized.put("action", r.optString("action", "allow"));
            normalized.putOpt("conditions", r.opt("conditions"));
            normalized.put("priority", r.optInt("priority", 0));
            body.put(normalized);
        }
        return requestObject("PUT", "/agents/" + agentId + "/permissions", body);
    }

    /**
     * Get permission rules for an agent.
     *
     * @param agentId the agent identifier
     * @return list of permission rule objects
     * @throws AgentsIDException on API or network errors
     */
    public JSONArray getPermissions(String agentId) throws AgentsIDException {
        JSONObject data = requestObject("GET", "/agents/" + agentId + "/permissions", null);
        return data.optJSONArray("rules") != null ? data.getJSONArray("rules") : new JSONArray();
    }

    /**
     * Check whether an agent has permission for a specific tool call.
     *
     * @param agentId the agent identifier
     * @param tool    the tool name to check
     * @param params  optional parameters for the tool call
     * @return permission check result with "allowed" and "reason" fields
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject checkPermission(String agentId, String tool, Map<String, Object> params)
            throws AgentsIDException {
        JSONObject body = new JSONObject();
        body.put("agent_id", agentId);
        body.put("tool", tool);
        body.putOpt("params", params != null ? new JSONObject(params) : null);
        return requestObject("POST", "/check", body);
    }

    // ═══════════════════════════════════════════
    // TOKEN VALIDATION
    // ═══════════════════════════════════════════

    /**
     * Validate an agent token, optionally checking tool permission.
     *
     * @param token  the agent token to validate
     * @param tool   optional tool name to check permission for
     * @param params optional parameters for the tool call
     * @return validation result with "valid", "agent", and "permission" fields
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject validateToken(String token, String tool, Map<String, Object> params)
            throws AgentsIDException {
        JSONObject body = new JSONObject();
        body.put("token", token);
        body.putOpt("tool", tool);
        body.putOpt("params", params != null ? new JSONObject(params) : null);
        return requestObject("POST", "/validate", body);
    }

    /**
     * Validate an agent token without checking tool permission.
     *
     * @param token the agent token to validate
     * @return validation result
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject validateToken(String token) throws AgentsIDException {
        return validateToken(token, null, null);
    }

    // ═══════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════

    /**
     * Query the audit log with optional filters.
     *
     * @param agentId optional agent ID filter
     * @param tool    optional tool name filter
     * @param action  optional action filter
     * @param since   optional ISO 8601 timestamp to filter events after
     * @param limit   maximum number of entries (default 100)
     * @return audit log entries
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject getAuditLog(String agentId, String tool, String action, String since, int limit)
            throws AgentsIDException {
        StringJoiner qs = new StringJoiner("&");
        if (agentId != null && !agentId.isEmpty()) {
            qs.add("agent_id=" + agentId);
        }
        if (tool != null && !tool.isEmpty()) {
            qs.add("tool=" + tool);
        }
        if (action != null && !action.isEmpty()) {
            qs.add("action=" + action);
        }
        if (since != null && !since.isEmpty()) {
            qs.add("since=" + since);
        }
        qs.add("limit=" + limit);
        return requestObject("GET", "/audit/?" + qs, null);
    }

    /**
     * Query the audit log with default limit.
     *
     * @return audit log entries
     * @throws AgentsIDException on API or network errors
     */
    public JSONObject getAuditLog() throws AgentsIDException {
        return getAuditLog(null, null, null, null, 100);
    }

    // ═══════════════════════════════════════════
    // HTTP CLIENT
    // ═══════════════════════════════════════════

    private HttpResponse<String> request(String method, String path, Object body)
            throws AgentsIDException {
        String url = baseUrl + "/api/v1" + path;

        HttpRequest.Builder reqBuilder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(timeout)
                .header("Authorization", "Bearer " + projectKey)
                .header("Content-Type", "application/json");

        String bodyStr = body != null ? body.toString() : null;

        reqBuilder = switch (method) {
            case "GET" -> reqBuilder.GET();
            case "POST" -> reqBuilder.POST(bodyPublisher(bodyStr));
            case "PUT" -> reqBuilder.PUT(bodyPublisher(bodyStr));
            case "DELETE" -> reqBuilder.DELETE();
            default -> throw new AgentsIDException("Unsupported HTTP method: " + method, "CLIENT_ERROR");
        };

        try {
            HttpResponse<String> response = httpClient.send(
                    reqBuilder.build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 401) {
                throw new AuthenticationException();
            }

            if (response.statusCode() >= 400) {
                String detail = "Request failed: " + response.statusCode();
                try {
                    JSONObject errorBody = new JSONObject(response.body());
                    detail = errorBody.optString("detail", detail);
                } catch (Exception ignored) {
                    // use default detail
                }
                throw new AgentsIDException(detail, "API_ERROR", response.statusCode());
            }

            return response;

        } catch (AgentsIDException e) {
            throw e;
        } catch (IOException e) {
            throw new AgentsIDException("Network error: " + e.getMessage(), "NETWORK_ERROR");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AgentsIDException("Request interrupted", "INTERRUPTED");
        }
    }

    private JSONObject requestObject(String method, String path, Object body) throws AgentsIDException {
        HttpResponse<String> response = request(method, path, body);
        if (response.statusCode() == 204 || response.body() == null || response.body().isBlank()) {
            return new JSONObject();
        }
        return new JSONObject(response.body());
    }

    private JSONArray requestArray(String method, String path, Object body) throws AgentsIDException {
        HttpResponse<String> response = request(method, path, body);
        if (response.statusCode() == 204 || response.body() == null || response.body().isBlank()) {
            return new JSONArray();
        }
        return new JSONArray(response.body());
    }

    private static HttpRequest.BodyPublisher bodyPublisher(String body) {
        return body != null
                ? HttpRequest.BodyPublishers.ofString(body)
                : HttpRequest.BodyPublishers.noBody();
    }

    // ═══════════════════════════════════════════
    // BUILDER
    // ═══════════════════════════════════════════

    /**
     * Builder for configuring an {@link AgentsID} client.
     */
    public static final class Builder {

        private final String projectKey;
        private String baseUrl = DEFAULT_BASE_URL;
        private Duration timeout = DEFAULT_TIMEOUT;

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
         * Set the request timeout.
         *
         * @param timeout request timeout (default: 10 seconds)
         * @return this builder
         */
        public Builder timeout(Duration timeout) {
            Objects.requireNonNull(timeout, "timeout must not be null");
            this.timeout = timeout;
            return this;
        }

        /**
         * Build the {@link AgentsID} client.
         *
         * @return a configured client instance
         */
        public AgentsID build() {
            return new AgentsID(this);
        }
    }
}
