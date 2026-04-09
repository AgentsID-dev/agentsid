import { describe, it, expect } from "vitest";
import { assembleRules, toApiRules } from "../src/engine.js";
import { developerPreset } from "../src/presets/developer.js";
import type { PolicyRule } from "../src/presets/types.js";

describe("assembleRules", () => {
  it("returns preset rules when no toggles changed", () => {
    const result = assembleRules(developerPreset, {});
    expect(result.length).toBe(developerPreset.rules.length);
  });

  it("adds rules when a default-off toggle is turned on", () => {
    // credentials.env toggle is defaultOn:true, so we verify its rules are present by default
    // Then turn it off and confirm they disappear
    const withDefault = assembleRules(developerPreset, {});
    const hasEnvDeny = withDefault.some(
      (r) => r.toolPattern === "file.read[.env]" && r.action === "deny"
    );
    expect(hasEnvDeny).toBe(true);
  });

  it("removes rules when a default-on toggle is turned off", () => {
    // filesystem.delete toggle (defaultOn: true) adds file.delete deny rule
    const result = assembleRules(developerPreset, { "filesystem.delete": false });
    const hasDeleteDeny = result.some(
      (r) => r.toolPattern === "file.delete" && r.action === "deny"
    );
    expect(hasDeleteDeny).toBe(false);
  });

  it("keeps rules when a default-on toggle stays on explicitly", () => {
    const result = assembleRules(developerPreset, { "filesystem.delete": true });
    const hasDeleteDeny = result.some(
      (r) => r.toolPattern === "file.delete" && r.action === "deny"
    );
    expect(hasDeleteDeny).toBe(true);
  });

  it("removes credential rules when credentials.env toggle is turned off", () => {
    const result = assembleRules(developerPreset, { "credentials.env": false });
    const hasEnvDeny = result.some(
      (r) => r.toolPattern === "file.read[.env]" && r.action === "deny"
    );
    expect(hasEnvDeny).toBe(false);
  });

  it("removes multiple rules when credentials.pem toggle is turned off", () => {
    const result = assembleRules(developerPreset, { "credentials.pem": false });
    const hasPemDeny = result.some(
      (r) => r.toolPattern === "file.read[*.pem]" && r.action === "deny"
    );
    const hasKeyDeny = result.some(
      (r) => r.toolPattern === "file.read[*.key]" && r.action === "deny"
    );
    expect(hasPemDeny).toBe(false);
    expect(hasKeyDeny).toBe(false);
  });

  it("returns rules sorted by priority descending", () => {
    const result = assembleRules(developerPreset, {});
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].priority).toBeGreaterThanOrEqual(result[i].priority);
    }
  });

  it("returns rules sorted by priority descending when some toggles are off", () => {
    const result = assembleRules(developerPreset, {
      "filesystem.delete": false,
      "credentials.env": false,
    });
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].priority).toBeGreaterThanOrEqual(result[i].priority);
    }
  });

  it("does not mutate the preset rules array", () => {
    const originalLength = developerPreset.rules.length;
    assembleRules(developerPreset, { "filesystem.delete": false });
    expect(developerPreset.rules.length).toBe(originalLength);
  });
});

describe("toApiRules", () => {
  it("converts PolicyRule[] to API format", () => {
    const rules: readonly PolicyRule[] = [
      { toolPattern: "shell.danger.*", action: "deny", priority: 100 },
      { toolPattern: "*", action: "allow", priority: 0, requiresApproval: true },
    ];
    const api = toApiRules(rules);
    expect(api[0]).toEqual({
      tool_pattern: "shell.danger.*",
      action: "deny",
      priority: 100,
      conditions: null,
      requires_approval: false,
    });
    expect(api[1]).toEqual({
      tool_pattern: "*",
      action: "allow",
      priority: 0,
      conditions: null,
      requires_approval: true,
    });
  });

  it("includes conditions when present", () => {
    const rules: readonly PolicyRule[] = [
      {
        toolPattern: "file.read[.env]",
        action: "deny",
        priority: 60,
        conditions: { path_pattern: ".env" },
      },
    ];
    const api = toApiRules(rules);
    expect(api[0].conditions).toEqual({ path_pattern: ".env" });
  });

  it("maps tool_pattern from toolPattern", () => {
    const rules: readonly PolicyRule[] = [
      { toolPattern: "db.danger.*", action: "deny", priority: 80 },
    ];
    const api = toApiRules(rules);
    expect(api[0].tool_pattern).toBe("db.danger.*");
  });

  it("defaults requires_approval to false when not set", () => {
    const rules: readonly PolicyRule[] = [
      { toolPattern: "file.read", action: "allow", priority: 10 },
    ];
    const api = toApiRules(rules);
    expect(api[0].requires_approval).toBe(false);
  });

  it("returns empty array for empty input", () => {
    const api = toApiRules([]);
    expect(api).toEqual([]);
  });

  it("preserves order of input rules", () => {
    const rules: readonly PolicyRule[] = [
      { toolPattern: "shell.danger.*", action: "deny", priority: 100 },
      { toolPattern: "db.danger.*", action: "deny", priority: 80 },
      { toolPattern: "*", action: "allow", priority: 0 },
    ];
    const api = toApiRules(rules);
    expect(api[0].tool_pattern).toBe("shell.danger.*");
    expect(api[1].tool_pattern).toBe("db.danger.*");
    expect(api[2].tool_pattern).toBe("*");
  });
});
