import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  mergeJsonConfig,
  writeConfig,
  serializeToml,
} from "../src/config-writer.js";

// ─── Temp directory helpers ──────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "agentsid-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── mergeJsonConfig ─────────────────────────────────────────────────────────

describe("mergeJsonConfig", () => {
  it("returns a new object (does not mutate existing)", () => {
    const existing = { a: 1 };
    const result = mergeJsonConfig(existing, { b: 2 });
    expect(existing).toEqual({ a: 1 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("preserves keys in existing not present in addition", () => {
    const result = mergeJsonConfig({ keep: "me", other: 99 }, { new: "val" });
    expect(result["keep"]).toBe("me");
    expect(result["other"]).toBe(99);
  });

  it("overwrites scalar values with addition", () => {
    const result = mergeJsonConfig({ key: "old" }, { key: "new" });
    expect(result["key"]).toBe("new");
  });

  it("deep merges nested objects", () => {
    const existing = { nested: { a: 1, b: 2 } };
    const addition = { nested: { b: 99, c: 3 } };
    const result = mergeJsonConfig(existing, addition) as any;
    expect(result.nested.a).toBe(1);
    expect(result.nested.b).toBe(99);
    expect(result.nested.c).toBe(3);
  });

  it("merges mcpServers at server-name level without clobbering existing servers", () => {
    const existing = {
      mcpServers: {
        existingServer: { command: "node", args: ["existing.js"] },
      },
    };
    const addition = {
      mcpServers: {
        agentsid: { command: "npx", args: ["-y", "@agentsid/guard"] },
      },
    };
    const result = mergeJsonConfig(existing, addition) as any;
    expect(result.mcpServers.existingServer).toBeDefined();
    expect(result.mcpServers.agentsid).toBeDefined();
    expect(result.mcpServers.agentsid.command).toBe("npx");
  });

  it("does not merge arrays — replaces them", () => {
    const result = mergeJsonConfig({ arr: [1, 2] }, { arr: [3] }) as any;
    expect(result.arr).toEqual([3]);
  });

  it("handles empty existing object", () => {
    const result = mergeJsonConfig({}, { a: 1 });
    expect(result).toEqual({ a: 1 });
  });

  it("handles empty addition object", () => {
    const result = mergeJsonConfig({ a: 1 }, {});
    expect(result).toEqual({ a: 1 });
  });
});

// ─── serializeToml ────────────────────────────────────────────────────────────

describe("serializeToml", () => {
  const sampleConfig = {
    mcp_servers: {
      agentsid: {
        command: "npx",
        args: ["-y", "@agentsid/guard"],
        env: {
          AGENTSID_PROJECT_KEY: "key-123",
          AGENTSID_AGENT_TOKEN: "token-456",
        },
      },
    },
  };

  it("includes [mcp_servers.agentsid] section header", () => {
    const toml = serializeToml(sampleConfig);
    expect(toml).toContain("[mcp_servers.agentsid]");
  });

  it("includes [mcp_servers.agentsid.env] section header", () => {
    const toml = serializeToml(sampleConfig);
    expect(toml).toContain("[mcp_servers.agentsid.env]");
  });

  it("writes command correctly", () => {
    const toml = serializeToml(sampleConfig);
    expect(toml).toContain('command = "npx"');
  });

  it("writes args as TOML array", () => {
    const toml = serializeToml(sampleConfig);
    expect(toml).toContain('args = ["-y", "@agentsid/guard"]');
  });

  it("writes env vars", () => {
    const toml = serializeToml(sampleConfig);
    expect(toml).toContain('AGENTSID_PROJECT_KEY = "key-123"');
    expect(toml).toContain('AGENTSID_AGENT_TOKEN = "token-456"');
  });

  it("throws when no output would be produced", () => {
    expect(() => serializeToml({})).toThrow();
  });

  it("emits top-level scalars before any [table] header (TOML ordering)", () => {
    const toml = serializeToml({
      sandbox_mode: "workspace-write",
      mcp_servers: { agentsid: { command: "npx" } },
    });
    const sandboxLineIdx = toml.indexOf('sandbox_mode = "workspace-write"');
    const tableHeaderIdx = toml.indexOf("[mcp_servers.agentsid]");
    expect(sandboxLineIdx).toBeGreaterThanOrEqual(0);
    expect(tableHeaderIdx).toBeGreaterThanOrEqual(0);
    expect(sandboxLineIdx).toBeLessThan(tableHeaderIdx);
  });

  it("emits generic [table] blocks for nested objects (Codex sandbox case)", () => {
    const toml = serializeToml({
      sandbox_mode: "workspace-write",
      sandbox_workspace_write: { network_access: false },
      mcp_servers: { agentsid: { command: "npx" } },
    });
    expect(toml).toContain("[sandbox_workspace_write]");
    expect(toml).toContain("network_access = false");
  });

  it("booleans serialise unquoted (TOML native bool)", () => {
    const toml = serializeToml({
      flag_true: true,
      flag_false: false,
      mcp_servers: { agentsid: { command: "npx" } },
    });
    expect(toml).toContain("flag_true = true");
    expect(toml).toContain("flag_false = false");
    // Must NOT double-quote as "true"/"false"
    expect(toml).not.toMatch(/flag_true = "true"/);
  });

  it("numbers serialise unquoted", () => {
    const toml = serializeToml({
      mcp_servers: {
        agentsid: { command: "npx", startup_timeout_sec: 10 },
      },
    });
    expect(toml).toContain("startup_timeout_sec = 10");
    expect(toml).not.toMatch(/startup_timeout_sec = "10"/);
  });
});

// ─── writeConfig — JSON ──────────────────────────────────────────────────────

describe("writeConfig (json)", () => {
  it("creates a new file when it does not exist", async () => {
    const filePath = path.join(tmpDir, "settings.json");
    const config = { mcpServers: { agentsid: { command: "npx" } } };
    await writeConfig(filePath, config, "json");
    const written = JSON.parse(fs.readFileSync(filePath, "utf8"));
    expect(written.mcpServers.agentsid.command).toBe("npx");
  });

  it("creates parent directories automatically", async () => {
    const filePath = path.join(tmpDir, "deep", "nested", "settings.json");
    await writeConfig(filePath, { key: "val" }, "json");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("merges with existing JSON file, preserving existing keys", async () => {
    const filePath = path.join(tmpDir, "settings.json");
    const existing = {
      otherSetting: true,
      mcpServers: { preExisting: { command: "node" } },
    };
    fs.writeFileSync(filePath, JSON.stringify(existing), "utf8");

    const addition = {
      mcpServers: { agentsid: { command: "npx", args: ["-y", "@agentsid/guard"] } },
    };
    await writeConfig(filePath, addition, "json");

    const result = JSON.parse(fs.readFileSync(filePath, "utf8"));
    expect(result.otherSetting).toBe(true);
    expect(result.mcpServers.preExisting).toBeDefined();
    expect(result.mcpServers.agentsid.command).toBe("npx");
  });

  it("writes valid JSON (parseable)", async () => {
    const filePath = path.join(tmpDir, "settings.json");
    await writeConfig(filePath, { a: 1 }, "json");
    expect(() => JSON.parse(fs.readFileSync(filePath, "utf8"))).not.toThrow();
  });

  it("throws on corrupted existing JSON file", async () => {
    const filePath = path.join(tmpDir, "bad.json");
    fs.writeFileSync(filePath, "{ not valid json", "utf8");
    await expect(writeConfig(filePath, { a: 1 }, "json")).rejects.toThrow();
  });
});

// ─── writeConfig — TOML ──────────────────────────────────────────────────────

describe("writeConfig (toml)", () => {
  const tomlConfig = {
    mcp_servers: {
      agentsid: {
        command: "npx",
        args: ["-y", "@agentsid/guard"],
        env: {
          AGENTSID_PROJECT_KEY: "key-123",
          AGENTSID_AGENT_TOKEN: "tok-456",
        },
      },
    },
  };

  it("creates a new TOML file", async () => {
    const filePath = path.join(tmpDir, "config.toml");
    await writeConfig(filePath, tomlConfig, "toml");
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain("[mcp_servers.agentsid]");
  });

  it("creates parent directories for TOML file", async () => {
    const filePath = path.join(tmpDir, "sub", "config.toml");
    await writeConfig(filePath, tomlConfig, "toml");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("writes env vars into TOML", async () => {
    const filePath = path.join(tmpDir, "config.toml");
    await writeConfig(filePath, tomlConfig, "toml");
    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain('AGENTSID_PROJECT_KEY = "key-123"');
  });
});
