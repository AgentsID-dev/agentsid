// --- Permission Editor ---
// Inline editor for agent permission rules with expandable advanced options

import { useState, useCallback } from "react";
import type { PermissionRule } from "./types";
import { apiFetch } from "./utils";
import { PermissionAdvancedPanel } from "./PermissionAdvancedPanel";

interface PermissionEditorProps {
  readonly agentId: string;
  readonly apiKey: string;
  readonly initialRules: readonly PermissionRule[];
  readonly onSaved: () => void;
}

const PRESETS = ["search_*", "read_*", "save_*", "edit_*", "delete_*"] as const;

const DEFAULT_RULE: PermissionRule = { tool_pattern: "", action: "allow" };

// --- Immutable helpers ---

function updateRuleAt(
  rules: readonly PermissionRule[],
  index: number,
  patch: Partial<PermissionRule>,
): readonly PermissionRule[] {
  return rules.map((r, i) => (i === index ? { ...r, ...patch } : r));
}

function removeRuleAt(
  rules: readonly PermissionRule[],
  index: number,
): readonly PermissionRule[] {
  return rules.filter((_, i) => i !== index);
}

// --- Strip empty optional fields before saving ---

function isEmptyObj(obj: unknown): boolean {
  if (obj == null) return true;
  if (typeof obj !== "object") return false;
  return Object.values(obj as Record<string, unknown>).every(
    (v) => v == null || (Array.isArray(v) && v.length === 0),
  );
}

function cleanRule(rule: PermissionRule): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {
    tool_pattern: rule.tool_pattern.trim(),
    action: rule.action,
  };

  if (rule.priority != null) cleaned.priority = rule.priority;
  if (rule.conditions && Object.keys(rule.conditions).length > 0)
    cleaned.conditions = rule.conditions;
  if (rule.schedule && !isEmptyObj(rule.schedule))
    cleaned.schedule = rule.schedule;
  if (rule.rate_limit && !isEmptyObj(rule.rate_limit))
    cleaned.rate_limit = rule.rate_limit;
  if (rule.data_level && rule.data_level.length > 0)
    cleaned.data_level = rule.data_level;
  if (rule.requires_approval) cleaned.requires_approval = true;
  if (rule.ip_allowlist && !isEmptyObj(rule.ip_allowlist))
    cleaned.ip_allowlist = rule.ip_allowlist;
  if (rule.max_chain_depth != null)
    cleaned.max_chain_depth = rule.max_chain_depth;
  if (rule.budget && !isEmptyObj(rule.budget)) cleaned.budget = rule.budget;
  if (rule.cooldown && !isEmptyObj(rule.cooldown))
    cleaned.cooldown = rule.cooldown;
  if (rule.sequence_requirements && !isEmptyObj(rule.sequence_requirements))
    cleaned.sequence_requirements = rule.sequence_requirements;
  if (rule.session_limits && !isEmptyObj(rule.session_limits))
    cleaned.session_limits = rule.session_limits;
  if (rule.risk_score_threshold != null)
    cleaned.risk_score_threshold = rule.risk_score_threshold;

  return cleaned;
}

// --- Chevron icon ---

