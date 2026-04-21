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
 *      `required = false` so a transient guard failure (unpublished
 *      package, npm cache miss, network blip) does NOT prevent Codex from
 *      booting. The kernel sandbox still enforces regardless. Users see a
 *      red badge on the agentsid MCP if it fails — same UX as Cursor and
 *      Claude Code have for the same failure mode. Flip to `true` once
 *      `@agentsid/guard` is published and known-stable on npm so we can
 *      fail-loud rather than silently skip the MCP layer.
 *
 * The sandbox pair alone is enough for stable-grade enforcement; the
 * guard MCP is belt-and-suspenders (and load-bearing on platforms like
 * Gemini where we don't have a hook path). Hooks stay opt-in, off by
 * default, and Bash-only as of 2026-04.
 */
const HOOK_DIR = path.join(os.homedir(), ".agentsid", "hooks");
const PRE_TOOL_HOOK = path.join(HOOK_DIR, "pre-tool.sh");
const POST_TOOL_HOOK = path.join(HOOK_DIR, "post-tool.sh");
// 30s lets a cold `npx -y @agentsid/guard` download the package +
// @modelcontextprotocol/sdk (~2MB) on first run. Subsequent spawns hit
// the npx cache and start in <1s. 10s was Codex's default and too tight
// for a fresh install.
const STARTUP_TIMEOUT_SEC = 30;
const TOOL_TIMEOUT_SEC = 60;
const HOOK_TIMEOUT_SEC = 3;

/**
 * `developer_instructions` steering text injected into every Codex session.
 * Concise by design — longer prompts get ignored by the model. We tell the
 * agent three things:
 *   1. Prefer `agentsid_*` tools over native shell/file/network tools.
 *   2. What the tools look like (a few examples so the agent can locate them
 *      in its catalog).
 *   3. How to interpret a BLOCKED response (don't retry with native).
 *
 * Without this, Codex defaults to its own native `shell` tool and the guard
 * never fires — observed live 2026-04-20 when the first end-to-end test
 * needed an explicit "use agentsid_shell_run to ..." from the user.
 */
const CODEX_DEVELOPER_INSTRUCTIONS = [
  "When the MCP server named `agentsid` is connected, prefer its tools",
  "(`agentsid_shell_run`, `agentsid_file_read`, `agentsid_file_write`,",
  "`agentsid_git_run`, `agentsid_http_request`, `agentsid_db_query`, etc.)",
  "over native shell / file / network tools for ALL corresponding actions.",
  "Every `agentsid_*` call is validated against the user's permission",
  "policy; denials come back as `BLOCKED by AgentsID Guard` with the matched",
  "rule name. If a call is denied, do NOT retry with a native equivalent —",
  "report the block to the user and suggest they adjust the policy if the",
  "denial was unintended.",
].join(" ");

export const codexIntegration: PlatformIntegration = {
  name: "codex",
  label: "Codex",
  configFormat: "toml",
  instructions:
    "AgentsID will enable Codex's kernel-level sandbox " +
    "(`sandbox_mode = \"workspace-write\"` with `network_access = false`) " +
    "and register the guard MCP server. The sandbox is Codex's primary " +
    "enforcement layer — kernel-enforced, always on. Restart the Codex CLI " +
    "session (exit and relaunch) to activate. If a workflow needs outbound " +
    "network access, set `[sandbox_workspace_write] network_access = true` " +
    "in `~/.codex/config.toml`. If the guard MCP shows a red badge, it means " +
    "the `@agentsid/guard` npm package couldn't start — Codex still runs " +
    "with sandbox enforcement either way.",

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
      // Steers Codex toward the agentsid_* MCP tools so enforcement
      // actually runs. Without this the agent defaults to its native
      // `shell` tool and the guard never sees the call. See CHANGELOG 0.2.3.
      developer_instructions: CODEX_DEVELOPER_INSTRUCTIONS,
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
          // Fail-soft: if the guard can't start (npm 404, cache miss,
          // offline), Codex should still boot with sandbox enforcement.
          // See 0.2.1 CHANGELOG for why this changed from `true`.
          required: false,
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
