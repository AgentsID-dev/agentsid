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
 * extension, so one file covers both surfaces. We mark the guard MCP server
 * as `required = true` so that if the guard fails to initialise, Codex
 * surfaces the failure rather than silently running unguarded.
 *
 * Codex hooks are experimental and Bash-only as of 2026-04 — we emit them
 * only when the wizard's `enableCodexHooks` opt-in is set.
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
    "AgentsID will be registered as a required MCP server in your Codex " +
    "config and set up with sensible startup and tool timeouts. For the " +
    "strongest runtime defense on Codex, also set " +
    "`sandbox_mode = \"workspace-write\"` with `network_access = false` in " +
    "`~/.codex/config.toml` — that is Codex's primary enforcement layer. " +
    "Restart the Codex CLI session (exit and relaunch) to activate.",

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
