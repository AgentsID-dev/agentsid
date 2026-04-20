export interface IntegrationConfig {
  readonly apiKey: string;
  readonly agentToken: string;
  readonly scope: "global" | "project";
  readonly agentId?: string;
  readonly apiUrl?: string;
}

/**
 * Optional per-wizard-run toggles. All default OFF unless the user explicitly
 * opts in from the wizard UI.
 */
export interface IntegrationOptions {
  /**
   * Codex: emit a sibling `hooks.json` plus flip `[features] codex_hooks = true`
   * in `config.toml`. The Codex hooks surface is experimental and Bash-only as
   * of 2026-04; never emit by default.
   */
  readonly enableCodexHooks?: boolean;

  /**
   * Cursor: emit a `~/.cursor/permissions.json` that pre-authorises the
   * `agentsid:*` MCP tools so the user can skip the per-restart UI toggle.
   */
  readonly enableCursorPermissions?: boolean;
}

/**
 * A sibling file the wizard should write on top of the primary config file.
 *
 * Every platform still has a "primary" config returned by `generateConfig`;
 * hosts like Cursor and Codex also need a sibling `hooks.json`, a
 * `permissions.json`, etc. Those ship as `additionalFiles`, written with the
 * same merge semantics as the primary config (JSON deep-merge, TOML overwrite).
 */
export interface GeneratedFile {
  /** Path to write. Absolute for global scope, relative to cwd for project. */
  readonly path: string;
  readonly format: "json" | "toml";
  readonly content: Record<string, unknown>;
}

export interface PlatformIntegration {
  readonly name: string;
  readonly label: string;
  readonly configPath: (scope: "global" | "project") => string;
  readonly generateConfig: (
    config: IntegrationConfig,
    options?: IntegrationOptions,
  ) => Record<string, unknown>;
  readonly configFormat: "json" | "toml";
  readonly instructions: string;
  /**
   * Sibling files this integration needs. `launch.tsx` iterates the return
   * value after writing the primary config. Optional — platforms that only
   * need a single file can ignore it.
   */
  readonly additionalFiles?: (
    config: IntegrationConfig,
    options?: IntegrationOptions,
  ) => readonly GeneratedFile[];
}
