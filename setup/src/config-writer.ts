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

// ─── TOML serialisation (minimal subset for MCP server blocks + Codex keys) ──

/**
 * Serialise a config object to TOML. Handles three shapes:
 *
 *   1. Top-level scalars/arrays (must precede any `[table]` header) —
 *        sandbox_mode = "workspace-write"
 *
 *   2. Generic `[table]` sections with scalar values —
 *        [sandbox_workspace_write]
 *        network_access = false
 *
 *   3. The special `mcp_servers.<name>` form that Codex uses —
 *        [mcp_servers.agentsid]
 *        command = "npx"
 *        ...
 *        [mcp_servers.agentsid.env]
 *        KEY = "value"
 *
 * Throws when the config produces no output (guard against silently
 * emitting an empty file). Does NOT support deeply nested non-env tables;
 * add cases here if future integrations need them.
 */
export function serializeToml(config: Record<string, unknown>): string {
  const lines: string[] = [];

  // Pass 1: top-level scalars + arrays must come before any [table] header.
  for (const [key, value] of Object.entries(config)) {
    if (!isPlainObject(value)) {
      lines.push(`${key} = ${serializeTomlValue(value)}`);
    }
  }
  if (lines.length > 0) lines.push("");

  // Pass 2: tables.
  for (const [key, value] of Object.entries(config)) {
    if (!isPlainObject(value)) continue;
    const table = value as Record<string, unknown>;

    if (key === "mcp_servers") {
      // Codex's special form: one sub-table per server, env as sub-sub-table.
      for (const [serverName, rawServer] of Object.entries(table)) {
        emitMcpServerBlock(lines, serverName, rawServer as Record<string, unknown>);
      }
    } else {
      lines.push(`[${key}]`);
      for (const [subKey, subVal] of Object.entries(table)) {
        lines.push(`${subKey} = ${serializeTomlValue(subVal)}`);
      }
      lines.push("");
    }
  }

  if (lines.length === 0) {
    throw new Error("serializeToml: config produced no output");
  }

  return lines.join("\n");
}

function emitMcpServerBlock(
  lines: string[],
  serverName: string,
  server: Record<string, unknown>
): void {
  lines.push(`[mcp_servers.${serverName}]`);
  // Emit scalars/arrays in order; env is a nested sub-table emitted last.
  for (const [key, value] of Object.entries(server)) {
    if (key === "env") continue;
    if (isPlainObject(value)) continue;
    lines.push(`${key} = ${serializeTomlValue(value)}`);
  }
  lines.push("");

  const env = server["env"] as Record<string, unknown> | undefined;
  if (env) {
    lines.push(`[mcp_servers.${serverName}.env]`);
    for (const [envKey, envVal] of Object.entries(env)) {
      lines.push(`${envKey} = ${serializeTomlValue(envVal)}`);
    }
    lines.push("");
  }
}

function serializeTomlValue(value: unknown): string {
  if (typeof value === "string") return toTomlString(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => serializeTomlValue(v)).join(", ")}]`;
  }
  // Fallback: coerce to string. Covers undefined/null/non-serialisable values.
  return toTomlString(String(value));
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
