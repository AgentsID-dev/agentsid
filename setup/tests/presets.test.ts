import { describe, it, expect } from "vitest";
import { developerPreset } from "../src/presets/developer.js";
import { securityTeamPreset } from "../src/presets/security-team.js";
import { lockdownPreset } from "../src/presets/lockdown.js";
import type { PolicyPreset, PolicyRule } from "../src/presets/types.js";

function hasRule(rules: readonly PolicyRule[], pattern: string, action: "allow" | "deny"): boolean {
  return rules.some((r) => r.toolPattern === pattern && r.action === action);
}

describe("Developer preset", () => {
  it("has a name and description", () => {
    expect(developerPreset.name).toBe("Developer");
    expect(developerPreset.description).toBeTruthy();
  });

  it("denies dangerous shell commands", () => {
    expect(hasRule(developerPreset.rules, "shell.danger.*", "deny")).toBe(true);
  });

  it("denies credential file access", () => {
    const credDeny = developerPreset.rules.find(
      (r) => r.action === "deny" && r.toolPattern.includes(".env")
    );
    expect(credDeny).toBeTruthy();
  });

  it("allows everything else with wildcard", () => {
    expect(hasRule(developerPreset.rules, "*", "allow")).toBe(true);
  });

  it("has deny rules with higher priority than allow", () => {
    const denyPriorities = developerPreset.rules
      .filter((r) => r.action === "deny")
      .map((r) => r.priority);
    const allowPriorities = developerPreset.rules
      .filter((r) => r.action === "allow")
      .map((r) => r.priority);
    const minDeny = Math.min(...denyPriorities);
    const maxAllow = Math.max(...allowPriorities);
    expect(minDeny).toBeGreaterThan(maxAllow);
  });
});

describe("Security Team preset", () => {
  it("denies shell execution except reads", () => {
    expect(hasRule(securityTeamPreset.rules, "shell.write.*", "deny")).toBe(true);
    expect(hasRule(securityTeamPreset.rules, "shell.danger.*", "deny")).toBe(true);
    expect(hasRule(securityTeamPreset.rules, "shell.admin.*", "deny")).toBe(true);
  });

  it("requires approval for file writes", () => {
    const writeRule = securityTeamPreset.rules.find(
      (r) => r.toolPattern === "file.write" && r.action === "allow"
    );
    expect(writeRule?.requiresApproval).toBe(true);
  });

  it("allows read operations", () => {
    expect(hasRule(securityTeamPreset.rules, "shell.read.*", "allow")).toBe(true);
  });
});

describe("Lockdown preset", () => {
  it("denies everything by default", () => {
    expect(hasRule(lockdownPreset.rules, "*", "deny")).toBe(true);
  });

  it("only allows reads and search", () => {
    const allowRules = lockdownPreset.rules.filter((r) => r.action === "allow");
    expect(allowRules.length).toBeLessThanOrEqual(8);
    for (const rule of allowRules) {
      expect(
        rule.toolPattern.includes("read") || rule.toolPattern.includes("search") || rule.toolPattern.includes("list") || rule.toolPattern.includes("info") || rule.toolPattern.includes("get")
      ).toBe(true);
    }
  });
});
