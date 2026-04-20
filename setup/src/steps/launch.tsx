import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import path from "path";
import type { PolicyRule } from "../presets/types.js";
import { toApiRules } from "../engine.js";
import { writeConfig } from "../config-writer.js";
import { installHook, getHookPath } from "../hook/install.js";
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
  readonly hookProjectDir: string;
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
  hookProjectDir,
  rules,
}: Props): React.ReactElement {
  const [steps, setSteps] = useState<readonly StepStatus[]>([
    { label: "Registering agent", state: "pending" },
    { label: "Applying policy rules", state: "pending" },
    { label: "Writing platform config", state: "pending" },
    { label: "Installing hooks", state: "pending" },
    { label: "Activating project protection", state: "pending" },
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
        const integrationInput = {
          apiKey,
          agentToken,
          agentId: agent.agent.id,
          apiUrl,
          scope: "global" as const,
        };
        const config = integration.generateConfig(integrationInput);
        const configPath = integration.configPath("global");
        if (configPath) {
          await writeConfig(configPath, config, integration.configFormat);
        }
        // Sibling files (Cursor hooks.json / permissions.json, Codex
        // hooks.json, etc.). Primary config must land first so any
        // cross-file reference points at an existing primary.
        if (integration.additionalFiles) {
          for (const extra of integration.additionalFiles(integrationInput)) {
            await writeConfig(extra.path, extra.content, extra.format, extra.mode);
          }
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

      // Step 3: Install hook scripts
      updateStep(3, { state: "running" });
      try {
        await installHook();
        if (cancelled) return;
        updateStep(3, { state: "done" });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        updateStep(3, { state: "error", error: msg });
        setFatalError(msg);
        return;
      }

      // Step 4: Write project-level PreToolUse hook config
      updateStep(4, { state: "running" });
      try {
        const preToolPath = getHookPath("pre-tool.sh");
        const projectSettings = path.join(hookProjectDir, ".claude", "settings.json");
        const hookConfig = {
          hooks: {
            PreToolUse: [
              {
                hooks: [
                  {
                    type: "command",
                    command: preToolPath,
                    timeout: 3000,
                  },
                ],
              },
            ],
          },
        };
        await writeConfig(projectSettings, hookConfig, "json");
        if (cancelled) return;
        updateStep(4, { state: "done" });
        setDone(true);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        updateStep(4, { state: "error", error: msg });
        setFatalError(msg);
        return;
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiKey, apiUrl, platform, hookProjectDir, rules]);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold color="cyan">
        Step 5/5 — Activating
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
