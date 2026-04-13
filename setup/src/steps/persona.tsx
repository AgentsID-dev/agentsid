import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";

export type PersonaName = "developer" | "security-team" | "lockdown";

interface Props {
  readonly onSelect: (persona: PersonaName) => void;
}

interface SelectItem {
  readonly label: string;
  readonly value: PersonaName;
}

const ITEMS: SelectItem[] = [
  {
    label: "Developer — balanced productivity + safety",
    value: "developer",
  },
  {
    label: "Security Team — strict controls with approval gates",
    value: "security-team",
  },
  {
    label: "Lockdown — read-only, deny everything else",
    value: "lockdown",
  },
];

export function PersonaStep({ onSelect }: Props): React.ReactElement {
  function handleSelect(item: SelectItem): void {
    onSelect(item.value);
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 3/5 — Security Profile
      </Text>
      <Text color="gray">Choose the security posture that matches your team:</Text>
      <SelectInput items={ITEMS} onSelect={handleSelect} />
    </Box>
  );
}
