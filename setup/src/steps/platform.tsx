import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

export type Platform =
  | "claude-code"
  | "cursor"
  | "codex"
  | "gemini"
  | "local-model";

interface Props {
  readonly onSelect: (platform: Platform) => void;
}

interface SelectItem {
  readonly label: string;
  readonly value: Platform;
}

const ITEMS: SelectItem[] = [
  { label: "Claude Code", value: "claude-code" },
  { label: "Cursor", value: "cursor" },
  { label: "Codex (OpenAI)", value: "codex" },
  { label: "Gemini CLI", value: "gemini" },
  { label: "Local Model", value: "local-model" },
];

export function PlatformStep({ onSelect }: Props): React.ReactElement {
  function handleSelect(item: SelectItem): void {
    onSelect(item.value);
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 1/5 — Platform
      </Text>
      <Text color="gray">Which AI coding assistant are you securing?</Text>
      <SelectInput items={ITEMS} onSelect={handleSelect} />
    </Box>
  );
}
