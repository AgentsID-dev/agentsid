# @agentsid/setup

**Guided setup wizard for [AgentsID](https://agentsid.dev)** — protect your AI coding agent in 2 minutes.

Walks you through picking a platform, choosing a security posture, and installing the AgentsID PreToolUse hook that gates every tool call through the AgentsID policy engine.

## Install

```bash
npx @agentsid/setup
```

Or pin a version:

```bash
npm install -g @agentsid/setup
agentsid-setup
```

## What It Does

The wizard:

1. **Detects your platform** — Claude Code, Cursor, Codex, Gemini, or a local model
2. **Authenticates you** — creates an AgentsID project or uses an existing API key
3. **Chooses a preset** — Developer (allow-most), Security Team (deny-risky), or Lockdown (read-only)
4. **Lets you tune policies** — toggle tool categories (shell, files, network, agents, notebooks)
5. **Installs the hook** — writes the `pre-tool.sh` + `post-tool.sh` hooks and registers them in your platform's settings

Once installed, every tool call from your agent hits `api.agentsid.dev/api/v1/validate` before execution. Deny-first; denials show up in your dashboard at [agentsid.dev/dashboard](https://agentsid.dev/dashboard).

## Supported Platforms

| Platform | Status |
|---|---|
| Claude Code | ✅ Stable |
| Cursor | ✅ Stable |
| Codex CLI | ✅ Stable |
| Gemini CLI | 🧪 In testing |
| Local model | 🧪 In testing |

## Presets

- **Developer** — Allow most tools; deny obviously dangerous shell patterns (`rm -rf /`, credential reads).
- **Security Team** — Deny write/exec outside the project; require approval for network calls; log everything.
- **Lockdown** — Read-only. Only `Read`, `Grep`, `Glob`. Use this when watching an agent you don't fully trust.

Presets can be customized per-project via a `.agentsid/profiles.yaml` file.

## Environment Variables

After install, the wizard writes these to your platform's settings:

| Variable | Purpose |
|---|---|
| `AGENTSID_API_URL` | API endpoint (defaults to `https://api.agentsid.dev`) |
| `AGENTSID_PROJECT_KEY` | Your AgentsID project key (`aid_proj_...`) |
| `AGENTSID_AGENT_ID` | Your agent ID (`agt_...`) |
| `AGENTSID_AGENT_TOKEN` | The agent's token — short-lived, rotatable |

## Development

```bash
git clone https://github.com/AgentsID-dev/agentsid.git
cd agentsid/setup
npm install
npm run dev
```

Tests:

```bash
npm test
```

Build:

```bash
npm run build
```

## Security

This package ships with [npm provenance](https://docs.npmjs.com/generating-provenance-statements) attestations — every published version is cryptographically linked to the GitHub Actions workflow that built it. Verify with:

```bash
npm audit signatures
```

Report vulnerabilities to **security@agentsid.dev**.

## License

[MIT](./LICENSE) © 2026 AgentsID
