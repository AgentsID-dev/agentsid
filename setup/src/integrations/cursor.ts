import os from "os";
import path from "path";
import type {
  GeneratedFile,
  IntegrationConfig,
  IntegrationOptions,
  PlatformIntegration,
} from "./types.js";

/**
 * Cursor integration.
 *
 * Cursor ≥ 1.7 exposes block-level hooks with `failClosed`. We register the
 * guard as an MCP server in `mcp.json` AND install a sibling `hooks.json`
 * that points at a Cursor-specific adapter script. The adapter translates
 * between Cursor's per-event stdin shapes and our /validate API, and emits
 * Cursor's `{permission, user_message, agent_message}` output format.
 *
 * Credentials flow through `~/.agentsid/cursor-env.json` (chmod 600 at write
 * time), sourced by the adapter on each invocation. We deliberately do NOT
 * rely on a `sessionStart` env injection — Cursor's env pipe is only
 * readable by subsequent hooks in the same session, so the adapter needs a
 * durable fallback for the first hook of a fresh session anyway.
 *
 * Config files are read only at Cursor startup — the wizard instructs the
 * user to restart Cursor after setup.
 */
const HOOK_DIR = path.join(os.homedir(), ".agentsid", "hooks");
const ADAPTER = path.join(HOOK_DIR, "cursor-adapter.sh");
const ENV_FILE = path.join(os.homedir(), ".agentsid", "cursor-env.json");
const BLOCKING_TIMEOUT_SEC = 3;

export const cursorIntegration: PlatformIntegration = {
  name: "cursor",
  label: "Cursor",
  configFormat: "json",
  instructions:
    "AgentsID will be registered as an MCP server in your Cursor settings and " +
    "install block-level hooks for shell, MCP, and file-read tool calls. " +
    "Restart Cursor (Cmd+Q then relaunch) to activate — Cursor reads its " +
    "config files only at startup. Verify Settings → MCP → `agentsid` shows green.",

  configPath(scope) {
    if (scope === "global") {
      return path.join(os.homedir(), ".cursor", "mcp.json");
    }
    return path.join(".cursor", "mcp.json");
  },

  generateConfig(config: IntegrationConfig) {
    const envBlock: Record<string, string> = {
      AGENTSID_PROJECT_KEY: config.apiKey,
      AGENTSID_AGENT_TOKEN: config.agentToken,
    };
    if (config.agentId) envBlock.AGENTSID_AGENT_ID = config.agentId;
    if (config.apiUrl) envBlock.AGENTSID_API_URL = config.apiUrl;

    return {
      mcpServers: {
        agentsid: {
          type: "stdio",
          command: "npx",
          args: ["-y", "@agentsid/guard"],
          env: envBlock,
        },
      },
    };
  },

  additionalFiles(config: IntegrationConfig, options?: IntegrationOptions) {
    const files: GeneratedFile[] = [
      {
        path: hooksConfigPath(config.scope),
        format: "json",
        content: buildHooksFile(),
      },
      {
        path: ENV_FILE,
        format: "json",
        content: buildEnvFile(config),
        mode: 0o600,
      },
    ];

    if (options?.enableCursorPermissions) {
      files.push({
        path: permissionsConfigPath(config.scope),
        format: "json",
        content: buildPermissionsFile(),
      });
    }

    return files;
  },
};

function hooksConfigPath(scope: "global" | "project"): string {
  if (scope === "global") {
    return path.join(os.homedir(), ".cursor", "hooks.json");
  }
  return path.join(".cursor", "hooks.json");
}

function permissionsConfigPath(scope: "global" | "project"): string {
  if (scope === "global") {
    return path.join(os.homedir(), ".cursor", "permissions.json");
  }
  return path.join(".cursor", "permissions.json");
}

/**
 * Block-level hooks config. Every security hook sets `failClosed: true` so
 * that a crashed or misconfigured hook script denies rather than allows the
 * underlying operation. The adapter is invoked with a per-event sub-command
 * so one script handles all four shapes.
 *
 * We intentionally do NOT register `preToolUse` — its stdin overlaps with
 * `beforeShellExecution`/`beforeMCPExecution`/`beforeReadFile`, and firing
 * twice on the same operation burns latency against our 3s budget.
 */
function buildHooksFile(): Record<string, unknown> {
  const blocking = (subcommand: string) => ({
    command: `${ADAPTER} ${subcommand}`,
    type: "command" as const,
    timeout: BLOCKING_TIMEOUT_SEC,
    failClosed: true,
    matcher: ".*",
  });

  const audit = () => ({
    command: `${ADAPTER} audit`,
    type: "command" as const,
    timeout: BLOCKING_TIMEOUT_SEC,
    matcher: ".*",
  });

  return {
    version: 1,
    hooks: {
      beforeShellExecution: [blocking("shell")],
      beforeMCPExecution: [blocking("mcp")],
      beforeReadFile: [blocking("read")],
      afterFileEdit: [audit()],
      afterShellExecution: [audit()],
      afterMCPExecution: [audit()],
    },
  };
}

/**
 * Credentials file read by the Cursor hook adapter. Written at global scope
 * so it's shared across all Cursor sessions. The wizard chmods this 600 at
 * write time (see launch.tsx).
 */
function buildEnvFile(config: IntegrationConfig): Record<string, unknown> {
  const env: Record<string, string> = {
    AGENTSID_PROJECT_KEY: config.apiKey,
    AGENTSID_AGENT_TOKEN: config.agentToken,
  };
  if (config.agentId) env.AGENTSID_AGENT_ID = config.agentId;
  if (config.apiUrl) env.AGENTSID_API_URL = config.apiUrl;
  return env;
}

/**
 * Pre-authorise the `agentsid:*` tool namespace so the user does not have to
 * flip the auto-run toggle on every Cursor restart. Opt-in only — emitted
 * from `additionalFiles` when the wizard's `enableCursorPermissions` flag
 * is true.
 */
function buildPermissionsFile(): Record<string, unknown> {
  return {
    version: 1,
    permissions: {
      "mcp:agentsid:*": "allow",
    },
  };
}
