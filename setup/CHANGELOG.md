# Changelog

All notable changes to `@agentsid/setup` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.1] — 2026-04-20

### Fixed
- **Codex no longer refuses to boot when `@agentsid/guard` can't start.** 0.2.0 set `required = true` on the guard MCP server, which was correct posture for a known-good guard package — but `@agentsid/guard` has never actually been published to npm. Every 0.2.0 Codex user hit `Error: thread/start failed during TUI bootstrap` because Codex dutifully failed-closed on the MCP's `npm 404 Not Found`. Flipping to `required = false` restores boot; the kernel sandbox (`sandbox_mode = "workspace-write"` + `network_access = false`) is still active and still Codex's primary enforcement layer. This matches how Cursor and Claude Code already handle the same failure mode — red MCP badge, app still runs.

### Notes
- Cursor and Claude Code users were also receiving an MCP config pointing at the unpublished package. It silently failed on those platforms (no `required` field) so they just saw a red agentsid-MCP badge and kept running — losing only the guard-MCP tool surface, not the hook-based enforcement which is the primary mechanism on those platforms.
- The real fix is to actually publish `@agentsid/guard`. Tracking as a separate deliverable: the package exists at `mcp-shell-guard/` in the monorepo (name = `@agentsid/guard`, v0.1.0) but needs audit + tests + publish workflow before going live.

## [0.2.0] — 2026-04-20

Minor version bump — Codex promoted from "in testing" to stable. Three of five supported platforms now ship with real enforcement; the multi-provider story holds.

### Added
- **Codex kernel-sandbox is now written, not just recommended.** Previous versions' wizard printed a recommendation that the user manually set `sandbox_mode = "workspace-write"` with `network_access = false` in `~/.codex/config.toml`. Every user who skimmed the output missed that — Codex's primary enforcement layer stayed off. 0.2.0 writes both directly into `config.toml`:
  - `sandbox_mode = "workspace-write"` (top-level scalar — kernel-level, blocks system paths + privilege escalation)
  - `[sandbox_workspace_write] network_access = false` (nested table — blocks outbound network from inside the sandbox)
- `serializeToml` now handles top-level scalars and generic `[table]` sections, not just `[mcp_servers.<name>]`. Booleans serialise as native TOML bools; arrays serialise correctly. Six new test cases pin this behaviour.
- Codex integration tests for the new sandbox-config output (4 new cases).

### Changed
- Codex platform promoted from "(in testing)" to stable in both the wizard's platform picker ([src/steps/platform.tsx](setup/src/steps/platform.tsx)) and the README support matrix. Three of five platforms now stable: Claude Code, Cursor, Codex.
- Codex integration instructions rewritten — no longer says "also set this manually" since the wizard now sets it. Still documents the network-access override for workflows that genuinely need outbound HTTP.

### Notes
- Codex hooks remain opt-in and experimental behind `enableCodexHooks`. Hook parity with Cursor's adapter pattern is deferred; the sandbox + guard MCP combo reaches stable-grade enforcement without it.
- Existing agents created by 0.1.x wizards will NOT automatically pick up the sandbox config — users who want the sandbox enabled should re-run the wizard so a fresh `~/.codex/config.toml` gets written.

## [0.1.6] — 2026-04-20

