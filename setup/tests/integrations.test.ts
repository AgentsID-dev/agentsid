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

  it("declares type: stdio explicitly for forward-compat", () => {
    const cfg = cursorIntegration.generateConfig(sampleConfig) as any;
    expect(cfg.mcpServers.agentsid.type).toBe("stdio");
  });

  it("additionalFiles emits hooks.json by default, NOT permissions.json", () => {
    const files = cursorIntegration.additionalFiles!(sampleConfig);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith("hooks.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("permissions.json"))).toBe(false);
  });

  it("additionalFiles emits permissions.json when opted in", () => {
    const files = cursorIntegration.additionalFiles!(sampleConfig, {
      enableCursorPermissions: true,
    });
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith("permissions.json"))).toBe(true);
  });

  it("hooks.json contains the 3 blocking events with failClosed: true", () => {
    const files = cursorIntegration.additionalFiles!(sampleConfig);
    const hooks = files.find((f) => f.path.endsWith("hooks.json"));
    expect(hooks).toBeDefined();
    const body = hooks!.content as any;
    expect(body.version).toBe(1);
    for (const event of [
      "beforeShellExecution",
      "beforeMCPExecution",
      "beforeReadFile",
    ]) {
      const entry = body.hooks[event];
      expect(Array.isArray(entry)).toBe(true);
      expect(entry[0].failClosed).toBe(true);
      expect(entry[0].timeout).toBe(3);
      expect(typeof entry[0].command).toBe("string");
    }
  });

  it("hooks.json does NOT register preToolUse (redundant with before-specific hooks)", () => {
    const files = cursorIntegration.additionalFiles!(sampleConfig);
    const hooks = files.find((f) => f.path.endsWith("hooks.json"))!;
    const body = hooks.content as any;
    expect(body.hooks.preToolUse).toBeUndefined();
  });

  it("hooks.json does NOT register sessionStart (Cursor ignores env on entries)", () => {
    // The previous WIP tried to inject env via sessionStart[0].env which is a
    // no-op in Cursor — env only flows from sessionStart script stdout.
    // Credentials now flow through ~/.agentsid/cursor-env.json instead.
    const files = cursorIntegration.additionalFiles!(sampleConfig);
    const hooks = files.find((f) => f.path.endsWith("hooks.json"))!;
    const body = hooks.content as any;
    expect(body.hooks.sessionStart).toBeUndefined();
  });

  it("each blocking hook points at cursor-adapter.sh with its own subcommand", () => {
    const files = cursorIntegration.additionalFiles!(sampleConfig);
    const hooks = files.find((f) => f.path.endsWith("hooks.json"))!;
    const body = hooks.content as any;
    const expectations: Array<[string, string]> = [
      ["beforeShellExecution", "shell"],
      ["beforeMCPExecution", "mcp"],
      ["beforeReadFile", "read"],
    ];
    for (const [event, subcommand] of expectations) {
      const cmd = body.hooks[event][0].command as string;
      expect(cmd).toMatch(/cursor-adapter\.sh /);
      expect(cmd.endsWith(` ${subcommand}`)).toBe(true);
    }
  });

  it("after* audit hooks point at cursor-adapter.sh audit (non-blocking)", () => {
    const files = cursorIntegration.additionalFiles!(sampleConfig);
    const hooks = files.find((f) => f.path.endsWith("hooks.json"))!;
    const body = hooks.content as any;
    for (const event of ["afterFileEdit", "afterShellExecution", "afterMCPExecution"]) {
      const entry = body.hooks[event][0];
      expect(entry.command).toMatch(/cursor-adapter\.sh audit$/);
      expect(entry.failClosed).toBeUndefined();
    }
  });

  it("emits cursor-env.json with AGENTSID_* creds and mode 0o600", () => {
    const files = cursorIntegration.additionalFiles!({
      ...sampleConfig,
      agentId: "ag_123",
      apiUrl: "https://api.example",
    });
    const envFile = files.find((f) => f.path.endsWith("cursor-env.json"));
    expect(envFile).toBeDefined();
    expect(envFile!.mode).toBe(0o600);
    const body = envFile!.content as any;
    expect(body.AGENTSID_PROJECT_KEY).toBe("test-api-key-123");
    expect(body.AGENTSID_AGENT_TOKEN).toBe("test-agent-token-456");
    expect(body.AGENTSID_AGENT_ID).toBe("ag_123");
    expect(body.AGENTSID_API_URL).toBe("https://api.example");
  });

  it("cursor-env.json lives under ~/.agentsid/ regardless of scope", () => {
    // The env file is shared across Cursor sessions, so it's always written
    // globally even in project scope. The wizard chmods it 600.
    const expected = path.join(os.homedir(), ".agentsid", "cursor-env.json");
    for (const cfg of [sampleConfig, projectConfig]) {
      const files = cursorIntegration.additionalFiles!(cfg);
      const envFile = files.find((f) => f.path.endsWith("cursor-env.json"))!;
      expect(envFile.path).toBe(expected);
    }
  });

  it("project-scope hooks.json lands at .cursor/hooks.json", () => {
    const files = cursorIntegration.additionalFiles!(projectConfig);
    const hooks = files.find((f) => f.path.endsWith("hooks.json"))!;
    expect(hooks.path).toBe(path.join(".cursor", "hooks.json"));
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