function ChevronDown({ open }: { readonly open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// --- Component ---

function PermissionEditor({
  agentId,
  apiKey,
  initialRules,
  onSaved,
}: PermissionEditorProps) {
  const [rules, setRules] = useState<readonly PermissionRule[]>(initialRules);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    readonly type: "success" | "error";
    readonly message: string;
  } | null>(null);

  const isDirty = JSON.stringify(rules) !== JSON.stringify(initialRules);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const handlePatternChange = useCallback(
    (index: number, value: string) => {
      setRules((prev) => updateRuleAt(prev, index, { tool_pattern: value }));
      clearFeedback();
    },
    [clearFeedback],
  );

  const handleActionToggle = useCallback(
    (index: number) => {
      setRules((prev) =>
        updateRuleAt(prev, index, {
          action: prev[index].action === "allow" ? "deny" : "allow",
        }),
      );
      clearFeedback();
    },
    [clearFeedback],
  );

  const handleAdvancedChange = useCallback(
    (index: number, patch: Partial<PermissionRule>) => {
      setRules((prev) => updateRuleAt(prev, index, patch));
      clearFeedback();
    },
    [clearFeedback],
  );

  const handleDelete = useCallback(
    (index: number) => {
      setRules((prev) => removeRuleAt(prev, index));
      setExpandedIndex((prev) => {
        if (prev === index) return null;
        if (prev != null && prev > index) return prev - 1;
        return prev;
      });
      clearFeedback();
    },
    [clearFeedback],
  );

  const handleAddRule = useCallback(() => {
    setRules((prev) => [...prev, DEFAULT_RULE]);
    clearFeedback();
  }, [clearFeedback]);

  const handlePreset = useCallback(
    (pattern: string) => {
      setRules((prev) => [...prev, { ...DEFAULT_RULE, tool_pattern: pattern }]);
      clearFeedback();
    },
    [clearFeedback],
  );

  const handleCancel = useCallback(() => {
    setRules(initialRules);
    setExpandedIndex(null);
    clearFeedback();
  }, [initialRules, clearFeedback]);

  const toggleExpand = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleSave = useCallback(async () => {
    const emptyPatterns = rules.filter((r) => !r.tool_pattern.trim());
    if (emptyPatterns.length > 0) {
      setFeedback({
        type: "error",
        message: "All rules must have a tool pattern",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload = rules.map(cleanRule);

      await apiFetch(`/agents/${agentId}/permissions`, apiKey, {
        method: "PUT",
        body: JSON.stringify({ rules: payload }),
      });

      setFeedback({ type: "success", message: "Permissions saved" });
      setExpandedIndex(null);
      onSaved();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to save permissions";
      setFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }, [rules, agentId, apiKey, onSaved]);

  return (
    <div className="space-y-3">
      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mr-1 self-center">
          Presets
        </span>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => handlePreset(p)}
            className="px-2.5 py-1 text-[11px] font-mono border border-border rounded-full text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors bg-transparent cursor-pointer"
          >
            + {p}
          </button>
        ))}
      </div>

      {/* Rules */}
      {rules.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground text-sm">
          No rules. Add one below or use a preset.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule, i) => {
            const isAllow = rule.action === "allow";
            const isExpanded = expandedIndex === i;
            return (
              <div key={i} className="space-y-0">
                {/* Collapsed row */}
                <div
                  className={`flex items-center gap-2 p-2.5 rounded-lg border border-border bg-background transition-colors ${
                    isAllow ? "border-l-green-500" : "border-l-red-500"
                  } ${isExpanded ? "rounded-b-none" : ""}`}
                  style={{ borderLeftWidth: "3px" }}
                >
                  <input
                    type="text"
                    value={rule.tool_pattern}
                    onChange={(e) => handlePatternChange(i, e.target.value)}
                    placeholder="tool_pattern"
                    className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-sm font-mono text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all min-w-[120px]"
                  />
                  <button
                    onClick={() => handleActionToggle(i)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-semibold text-white border-none cursor-pointer transition-colors shrink-0 ${
                      isAllow
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {isAllow ? "Allow" : "Deny"}
                  </button>
                  <button
                    onClick={() => toggleExpand(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer"
                    title={isExpanded ? "Collapse" : "Advanced options"}
                  >
                    <ChevronDown open={isExpanded} />
                  </button>
                  <button
                    onClick={() => handleDelete(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors bg-transparent border-none cursor-pointer text-sm"
                    title="Remove rule"
                  >
                    {"\u2715"}
                  </button>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
                    <PermissionAdvancedPanel
                      rule={rule}
                      onChange={(patch) => handleAdvancedChange(i, patch)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Rule */}
      <button
        onClick={handleAddRule}
        className="w-full py-2 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors bg-transparent cursor-pointer"
      >
        + Add Rule
      </button>

      {/* Feedback */}
      {feedback && (
        <div
          className={`text-sm px-3 py-2 rounded-lg ${
            feedback.type === "success"
              ? "bg-green-500/10 text-green-600 border border-green-500/20"
              : "bg-red-500/10 text-red-600 border border-red-500/20"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Actions */}
      {isDirty && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary to-blue-500 border-none cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground bg-transparent border border-border cursor-pointer hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export { PermissionEditor };
