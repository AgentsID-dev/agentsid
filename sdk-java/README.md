# AgentsID Java SDK

[![Maven](https://img.shields.io/badge/maven-dev.agentsid:agentsid--sdk-7c5bf0?style=flat-square)](https://agentsid.dev)
[![Java](https://img.shields.io/badge/java-17%2B-7c5bf0?style=flat-square)](https://openjdk.org/)
[![License](https://img.shields.io/badge/license-MIT-7c5bf0?style=flat-square)](../LICENSE)

Identity, permissions, and audit for AI agents. Java SDK for [agentsid.dev](https://agentsid.dev).

## Installation

### Maven

```xml
<dependency>
    <groupId>dev.agentsid</groupId>
    <artifactId>agentsid-sdk</artifactId>
    <version>0.1.0</version>
</dependency>
```

### Gradle

```groovy
implementation 'dev.agentsid:agentsid-sdk:0.1.0'
```

## Quick Start

```java
import dev.agentsid.AgentsID;
import dev.agentsid.AgentsIDException;
import org.json.JSONObject;

import java.util.List;

public class Example {
    public static void main(String[] args) throws AgentsIDException {
        AgentsID client = AgentsID.builder("aid_proj_...")
            .baseUrl("https://agentsid.dev")
            .build();

        // Register an agent
        JSONObject result = client.registerAgent(
            "research-bot",
            "user@example.com",
            List.of("search_*", "save_memory"),
            24,    // TTL in hours
            null   // optional metadata
        );

        String agentId = result.getJSONObject("agent").getString("id");
        String token = result.getString("token");

        // Validate a tool call
        JSONObject validation = client.validateToken(token, "search_web", null);
        System.out.println("Valid: " + validation.getBoolean("valid"));
        // → Valid: true

        // Check permissions
        JSONObject check = client.checkPermission(agentId, "delete_user", null);
        System.out.println("Allowed: " + check.getBoolean("allowed"));
        // → Allowed: false (deny-first)
    }
}
```

## Configuration

```java
AgentsID client = AgentsID.builder("aid_proj_...")
    .baseUrl("https://agentsid.dev")    // default
    .timeout(Duration.ofSeconds(10))     // default
    .build();
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectKey` | `String` | *required* | Your project API key (`aid_proj_...`) |
| `baseUrl` | `String` | `https://agentsid.dev` | API base URL |
| `timeout` | `Duration` | 10 seconds | HTTP request timeout |

## API Reference

### Agents

#### `registerAgent(name, onBehalfOf, permissions, ttlHours, metadata)`

Register a new agent and issue a token.

```java
JSONObject result = client.registerAgent(
    "my-agent",
    "user_123",
    List.of("search_*", "save_memory"),
    24,
    Map.of("team", "research")
);

String agentId = result.getJSONObject("agent").getString("id");
String token = result.getString("token");
String tokenId = result.getString("token_id");
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `String` | Yes | Agent display name |
| `onBehalfOf` | `String` | Yes | User/entity the agent acts for |
| `permissions` | `List<String>` | No | Permission patterns (e.g. `search_*`) |
| `ttlHours` | `Integer` | No | Token TTL in hours (default: 24, max: 720) |
| `metadata` | `Map<String, Object>` | No | Key-value metadata (max 10KB) |

#### `getAgent(agentId)`

Get details for a specific agent.

```java
JSONObject agent = client.getAgent("agt_abc123");
System.out.println(agent.getString("name"));
System.out.println(agent.getString("status")); // "active", "revoked", "expired"
```

#### `listAgents(status, limit)`

List agents with optional filtering.

```java
// All agents
JSONArray all = client.listAgents();

// Active agents only, limit 10
JSONArray active = client.listAgents("active", 10);
```

#### `revokeAgent(agentId)`

Permanently revoke an agent and invalidate its token.

```java
client.revokeAgent("agt_abc123");
```

### Permissions

#### `setPermissions(agentId, rules)`

Set permission rules for an agent. Replaces existing rules.

```java
List<JSONObject> rules = List.of(
    new JSONObject()
        .put("tool_pattern", "search_*")
        .put("action", "allow"),
    new JSONObject()
        .put("tool_pattern", "delete_*")
        .put("action", "deny")
        .put("priority", 10)
);

client.setPermissions("agt_abc123", rules);
```

| Rule Field | Type | Required | Description |
|------------|------|----------|-------------|
| `tool_pattern` | `String` | Yes | Glob pattern (`search_*`, `*_memory`) |
| `action` | `String` | Yes | `"allow"` or `"deny"` |
| `conditions` | `JSONObject` | No | Conditional constraints |
| `priority` | `int` | No | Rule priority (higher wins, default: 0) |

#### `getPermissions(agentId)`

Get permission rules for an agent.

```java
JSONArray rules = client.getPermissions("agt_abc123");
for (int i = 0; i < rules.length(); i++) {
    JSONObject rule = rules.getJSONObject(i);
    System.out.println(rule.getString("tool_pattern") + " → " + rule.getString("action"));
}
```

#### `checkPermission(agentId, tool, params)`

Check if an agent has permission for a specific tool call.

```java
JSONObject check = client.checkPermission("agt_abc123", "delete_user", null);
boolean allowed = check.getBoolean("allowed");
String reason = check.optString("reason", "");
```

### Token Validation

#### `validateToken(token, tool, params)`

Validate an agent token and optionally check tool permission.

```java
// Validate token + check tool permission
JSONObject result = client.validateToken(token, "save_memory", null);
boolean valid = result.getBoolean("valid");
JSONObject permission = result.getJSONObject("permission");
boolean allowed = permission.getBoolean("allowed");

// Validate token only (no tool check)
JSONObject tokenOnly = client.validateToken(token);
```

### Audit

#### `getAuditLog(agentId, tool, action, since, limit)`

Query the audit log with optional filters.

```java
// All events
JSONObject log = client.getAuditLog();

// Filtered
JSONObject filtered = client.getAuditLog(
    "agt_abc123",    // agent ID
    "delete_user",   // tool name
    "deny",          // action filter
    "2026-03-01",    // since (ISO 8601)
    50               // limit
);
```

## MCP Middleware

Drop-in middleware for Java MCP servers. Validates agent tokens and checks permissions on every tool call.

```java
import dev.agentsid.MCPMiddleware;

MCPMiddleware middleware = MCPMiddleware.builder("aid_proj_...")
    .skipTools(List.of("ping", "health"))
    .build();

// In your MCP tool handler:
public Object handleToolCall(String bearerToken, String tool, JSONObject params) {
    JSONObject auth = middleware.validate(bearerToken, tool, params);
    // If we reach here, the call is authorized
    return executeToolLogic(tool, params);
}
```

### Quick Permission Check

```java
// Returns true/false without throwing
boolean allowed = middleware.isAllowed(token, "save_memory");
```

### Custom Denial Handler

```java
MCPMiddleware middleware = MCPMiddleware.builder("aid_proj_...")
    .onDenied((tool, reason) -> {
        logger.warn("Denied: {} — {}", tool, reason);
        // Custom handling instead of throwing PermissionDeniedException
    })
    .build();
```

### Middleware Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `projectKey` | `String` | *required* | Your project API key |
| `baseUrl` | `String` | `https://agentsid.dev` | API base URL |
| `skipTools` | `List<String>` | `[]` | Tool names that bypass validation |
| `onDenied` | `BiConsumer<String, String>` | `null` | Custom denial handler (tool, reason) |

## Error Handling

All API methods throw `AgentsIDException` or its subclasses:

```java
try {
    client.validateToken(token, "delete_user", null);
} catch (AuthenticationException e) {
    // Invalid API key (HTTP 401)
} catch (TokenExpiredException e) {
    // Token has expired — refresh it
} catch (TokenRevokedException e) {
    // Token has been revoked
} catch (PermissionDeniedException e) {
    // Tool call not allowed
    System.out.println("Tool: " + e.getTool());
    System.out.println("Reason: " + e.getReason());
} catch (AgentsIDException e) {
    // Other API or network errors
    System.out.println("Code: " + e.getCode());
    System.out.println("Status: " + e.getStatusCode());
}
```

| Exception | When |
|-----------|------|
| `AuthenticationException` | Invalid or missing API key (HTTP 401) |
| `TokenExpiredException` | Agent token has expired |
| `TokenRevokedException` | Agent token has been revoked |
| `PermissionDeniedException` | Tool call denied by permission rules |
| `AgentsIDException` | Base class for all SDK errors |

## Requirements

- Java 17+
- `org.json:json` (included as dependency)

## Documentation

- [Full Documentation](https://agentsid.dev/docs)
- [Setup Guides](https://agentsid.dev/guides)
- [API Reference](https://agentsid.dev/docs#api-reference)

## License

MIT
