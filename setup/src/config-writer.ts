import fs from "fs";
import path from "path";

// ─── Deep merge ──────────────────────────────────────────────────────────────

/**
 * Deep-merge `addition` into `existing`, returning a new object.
 * Existing keys are preserved; `addition` keys are layered on top.
 * At the `mcpServers` level, merging happens server-name-by-server-name so
 * existing servers are not clobbered.
 */
export function mergeJsonConfig(
  existing: Record<string, unknown>,
  addition: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...existing };

  for (const [key, addVal] of Object.entries(addition)) {
    const existVal = result[key];

    if (
      isPlainObject(existVal) &&
      isPlainObject(addVal)
    ) {
      result[key] = mergeJsonConfig(
        existVal as Record<string, unknown>,
        addVal as Record<string, unknown>
      );
    } else {
      result[key] = addVal;
    }
  }

  return result;
}

// ─── TOML serialisation (minimal subset for MCP server blocks) ───────────────

/**
 * Serialise a config object that has the shape:
 * { mcp_servers: { agentsid: { command, args, env: { KEY: VALUE } } } }
 *
 * into a TOML string with the section headers expected by Codex.
 */
export function serializeToml(config: Record<string, unknown>): string {
  const lines: string[] = [];

  const mcpServers = config["mcp_servers"] as
    | Record<string, unknown>
    | undefined;

  if (!mcpServers) {
    throw new Error(
      "serializeToml: config must contain a top-level 'mcp_servers' key"
    );
  }

  for (const [serverName, rawServer] of Object.entries(mcpServers)) {
    const server = rawServer as Record<string, unknown>;

    lines.push(`[mcp_servers.${serverName}]`);

    if (typeof server["command"] === "string") {
      lines.push(`command = ${toTomlString(server["command"])}`);
    }

    if (Array.isArray(server["args"])) {
      const items = (server["args"] as unknown[])
        .map((a) => toTomlString(String(a)))
        .join(", ");
      lines.push(`args = [${items}]`);
    }

    lines.push("");

    const env = server["env"] as Record<string, unknown> | undefined;
    if (env) {
      lines.push(`[mcp_servers.${serverName}.env]`);
      for (const [envKey, envVal] of Object.entries(env)) {
        lines.push(`${envKey} = ${toTomlString(String(envVal))}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function toTomlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// ─── File writer ─────────────────────────────────────────────────────────────

/**
 * Write `config` to `filePath` in the specified format.
 *
 * - JSON: if the file already exists, deep-merges with existing content.
 * - TOML: always writes the serialised output (no merge; TOML files are small
 *         enough that full regeneration is acceptable and avoids TOML-parse deps).
 * - Parent directories are created automatically.
 */
export async function writeConfig(
  filePath: string,
  config: Record<string, unknown>,
  format: "json" | "toml",
  mode?: number
): Promise<void> {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  if (format === "json") {
    let merged = config;

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      let existing: Record<string, unknown>;
      try {
        existing = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new Error(
          `writeConfig: existing file is not valid JSON — ${filePath}`
        );
      }
      merged = mergeJsonConfig(existing, config);
    }

    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + "\n", "utf8");
  } else {
    const toml = serializeToml(config);
    fs.writeFileSync(filePath, toml, "utf8");
  }

  if (mode !== undefined) {
    fs.chmodSync(filePath, mode);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}
