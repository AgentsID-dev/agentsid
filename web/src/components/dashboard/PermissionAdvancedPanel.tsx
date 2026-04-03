// --- Permission Advanced Panel ---
// Expanded panel sections for advanced permission rule fields

import { useState, useCallback, useRef } from "react";
import type { PermissionRule } from "./types";

// --- Shared small components ---

function SectionHeader({ children }: { readonly children: string }) {
  return (
    <h4 className="text-xs uppercase text-muted-foreground tracking-wider font-medium mb-2">
      {children}
    </h4>
  );
}

function SmallLabel({ children }: { readonly children: string }) {
  return (
    <label className="text-xs text-muted-foreground whitespace-nowrap">
      {children}
    </label>
  );
}

function NumInput({
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  readonly value: number | undefined;
  readonly onChange: (v: number | undefined) => void;
  readonly placeholder?: string;
  readonly min?: number;
  readonly max?: number;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? undefined : Number(raw));
      }}
      placeholder={placeholder}
      min={min}
      max={max}
      className="w-20 bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/10 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

function SmallSelect({
  value,
  onChange,
  options,
}: {
  readonly value: string | undefined;
  readonly onChange: (v: string) => void;
  readonly options: readonly { readonly value: string; readonly label: string }[];
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
    >
      <option value="">--</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-8 h-[18px] rounded-full border-none cursor-pointer transition-colors ${
        checked ? "bg-primary" : "bg-border"
      }`}
    >
      <div
        className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${
          checked ? "left-[15px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  readonly tags: readonly string[];
  readonly onChange: (tags: readonly string[]) => void;
  readonly placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (raw: string) => {
      const val = raw.trim();
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      setInput("");
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-0.5 text-[11px] font-mono"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 p-0 bg-transparent border-none text-primary/60 hover:text-primary cursor-pointer text-xs leading-none"
          >
            {"\u2715"}
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
          }
        }}
        onBlur={() => {
          if (input.trim()) addTag(input);
        }}
        placeholder={placeholder}
        className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-xs text-foreground py-0.5 placeholder:text-muted-foreground/50"
      />
    </div>
  );
}

// --- Day checkboxes ---

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function DayCheckboxes({
  selected,
  onChange,
}: {
  readonly selected: readonly string[];
  readonly onChange: (days: readonly string[]) => void;
}) {
  const toggle = (day: string) => {
    onChange(
      selected.includes(day)
        ? selected.filter((d) => d !== day)
        : [...selected, day],
    );
  };

  return (
    <div className="flex gap-1">
      {DAYS.map((day) => (
        <button
          key={day}
          type="button"
          onClick={() => toggle(day)}
          className={`px-1.5 py-0.5 text-[10px] rounded border cursor-pointer transition-colors ${
            selected.includes(day)
              ? "bg-primary/20 border-primary/40 text-primary font-semibold"
              : "bg-transparent border-border text-muted-foreground hover:border-primary/30"
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  );
}

// --- Data level checkboxes ---

const DATA_LEVELS = ["public", "internal", "confidential", "restricted"] as const;

function DataLevelCheckboxes({
  selected,
  onChange,
}: {
  readonly selected: readonly string[];
  readonly onChange: (levels: readonly string[]) => void;
}) {
  const toggle = (level: string) => {
    onChange(
      selected.includes(level)
        ? selected.filter((l) => l !== level)
        : [...selected, level],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DATA_LEVELS.map((level) => (
        <label key={level} className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={selected.includes(level)}
            onChange={() => toggle(level)}
            className="accent-primary w-3 h-3 cursor-pointer"
          />
          <span className="text-xs text-foreground capitalize">{level}</span>
        </label>
      ))}
    </div>
  );
}

// --- Timezone options ---

const TIMEZONES = [
  { value: "UTC", label: "UTC" },
  { value: "US/Pacific", label: "US/Pacific" },
  { value: "US/Eastern", label: "US/Eastern" },
  { value: "Europe/London", label: "Europe/London" },
] as const;

const PER_OPTIONS = [
  { value: "second", label: "second" },
  { value: "minute", label: "minute" },
  { value: "hour", label: "hour" },
  { value: "day", label: "day" },
] as const;

const BUDGET_UNIT_OPTIONS = [
  { value: "usd", label: "usd" },
  { value: "credits", label: "credits" },
  { value: "tokens", label: "tokens" },
] as const;

const BUDGET_PER_OPTIONS = [
  { value: "hour", label: "hour" },
  { value: "day", label: "day" },
  { value: "month", label: "month" },
] as const;

// --- Main Panel ---

interface PermissionAdvancedPanelProps {
  readonly rule: PermissionRule;
  readonly onChange: (patch: Partial<PermissionRule>) => void;
}

function PermissionAdvancedPanel({ rule, onChange }: PermissionAdvancedPanelProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-4">
      {/* Priority */}
      <div className="flex items-center gap-2">
        <SmallLabel>Priority</SmallLabel>
        <NumInput
          value={rule.priority}
          onChange={(v) => onChange({ priority: v })}
          placeholder="0"
          min={0}
        />
      </div>

      {/* Time & Rate */}
      <div>
        <SectionHeader>Time & Rate</SectionHeader>
        <div className="space-y-2.5">
          {/* Schedule */}
          <div className="flex flex-wrap items-center gap-2">
            <SmallLabel>Hours</SmallLabel>
            <NumInput
              value={rule.schedule?.hours_start}
              onChange={(v) =>
                onChange({ schedule: { ...rule.schedule, hours_start: v } })
              }
              placeholder="0"
              min={0}
              max={23}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <NumInput
              value={rule.schedule?.hours_end}
              onChange={(v) =>
                onChange({ schedule: { ...rule.schedule, hours_end: v } })
              }
              placeholder="23"
              min={0}
              max={23}
            />
            <SmallLabel>TZ</SmallLabel>
            <SmallSelect
              value={rule.schedule?.timezone}
              onChange={(v) =>
                onChange({
                  schedule: { ...rule.schedule, timezone: v || undefined },
                })
              }
              options={TIMEZONES}
            />
          </div>
          <div className="flex items-center gap-2">
            <SmallLabel>Days</SmallLabel>
            <DayCheckboxes
              selected={rule.schedule?.days ?? []}
              onChange={(days) =>
                onChange({
                  schedule: {
                    ...rule.schedule,
                    days: days.length > 0 ? days : undefined,
                  },
                })
              }
            />
          </div>

          {/* Rate limit */}
          <div className="flex items-center gap-2">
            <SmallLabel>Rate Limit</SmallLabel>
            <NumInput
              value={rule.rate_limit?.max}
              onChange={(v) =>
                onChange({ rate_limit: { ...rule.rate_limit, max: v } })
              }
              placeholder="max"
              min={1}
            />
            <SmallLabel>per</SmallLabel>
            <SmallSelect
              value={rule.rate_limit?.per}
              onChange={(v) =>
                onChange({
                  rate_limit: { ...rule.rate_limit, per: v || undefined },
                })
              }
              options={PER_OPTIONS}
            />
          </div>

          {/* Cooldown */}
          <div className="flex items-center gap-2">
            <SmallLabel>Cooldown</SmallLabel>
            <NumInput
              value={rule.cooldown?.seconds}
              onChange={(v) => onChange({ cooldown: v != null ? { seconds: v } : undefined })}
              placeholder="seconds"
              min={0}
            />
            <span className="text-xs text-muted-foreground">sec</span>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div>
        <SectionHeader>Access Control</SectionHeader>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <SmallLabel>Data Level</SmallLabel>
            <DataLevelCheckboxes
              selected={rule.data_level ?? []}
              onChange={(levels) =>
                onChange({ data_level: levels.length > 0 ? levels : undefined })
              }
            />
          </div>

          <div>
            <SmallLabel>IP Allowlist</SmallLabel>
            <div className="mt-1 border border-border rounded-md px-2 py-1 bg-background">
              <TagInput
                tags={[
                  ...(rule.ip_allowlist?.ips ?? []),
                  ...(rule.ip_allowlist?.cidrs ?? []),
                ]}
                onChange={(all) => {
                  const cidrs = all.filter((v) => v.includes("/"));
                  const ips = all.filter((v) => !v.includes("/"));
                  onChange({
                    ip_allowlist:
                      cidrs.length > 0 || ips.length > 0
                        ? {
                            cidrs: cidrs.length > 0 ? cidrs : undefined,
                            ips: ips.length > 0 ? ips : undefined,
                          }
                        : undefined,
                  });
                }}
                placeholder="IP or CIDR..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SmallLabel>Risk Score Threshold</SmallLabel>
            <NumInput
              value={rule.risk_score_threshold}
              onChange={(v) => onChange({ risk_score_threshold: v })}
              placeholder="1-100"
              min={1}
              max={100}
            />
          </div>

          <div className="flex items-center gap-2">
            <SmallLabel>Requires Approval</SmallLabel>
            <Toggle
              checked={rule.requires_approval ?? false}
              onChange={(v) => onChange({ requires_approval: v || undefined })}
            />
          </div>
        </div>
      </div>

      {/* Chain & Session */}
      <div>
        <SectionHeader>Chain & Session</SectionHeader>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <SmallLabel>Max Chain Depth</SmallLabel>
            <NumInput
              value={rule.max_chain_depth}
              onChange={(v) => onChange({ max_chain_depth: v })}
              placeholder="depth"
              min={1}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SmallLabel>Session Max Duration</SmallLabel>
            <NumInput
              value={rule.session_limits?.max_duration_minutes}
              onChange={(v) =>
                onChange({
                  session_limits: {
                    ...rule.session_limits,
                    max_duration_minutes: v,
                  },
                })
              }
              placeholder="min"
              min={1}
            />
            <SmallLabel>Max Idle</SmallLabel>
            <NumInput
              value={rule.session_limits?.max_idle_minutes}
              onChange={(v) =>
                onChange({
                  session_limits: {
                    ...rule.session_limits,
                    max_idle_minutes: v,
                  },
                })
              }
              placeholder="min"
              min={1}
            />
            <SmallLabel>Max Calls</SmallLabel>
            <NumInput
              value={rule.session_limits?.max_calls}
              onChange={(v) =>
                onChange({
                  session_limits: { ...rule.session_limits, max_calls: v },
                })
              }
              placeholder="calls"
              min={1}
            />
          </div>
        </div>
      </div>

      {/* Behavioral */}
      <div>
        <SectionHeader>Behavioral</SectionHeader>
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SmallLabel>Sequence: requires prior tools</SmallLabel>
            </div>
            <div className="border border-border rounded-md px-2 py-1 bg-background">
              <TagInput
                tags={rule.sequence_requirements?.requires_prior ?? []}
                onChange={(tools) =>
                  onChange({
                    sequence_requirements:
                      tools.length > 0 ||
                      rule.sequence_requirements?.within_seconds != null
                        ? {
                            ...rule.sequence_requirements,
                            requires_prior:
                              tools.length > 0 ? tools : undefined,
                          }
                        : undefined,
                  })
                }
                placeholder="tool name..."
              />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <SmallLabel>within</SmallLabel>
              <NumInput
                value={rule.sequence_requirements?.within_seconds}
                onChange={(v) =>
                  onChange({
                    sequence_requirements: {
                      ...rule.sequence_requirements,
                      within_seconds: v,
                    },
                  })
                }
                placeholder="sec"
                min={1}
              />
              <span className="text-xs text-muted-foreground">seconds</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SmallLabel>Budget</SmallLabel>
            <NumInput
              value={rule.budget?.max}
              onChange={(v) =>
                onChange({ budget: { ...rule.budget, max: v } })
              }
              placeholder="max"
              min={0}
            />
            <SmallSelect
              value={rule.budget?.unit}
              onChange={(v) =>
                onChange({
                  budget: { ...rule.budget, unit: v || undefined },
                })
              }
              options={BUDGET_UNIT_OPTIONS}
            />
            <SmallLabel>per</SmallLabel>
            <SmallSelect
              value={rule.budget?.per}
              onChange={(v) =>
                onChange({
                  budget: { ...rule.budget, per: v || undefined },
                })
              }
              options={BUDGET_PER_OPTIONS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export { PermissionAdvancedPanel };
