import type { PlatformIntegration, IntegrationConfig } from "./types.js";
import os from "os";
import path from "path";

export const claudeCodeIntegration: PlatformIntegration = {
  name: "claude-code",
  label: "Claude Code",
  configFormat: "json",
  instructions:
    "AgentsID will be registered as an MCP server in your Claude Code settings. " +
    "Restart Claude Code after setup to activate the guard.",

  configPath(scope) {
    if (scope === "global") {
      return path.join(os.homedir(), ".claude", "settings.json");
    }
    return path.join(".claude", "settings.json");
  },

  generateConfig(config: IntegrationConfig) {
    const hookDir = path.join(os.homedir(), ".agentsid", "hooks");
    return {
      hooks: {
        PreToolUse: [
          {
            matcher: ".*",
            hooks: [
              {
                type: "command",
                command: `${hookDir}/pre-tool.sh`,
                timeout: 3000,
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: ".*",
            hooks: [
              {
                type: "command",
                command: `${hookDir}/post-tool.sh`,
                timeout: 3000,
              },
            ],
          },
        ],
      },
      mcpServers: {
        agentsid: {
          command: "npx",
          args: ["-y", "@agentsid/guard"],
          env: {
            AGENTSID_PROJECT_KEY: config.apiKey,
            AGENTSID_AGENT_TOKEN: config.agentToken,
          },
        },
      },
    };
  },
};
