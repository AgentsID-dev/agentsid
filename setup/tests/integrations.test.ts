import { describe, it, expect } from "vitest";
import os from "os";
import path from "path";
import { claudeCodeIntegration } from "../src/integrations/claude-code.js";
import { cursorIntegration } from "../src/integrations/cursor.js";
import { codexIntegration } from "../src/integrations/codex.js";
import { geminiIntegration } from "../src/integrations/gemini.js";
import { localModelIntegration } from "../src/integrations/local-model.js";
import type { IntegrationConfig } from "../src/integrations/types.js";

const sampleConfig: IntegrationConfig = {
  apiKey: "test-api-key-123",
  agentToken: "test-agent-token-456",
  scope: "global",
};

const projectConfig: IntegrationConfig = {
  apiKey: "proj-api-key",
  agentToken: "proj-agent-token",
  scope: "project",
};

// ─── Claude Code ────────────────────────────────────────────────────────────

describe("claudeCodeIntegration", () => {
  it("has correct name and label", () => {
    expect(claudeCodeIntegration.name).toBe("claude-code");
    expect(claudeCodeIntegration.label).toBe("Claude Code");
  });

  it("uses json format", () => {
    expect(claudeCodeIntegration.configFormat).toBe("json");
  });

  it("global config path resolves to ~/.claude/settings.json", () => {
    const expected = path.join(os.homedir(), ".claude", "settings.json");
    expect(claudeCodeIntegration.configPath("global")).toBe(expected);
  });

  it("project config path resolves to .claude/settings.json", () => {
    expect(claudeCodeIntegration.configPath("project")).toBe(
      path.join(".claude", "settings.json")
    );
  });

  it("generates correct mcpServers shape", () => {
    const cfg = claudeCodeIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcpServers.agentsid.command).toBe("npx");
    expect(cfg.mcpServers.agentsid.args).toEqual(["-y", "@agentsid/guard"]);
  });

  it("injects AGENTSID_PROJECT_KEY env var", () => {
    const cfg = claudeCodeIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcpServers.agentsid.env.AGENTSID_PROJECT_KEY).toBe(
      "test-api-key-123"
    );
  });

  it("injects AGENTSID_AGENT_TOKEN env var", () => {
    const cfg = claudeCodeIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcpServers.agentsid.env.AGENTSID_AGENT_TOKEN).toBe(
      "test-agent-token-456"
    );
  });
});

// ─── Cursor ─────────────────────────────────────────────────────────────────

describe("cursorIntegration", () => {
  it("has correct name and label", () => {
    expect(cursorIntegration.name).toBe("cursor");
    expect(cursorIntegration.label).toBe("Cursor");
  });

  it("uses json format", () => {
    expect(cursorIntegration.configFormat).toBe("json");
  });

  it("global config path resolves to ~/.cursor/mcp.json", () => {
    const expected = path.join(os.homedir(), ".cursor", "mcp.json");
    expect(cursorIntegration.configPath("global")).toBe(expected);
  });

  it("project config path resolves to .cursor/mcp.json", () => {
    expect(cursorIntegration.configPath("project")).toBe(
      path.join(".cursor", "mcp.json")
    );
  });

  it("generates correct mcpServers shape", () => {
    const cfg = cursorIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcpServers.agentsid.command).toBe("npx");
    expect(cfg.mcpServers.agentsid.args).toEqual(["-y", "@agentsid/guard"]);
  });

  it("injects env vars correctly", () => {
    const cfg = cursorIntegration.generateConfig(projectConfig) as any;
    expect(cfg.mcpServers.agentsid.env.AGENTSID_PROJECT_KEY).toBe(
      "proj-api-key"
    );
    expect(cfg.mcpServers.agentsid.env.AGENTSID_AGENT_TOKEN).toBe(
      "proj-agent-token"
    );
  });
});

// ─── Codex ──────────────────────────────────────────────────────────────────

