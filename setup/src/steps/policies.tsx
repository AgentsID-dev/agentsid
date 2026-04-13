import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { PolicyPreset, PolicyCategory, PolicyToggle } from "../presets/types.js";

interface Props {
  readonly preset: PolicyPreset;
  readonly onComplete: (toggleOverrides: Record<string, boolean>) => void;
}

interface ToggleState {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly enabled: boolean;
}

interface CategoryGroup {
  readonly label: string;
  readonly toggles: readonly ToggleState[];
}

function buildInitialState(preset: PolicyPreset): readonly ToggleState[] {
  return preset.categories.flatMap((cat: PolicyCategory) =>
    cat.toggles.map((t: PolicyToggle) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      enabled: t.defaultOn,
    })),
  );
}

function buildCategoryGroups(
  preset: PolicyPreset,
  toggleStates: readonly ToggleState[],
): readonly CategoryGroup[] {
  const stateById = new Map<string, boolean>(
    toggleStates.map((t) => [t.id, t.enabled]),
  );

  return preset.categories.map((cat: PolicyCategory) => ({
    label: cat.label,
    toggles: cat.toggles.map((t: PolicyToggle) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      enabled: stateById.get(t.id) ?? t.defaultOn,
    })),
  }));
}

export function PoliciesStep({ preset, onComplete }: Props): React.ReactElement {
  const [toggleStates, setToggleStates] = useState<readonly ToggleState[]>(
    () => buildInitialState(preset),
  );
  const [cursor, setCursor] = useState(0);

  const total = toggleStates.length;

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((prev) => (prev - 1 + total) % total);
      return;
    }
    if (key.downArrow) {
      setCursor((prev) => (prev + 1) % total);
      return;
    }
    if (input === " ") {
      setToggleStates((prev) =>
        prev.map((t, i) =>
          i === cursor ? { ...t, enabled: !t.enabled } : t,
        ),
      );
      return;
    }
    if (key.return) {
      const overrides: Record<string, boolean> = {};
      for (const t of toggleStates) {
        overrides[t.id] = t.enabled;
      }
      onComplete(overrides);
    }
  });

  const groups = buildCategoryGroups(preset, toggleStates);

  // Compute flat index for cursor matching
  let flatIndex = 0;

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 4/5 — Fine-Tune Policies
      </Text>
      <Text color="gray">
        Use <Text color="white">↑↓</Text> to navigate,{" "}
        <Text color="white">Space</Text> to toggle,{" "}
        <Text color="white">Enter</Text> to continue
      </Text>
      {groups.map((group) => (
        <Box key={group.label} flexDirection="column">
          <Text bold color="white">
            {group.label}
          </Text>
          {group.toggles.map((toggle) => {
            const isSelected = flatIndex === cursor;
            flatIndex += 1;

            return (
              <Box key={toggle.id} flexDirection="row" gap={1}>
                <Text color={isSelected ? "cyan" : "gray"}>
                  {isSelected ? "❯" : " "}
                </Text>
                <Text color={toggle.enabled ? "green" : "red"}>
                  {toggle.enabled ? "●" : "○"}
                </Text>
                <Box flexDirection="column">
                  <Text color={isSelected ? "white" : "gray"}>
                    {toggle.label}
                  </Text>
                  {isSelected && (
                    <Text color="gray" dimColor>
                      {toggle.description}
                    </Text>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
