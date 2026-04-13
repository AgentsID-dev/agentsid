import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { PolicyRule } from "../presets/types.js";
import { toApiRules } from "../engine.js";
import { writeConfig } from "../config-writer.js";
import { installHook } from "../hook/install.js";
import { claudeCodeIntegration } from "../integrations/claude-code.js";
import { cursorIntegration } from "../integrations/cursor.js";
import { codexIntegration } from "../integrations/codex.js";
import { geminiIntegration } from "../integrations/gemini.js";
import { localModelIntegration } from "../integrations/local-model.js";
import type { Platform } from "./platform.js";

const INTEGRATIONS = {
  "claude-code": claudeCodeIntegration,
  cursor: cursorIntegration,
  codex: codexIntegration,
  gemini: geminiIntegration,
  "local-model": localModelIntegration,
} as const;

const PLATFORM_NAMES: Record<Platform, string> = {
  "claude-code": "claude-code-agent",
  cursor: "cursor-agent",
  codex: "codex-agent",
  gemini: "gemini-agent",
  "local-model": "local-model-agent",
};

interface StepStatus {
  readonly label: string;
  readonly state: "pending" | "running" | "done" | "error";
  readonly error?: string;
}

interface Props {
  readonly apiKey: string;
  readonly apiUrl: string;
  readonly platform: Platform;
  readonly rules: readonly PolicyRule[];
}

interface AgentCreateResponse {
  readonly agent: { readonly id: string };
  readonly token?: string;
}

async function createAgent(
  apiUrl: string,
  apiKey: string,
  platform: Platform,
): Promise<AgentCreateResponse> {
  const resp = await fetch(`${apiUrl}/api/v1/agents/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: PLATFORM_NAMES[platform],
      on_behalf_of: "setup-cli",
      ttl_hours: 720,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to register agent (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<AgentCreateResponse>;
}

async function applyPermissions(
  apiUrl: string,
  apiKey: string,
  agentId: string,
  rules: readonly PolicyRule[],
): Promise<void> {
  const apiRules = toApiRules(rules);
  const resp = await fetch(`${apiUrl}/api/v1/agents/${agentId}/permissions`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(apiRules),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Failed to apply permissions (${resp.status}): ${text}`);
  }
}

export function LaunchStep({
  apiKey,
  apiUrl,
  platform,
  rules,
}: Props): React.ReactElement {
  const [steps, setSteps] = useState<readonly StepStatus[]>([
    { label: "Registering agent", state: "pending" },
    { label: "Applying policy rules", state: "pending" },
    { label: "Writing platform config", state: "pending" },
    { label: "Installing PostToolUse hook", state: "pending" },
  ]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);

  function updateStep(
    index: number,
    update: Partial<StepStatus>,
  ): void {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...update } : s)),
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      // Step 0: Register agent
      updateStep(0, { state: "running" });
      let agent: AgentCreateResponse;
      try {
        agent = await createAgent(apiUrl, apiKey, platform);
        if (cancelled) return;
        setAgentId(agent.agent.id);
        updateStep(0, { state: "done" });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        updateStep(0, { state: "error", error: msg });
        setFatalError(msg);
        return;
      }

      // Step 1: Apply permissions
      updateStep(1, { state: "running" });
      try {
        await applyPermissions(apiUrl, apiKey, agent.agent.id, rules);
        if (cancelled) return;
        updateStep(1, { state: "done" });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        updateStep(1, { state: "error", error: msg });
        setFatalError(msg);
        return;
      }

      // Step 2: Write platform config
      updateStep(2, { state: "running" });
      try {
        const integration = INTEGRATIONS[platform];
        const agentToken = agent.token ?? agent.agent.id;
        const config = integration.generateConfig({ apiKey, agentToken, scope: "global" });
        const configPath = integration.configPath("global");
        if (configPath) {
          await writeConfig(configPath, config, integration.configFormat);
        }
        if (cancelled) return;
        updateStep(2, { state: "done" });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        updateStep(2, { state: "error", error: msg });
        setFatalError(msg);
        return;
      }

      // Step 3: Install hook (Claude Code only)
      updateStep(3, { state: "running" });
      if (platform === "claude-code") {
        try {
          await installHook();
          if (cancelled) return;
        } catch (err) {
          if (cancelled) return;
          const msg = err instanceof Error ? err.message : String(err);
          updateStep(3, { state: "error", error: msg });
          setFatalError(msg);
          return;
        }
      }
      if (!cancelled) {
        updateStep(3, { state: "done" });
        setDone(true);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiKey, apiUrl, platform, rules]);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 4/4 — Activating
      </Text>
      {steps.map((step, i) => (
        <Box key={i} flexDirection="row" gap={1}>
          {step.state === "running" && (
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
          )}
          {step.state === "done" && <Text color="green">✓</Text>}
          {step.state === "error" && <Text color="red">✗</Text>}
          {step.state === "pending" && <Text color="gray">○</Text>}
          <Text
            color={
              step.state === "done"
                ? "green"
                : step.state === "error"
                ? "red"
                : step.state === "running"
                ? "white"
                : "gray"
            }
          >
            {step.label}
          </Text>
          {step.state === "error" && step.error && (
            <Text color="red"> — {step.error}</Text>
          )}
        </Box>
      ))}
      {fatalError && (
        <Box marginTop={1}>
          <Text color="red">
            Setup failed. Run with AGENTSID_DEBUG=1 for details.
          </Text>
        </Box>
      )}
      {done && (
        <Box flexDirection="column" marginTop={1} gap={1}>
          <Text color="green" bold>
            AgentsID is active!
          </Text>
          {agentId && (
            <Text color="gray">
              Agent ID:{" "}
              <Text color="white">{agentId}</Text>
            </Text>
          )}
          <Text color="gray">
            Dashboard:{" "}
            <Text color="cyan">https://app.agentsid.dev/dashboard</Text>
          </Text>
          <Text color="gray" dimColor>
            {INTEGRATIONS[platform].instructions}
          </Text>
        </Box>
      )}
    </Box>
  );
}
