import React, { useState } from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";

interface Props {
  readonly onSelect: (projectDir: string) => void;
}

interface SelectItem {
  readonly label: string;
  readonly value: string;
}

export function HookPathStep({ onSelect }: Props): React.ReactElement {
  const [mode, setMode] = useState<"choose" | "custom">("choose");
  const [customPath, setCustomPath] = useState("");
  const cwd = process.cwd();

  const items: SelectItem[] = [
    { label: `Current directory (${cwd})`, value: cwd },
    { label: "Enter a custom path", value: "__custom__" },
  ];

  function handleSelect(item: SelectItem): void {
    if (item.value === "__custom__") {
      setMode("custom");
    } else {
      onSelect(item.value);
    }
  }

  function handleCustomSubmit(value: string): void {
    const resolved = value.startsWith("~")
      ? value.replace("~", process.env.HOME || "")
      : value;
    onSelect(resolved);
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 2/5 — Project Directory
      </Text>
      <Text color="gray">
        Where should AgentsID protect? The PreToolUse hook will be installed{" "}
        in this project's <Text color="white">.claude/settings.json</Text>.
      </Text>
      {mode === "choose" ? (
        <SelectInput items={items} onSelect={handleSelect} />
      ) : (
        <Box flexDirection="row" gap={1}>
          <Text color="cyan">Path:</Text>
          <TextInput
            value={customPath}
            onChange={setCustomPath}
            onSubmit={handleCustomSubmit}
            placeholder="/path/to/your/project"
          />
        </Box>
      )}
    </Box>
  );
}
