import os from "os";
import path from "path";
import type {
  GeneratedFile,
  IntegrationConfig,
  IntegrationOptions,
  PlatformIntegration,
} from "./types.js";

/**
 * Codex integration.
 *
 * Codex shares the same `~/.codex/config.toml` between the CLI and the IDE
 * extension, so one file covers both surfaces. We write three things:
 *
 *   1. `sandbox_mode = "workspace-write"` — kernel-level sandbox. Codex's
 *      PRIMARY enforcement layer. Stronger than any hook we could add
 *      because it's enforced by the OS, not by a userland script.
 *   2. `[sandbox_workspace_write] network_access = false` — blocks outbound
 *      network calls from inside the sandbox. Safe default for coding work.
 *   3. `[mcp_servers.agentsid]` — registers the guard MCP server with
 *      `required = true` so Codex fails-loud (not silently-unguarded) if
 *      the guard can't start.
 *
 * The sandbox pair + guard MCP make Codex stable-grade without relying on
 * the experimental `enableCodexHooks` surface. Hooks stay opt-in, off by
 * default, and Bash-only as of 2026-04.
 */
const HOOK_DIR = path.join(os.homedir(), ".agentsid", "hooks");
const PRE_TOOL_HOOK = path.join(HOOK_DIR, "pre-tool.sh");
const POST_TOOL_HOOK = path.join(HOOK_DIR, "post-tool.sh");
const STARTUP_TIMEOUT_SEC = 10;
const TOOL_TIMEOUT_SEC = 60;
const HOOK_TIMEOUT_SEC = 3;

export const codexIntegration: PlatformIntegration = {
  name: "codex",
  label: "Codex",
  configFormat: "toml",
  instructions:
    "AgentsID will register a required MCP server in your Codex config AND " +
    "enable Codex's kernel-level sandbox (`sandbox_mode = \"workspace-write\"` " +
    "with `network_access = false`) — that's Codex's primary enforcement " +
    "layer. Restart the Codex CLI session (exit and relaunch) to activate. " +
    "If a workflow genuinely needs outbound network access, set " +
    "`[sandbox_workspace_write] network_access = true` in " +
    "`~/.codex/config.toml` — but the guard MCP still validates every call.",

  configPath(scope) {
    if (scope === "global") {
      return path.join(os.homedir(), ".codex", "config.toml");
    }
    return path.join(".codex", "config.toml");
  },

  generateConfig(config: IntegrationConfig) {
    const envBlock: Record<string, string> = {
      AGENTSID_PROJECT_KEY: config.apiKey,
      AGENTSID_AGENT_TOKEN: config.agentToken,
    };
    if (config.agentId) envBlock.AGENTSID_AGENT_ID = config.agentId;
    if (config.apiUrl) envBlock.AGENTSID_API_URL = config.apiUrl;

    return {
      // Top-level: kernel-level sandbox. `workspace-write` lets the agent
      // read/write inside the workspace but blocks system paths, network,
      // and privilege escalation. Codex config-reference lists three
      // allowed values: "read-only", "workspace-write", "danger-full-access".
      sandbox_mode: "workspace-write",
      // Nested table — disables outbound network within the sandbox.
      // Users who need network can flip this to true or override via
      // Codex's per-invocation flags.
      sandbox_workspace_write: {
        network_access: false,
      },
      mcp_servers: {
        agentsid: {
          command: "npx",
          args: ["-y", "@agentsid/guard"],
          env: envBlock,
          required: true,
          enabled: true,
          startup_timeout_sec: STARTUP_TIMEOUT_SEC,
          tool_timeout_sec: TOOL_TIMEOUT_SEC,
        },
      },
    };
  },

  additionalFiles(config: IntegrationConfig, options?: IntegrationOptions) {
    if (!options?.enableCodexHooks) return [];
    return [
      {
        path: hooksConfigPath(config.scope),
        format: "json",
        content: buildHooksFile(),
      },
    ];
  },
};

function hooksConfigPath(scope: "global" | "project"): string {
  if (scope === "global") {
    return path.join(os.homedir(), ".codex", "hooks.json");
  }
  return path.join(".codex", "hooks.json");
}

/**
 * Codex hooks schema (experimental). `PreToolUse` currently fires for the
 * `Bash` tool only; we install it primarily as a shell-policy lever.
 * `PostToolUse` is audit-only (cannot undo side effects).
 */
function buildHooksFile(): Record<string, unknown> {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: PRE_TOOL_HOOK,
              timeoutSec: HOOK_TIMEOUT_SEC,
              statusMessage: "AgentsID guard checking…",
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: "",
          hooks: [
            {
              type: "command",
              command: POST_TOOL_HOOK,
              timeoutSec: HOOK_TIMEOUT_SEC,
            },
          ],
        },
      ],
    },
  };
}
