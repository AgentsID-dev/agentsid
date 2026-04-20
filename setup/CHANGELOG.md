# Changelog

All notable changes to `@agentsid/setup` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
