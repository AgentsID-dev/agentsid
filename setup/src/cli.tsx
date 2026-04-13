#!/usr/bin/env node
import React, { useState } from "react";
import { render, Box, Text } from "ink";
import { AuthStep } from "./steps/auth.js";
import { PlatformStep } from "./steps/platform.js";
import { HookPathStep } from "./steps/hook-path.js";
import { PersonaStep } from "./steps/persona.js";
import { PoliciesStep } from "./steps/policies.js";
import { LaunchStep } from "./steps/launch.js";
import { assembleRules } from "./engine.js";
import { developerPreset } from "./presets/developer.js";
import { securityTeamPreset } from "./presets/security-team.js";
import { lockdownPreset } from "./presets/lockdown.js";
import type { Platform } from "./steps/platform.js";
import type { PersonaName } from "./steps/persona.js";
import type { PolicyPreset, PolicyRule } from "./presets/types.js";

type WizardStep =
  | "auth"
  | "platform"
  | "hook-path"
  | "persona"
  | "policies"
  | "launch";

interface WizardState {
  readonly step: WizardStep;
  readonly apiKey: string;
  readonly apiUrl: string;
  readonly platform: Platform | null;
  readonly hookProjectDir: string | null;
  readonly persona: PersonaName | null;
  readonly rules: readonly PolicyRule[];
}

const PRESET_MAP: Record<PersonaName, PolicyPreset> = {
  developer: developerPreset,
  "security-team": securityTeamPreset,
  lockdown: lockdownPreset,
};

const BANNER = `
  ____       _     ___ ____
 |  _ \\ ___ | |   |_ _|  _ \\
 | |_) / _ \\| |    | || | | |
 |  _ < (_) | |___ | || |_| |
 |_| \\_\\___/|_____|___|____/

  AgentsID Setup Wizard v0.1
`;

function App(): React.ReactElement {
  const [state, setState] = useState<WizardState>({
    step: "auth",
    apiKey: "",
    apiUrl: "https://api.agentsid.dev",
    platform: null,
    hookProjectDir: null,
    persona: null,
    rules: [],
  });

  function handleAuthComplete(apiKey: string, apiUrl: string): void {
    setState((prev) => ({ ...prev, step: "platform", apiKey, apiUrl }));
  }

  function handlePlatformSelect(platform: Platform): void {
    setState((prev) => ({ ...prev, step: "hook-path", platform }));
  }

  function handleHookPathSelect(hookProjectDir: string): void {
    setState((prev) => ({ ...prev, step: "persona", hookProjectDir }));
  }

  function handlePersonaSelect(persona: PersonaName): void {
    setState((prev) => ({ ...prev, step: "policies", persona }));
  }

  function handlePoliciesComplete(toggleOverrides: Record<string, boolean>): void {
    if (!state.persona) return;
    const preset = PRESET_MAP[state.persona];
    const rules = assembleRules(preset, toggleOverrides);
    setState((prev) => ({ ...prev, step: "launch", rules }));
  }

  const { step, apiKey, apiUrl, platform, hookProjectDir, persona, rules } = state;

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>
        {BANNER}
      </Text>
      {step === "auth" && (
        <AuthStep onComplete={handleAuthComplete} />
      )}
      {step === "platform" && (
        <PlatformStep onSelect={handlePlatformSelect} />
      )}
      {step === "hook-path" && (
        <HookPathStep onSelect={handleHookPathSelect} />
      )}
      {step === "persona" && (
        <PersonaStep onSelect={handlePersonaSelect} />
      )}
      {step === "policies" && persona && (
        <PoliciesStep
          preset={PRESET_MAP[persona]}
          onComplete={handlePoliciesComplete}
        />
      )}
      {step === "launch" && platform && hookProjectDir && (
        <LaunchStep
          apiKey={apiKey}
          apiUrl={apiUrl}
          platform={platform}
          hookProjectDir={hookProjectDir}
          rules={rules}
        />
      )}
    </Box>
  );
}

render(<App />);