### Added
- **Block SSH private key reads.** New `DENY_SSH_KEY` rule (`file.read[ssh_key]`) in both the Developer and Security-Team presets, gated on the canonical private-key filenames (`id_rsa`, `id_ed25519`, `id_ecdsa`, `id_dsa`). Public keys (`id_rsa.pub` etc.) still fall through to normal reads. Classifier already emits the matching `file.read[ssh_key]` tag (shipped in the 0.1.3 server deploy), so no server change needed.
- **Block PFX / P12 cert bundle reads.** New `DENY_PFX_FILE` rule (`file.read[*.pfx]`) added alongside the existing `.pem` / `.key` denies. PFX/P12 files usually contain a private key alongside the cert chain, so belong in the same sensitivity class.
- New wizard toggle `credentials.ssh` — defaults ON — lets users opt out of the SSH-key block if they really need agents to read private keys (don't).

### Changed
- `credentials.pem` toggle label and description now reflect the broader PFX/P12 coverage.

## [0.1.5] — 2026-04-20

### Fixed
- **Developer and security-team presets now cover every `.env*` variant.** The deny rule for `file.read[.env]` previously shipped with `conditions: { path_pattern: ".env" }` — an exact match. Reading `.env.local`, `.env.production`, `.env.staging`, `.env.test`, or any other `.env.*` variant fell through to the `*` allow fallback, even though those files typically hold the most sensitive secrets. The rule now uses `conditions: { path_pattern: [".env", ".env.*"] }` which is glob-matched server-side against the file_path.
- No client-side behaviour change required — the condition loop in `server/src/services/permission.py::_matches_conditions` already handles list-of-patterns in its `path_pattern` special case (shipped 2026-04-20).

## [0.1.4] — 2026-04-20

### Changed
- Cursor integration promoted from "in testing" to stable. Live-verified in 0.1.3 end-to-end against `api.agentsid.dev` with real Cursor 1.7+ hooks: `beforeShellExecution` / `beforeMCPExecution` / `beforeReadFile` all fire with correct protocol, deny reasons surface in Cursor's UI, and `agent_message` reaches the LLM. README and platform selector in the wizard both updated — the "Cursor (in testing)" label is gone.

## [0.1.3] — 2026-04-20

### Fixed
- **Cursor integration now actually enforces policy.** Previously the wizard emitted a `hooks.json` that pointed at Claude Code's `pre-tool.sh`, which silently no-oped on Cursor in three ways: (a) it emitted Claude-Code-format decisions (`hookSpecificOutput.permissionDecision`) that Cursor ignores in favour of `{"permission":"deny","user_message","agent_message"}`; (b) it expected `tool_name` in stdin, which `beforeShellExecution` and `beforeReadFile` don't provide, so the script bailed out allow on every shell exec and file read; (c) credentials were parked on a `sessionStart` entry's `env` field, which Cursor does not read — env only flows from `sessionStart` hook stdout. Every deny was silently dropped. Users who installed 0.1.2 on Cursor had zero enforcement.

### Added
- `cursor-adapter.sh` — single script with `shell`/`mcp`/`read`/`audit` sub-commands that translates Cursor's per-event stdin shapes into `/validate` calls and emits Cursor-format permission decisions. Sources credentials from `~/.agentsid/cursor-env.json` (chmod 600).
- `~/.agentsid/cursor-env.json` — global, mode-600 credential file used by the Cursor adapter.
- `IntegrationOptions` for per-wizard toggles (`enableCodexHooks`, `enableCursorPermissions`), default OFF.
- `PlatformIntegration.additionalFiles()` — integrations can now emit sibling config files (hooks.json, env files, permissions.json) alongside the primary config, with optional POSIX `mode` for secret files.
- Codex: mark AgentsID MCP server as `required = true` with startup/tool timeouts so Codex surfaces guard failures instead of silently running unguarded.
- Codex: opt-in `enableCodexHooks` flag emits an experimental Bash-only `hooks.json`. Off by default because Codex hooks are still experimental.
- Codex: setup instructions now mention the `sandbox_mode = "workspace-write"` + `network_access = false` recommendation — that's Codex's own primary enforcement layer.
- 11 new integration tests that spawn `cursor-adapter.sh` against a real HTTP mock, locking down the Cursor protocol contract (deny shape, stdin fields per event, env loading, fail-open on network error, injection safety on deny reason).

### Changed
- Cursor `hooks.json` now registers `beforeShellExecution`, `beforeMCPExecution`, `beforeReadFile`, and the three `after*` audit hooks. No longer registers `preToolUse` (redundant with the before-specific hooks) or `sessionStart` (its env-injection trick didn't work).

## [0.1.2] — 2026-04-15

### Fixed
- Claude Code integration now writes `AGENTSID_PROJECT_KEY`, `AGENTSID_AGENT_TOKEN`, `AGENTSID_AGENT_ID`, and `AGENTSID_API_URL` into the **top-level `env` block** of `.claude/settings.json`, not just `mcpServers.agentsid.env`. The PreToolUse hook reads from the top-level env block (that's where Claude Code injects hook-process environment). Previously, the hook would exit silently on every invocation because those vars were absent — effectively making AgentsID a no-op after setup.
- `IntegrationConfig` now carries optional `agentId` and `apiUrl` so the integration can populate the full env block.

## [0.1.1] — 2026-04-15

### Fixed
- Hook shell scripts (`pre-tool.sh`, `post-tool.sh`) were not bundled into `dist/` during build, causing `installHook()` to fail with "Hook source file not found" when installed from the published tarball. Build now copies `src/hook/*.sh` into `dist/hook/`.

## [0.1.0] — 2026-04-15

### Added
- Initial release. Interactive Ink-based CLI wizard.
- 5-step flow: platform → auth → persona → policies → hook install.
- Three built-in presets: Developer, Security Team, Lockdown.
- Claude Code integration (stable). Cursor/Codex/Gemini/local model (in testing).
- Installs `pre-tool.sh` with:
  - `/api/v1/validate` gating for every tool call
  - `/api/v1/agents/derive` on subagent (Agent/Task) spawn
  - Just-in-time child token derivation with local cache for real-time per-subagent enforcement
  - Shell-injection-safe stdin handling
- npm provenance attestations on every published version.

[Unreleased]: https://github.com/AgentsID-dev/agentsid/compare/setup-v0.1.0...HEAD
[0.1.0]: https://github.com/AgentsID-dev/agentsid/releases/tag/setup-v0.1.0
