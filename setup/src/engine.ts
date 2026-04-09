import type { PolicyPreset, PolicyRule } from "./presets/types.js";

/**
 * Assemble final rule set from a preset + toggle overrides.
 *
 * How resolution works:
 * 1. Start with the preset's base rules in a Map keyed by (toolPattern, action, conditions).
 * 2. Walk every toggle in every category:
 *    - If the toggle is ON (override or defaultOn), merge its rules into the map.
 *    - If the toggle is OFF, remove its rules from the map.
 * 3. Sort the resulting rules by priority descending and return them.
 *
 * toggleOverrides: { toggleId: boolean } — true = on, false = off.
 * Omitted toggle IDs fall back to their defaultOn value.
 */
export function assembleRules(
  preset: PolicyPreset,
  toggleOverrides: Readonly<Record<string, boolean>>,
): readonly PolicyRule[] {
  const ruleMap = new Map<string, PolicyRule>();

  for (const rule of preset.rules) {
    ruleMap.set(ruleKey(rule), rule);
  }

  for (const category of preset.categories) {
    for (const toggle of category.toggles) {
      const isOn = toggleOverrides[toggle.id] ?? toggle.defaultOn;

      if (isOn) {
        for (const rule of toggle.rules) {
          ruleMap.set(ruleKey(rule), rule);
        }
      } else {
        for (const rule of toggle.rules) {
          ruleMap.delete(ruleKey(rule));
        }
      }
    }
  }

  const rules = [...ruleMap.values()];
  rules.sort((a, b) => b.priority - a.priority);
  return rules;
}

function ruleKey(rule: PolicyRule): string {
  const conditions = rule.conditions ? JSON.stringify(rule.conditions) : "";
  return `${rule.toolPattern}:${rule.action}:${conditions}`;
}

/** API wire format for a single rule. */
export interface ApiRule {
  readonly tool_pattern: string;
  readonly action: "allow" | "deny";
  readonly priority: number;
  readonly conditions: Record<string, unknown> | null;
  readonly requires_approval: boolean;
}

/**
 * Convert internal PolicyRule[] to the format expected by the AgentsID API.
 * Preserves the order of the input array.
 */
export function toApiRules(rules: readonly PolicyRule[]): readonly ApiRule[] {
  return rules.map((r) => ({
    tool_pattern: r.toolPattern,
    action: r.action,
    priority: r.priority,
    conditions: r.conditions ?? null,
    requires_approval: r.requiresApproval ?? false,
  }));
}