describe("codexIntegration", () => {
  it("has correct name and label", () => {
    expect(codexIntegration.name).toBe("codex");
    expect(codexIntegration.label).toBe("Codex");
  });

  it("uses toml format", () => {
    expect(codexIntegration.configFormat).toBe("toml");
  });

  it("global config path resolves to ~/.codex/config.toml", () => {
    const expected = path.join(os.homedir(), ".codex", "config.toml");
    expect(codexIntegration.configPath("global")).toBe(expected);
  });

  it("project config path resolves to .codex/config.toml", () => {
    expect(codexIntegration.configPath("project")).toBe(
      path.join(".codex", "config.toml")
    );
  });

  it("generates mcp_servers (underscore) key for TOML compatibility", () => {
    const cfg = codexIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcp_servers).toBeDefined();
    expect(cfg.mcp_servers.agentsid).toBeDefined();
  });

  it("generates correct command and args", () => {
    const cfg = codexIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcp_servers.agentsid.command).toBe("npx");
    expect(cfg.mcp_servers.agentsid.args).toEqual(["-y", "@agentsid/guard"]);
  });

  it("injects env vars correctly", () => {
    const cfg = codexIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcp_servers.agentsid.env.AGENTSID_PROJECT_KEY).toBe(
      "test-api-key-123"
    );
    expect(cfg.mcp_servers.agentsid.env.AGENTSID_AGENT_TOKEN).toBe(
      "test-agent-token-456"
    );
  });

  it("marks the guard MCP as required + sets startup/tool timeouts", () => {
    const cfg = codexIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcp_servers.agentsid.required).toBe(true);
    expect(cfg.mcp_servers.agentsid.enabled).toBe(true);
    expect(typeof cfg.mcp_servers.agentsid.startup_timeout_sec).toBe("number");
    expect(typeof cfg.mcp_servers.agentsid.tool_timeout_sec).toBe("number");
  });

  it("additionalFiles emits nothing by default (hooks are experimental)", () => {
    const files = codexIntegration.additionalFiles!(sampleConfig);
    expect(files).toEqual([]);
  });

  it("additionalFiles emits hooks.json only when opted in", () => {
    const files = codexIntegration.additionalFiles!(sampleConfig, {
      enableCodexHooks: true,
    });
    expect(files).toHaveLength(1);
    const hooks = files[0]!;
    expect(hooks.format).toBe("json");
    expect(hooks.path.endsWith("hooks.json")).toBe(true);
    const body = hooks.content as any;
    expect(body.hooks.PreToolUse[0].hooks[0].type).toBe("command");
    expect(typeof body.hooks.PreToolUse[0].hooks[0].command).toBe("string");
    expect(body.hooks.PreToolUse[0].hooks[0].timeoutSec).toBe(3);
  });

  it("instructions mention the sandbox_mode recommendation", () => {
    expect(codexIntegration.instructions).toMatch(/sandbox_mode/);
    expect(codexIntegration.instructions).toMatch(/network_access/);
  });
});

// ─── Gemini ─────────────────────────────────────────────────────────────────

describe("geminiIntegration", () => {
  it("has correct name and label", () => {
    expect(geminiIntegration.name).toBe("gemini");
    expect(geminiIntegration.label).toBe("Gemini");
  });

  it("uses json format", () => {
    expect(geminiIntegration.configFormat).toBe("json");
  });

  it("global config path resolves to ~/.gemini/settings.json", () => {
    const expected = path.join(os.homedir(), ".gemini", "settings.json");
    expect(geminiIntegration.configPath("global")).toBe(expected);
  });

  it("project config path resolves to .gemini/settings.json", () => {
    expect(geminiIntegration.configPath("project")).toBe(
      path.join(".gemini", "settings.json")
    );
  });

  it("generates correct mcpServers shape", () => {
    const cfg = geminiIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcpServers.agentsid.command).toBe("npx");
    expect(cfg.mcpServers.agentsid.args).toEqual(["-y", "@agentsid/guard"]);
    expect(cfg.mcpServers.agentsid.env.AGENTSID_PROJECT_KEY).toBe(
      "test-api-key-123"
    );
  });
});

// ─── Local Model ─────────────────────────────────────────────────────────────

describe("localModelIntegration", () => {
  it("has correct name and label", () => {
    expect(localModelIntegration.name).toBe("local-model");
    expect(localModelIntegration.label).toBe("Local Model");
  });

  it("returns empty string for configPath (no file written)", () => {
    expect(localModelIntegration.configPath("global")).toBe("");
    expect(localModelIntegration.configPath("project")).toBe("");
  });

  it("generates proxy command with port 3847", () => {
    const cfg = localModelIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.command).toContain("@agentsid/proxy");
    expect(cfg.command).toContain("3847");
  });

  it("injects env vars correctly", () => {
    const cfg = localModelIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.env.AGENTSID_PROJECT_KEY).toBe("test-api-key-123");
    expect(cfg.env.AGENTSID_AGENT_TOKEN).toBe("test-agent-token-456");
  });

  it("does not generate mcpServers key", () => {
    const cfg = localModelIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcpServers).toBeUndefined();
  });
});
