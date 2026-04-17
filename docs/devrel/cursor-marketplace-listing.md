# Cursor Marketplace Listing — AgentsID Guard

**Status:** Draft v1 · 2026-04-17
**Submission blocker:** Requires `@agentsid/setup` v0.2 on npm (with the `cursor.ts` + `codex.ts` integration patches) before submission — without that, the "Install" path doesn't work.
**Target surface:** cursor.com/marketplace (listing) + cursor.com/blog/hooks-partners (roster add).

Every stat and claim in this listing is sourced from `scanner/registry-index.json` or `scanner/docs/census-2026/weaponized-by-design.md`. Do not edit numbers without verifying.

---

## 1. Display metadata

| Field | Value |
|---|---|
| **Listing title** | AgentsID Guard |
| **Publisher display** | AgentsID |
| **Publisher slug** | `agentsid` (reserve on first submission) |
| **Package reference** | `@agentsid/guard` (installed via `npx @agentsid/setup --host=cursor`) |
| **Version at launch** | pin to `@agentsid/setup` ≥0.2.0 |
| **License** | MIT |
| **Pricing** | Free (open source) |
| **Homepage** | https://agentsid.dev |
| **Repository** | https://github.com/AgentsID-dev/agentsid |
| **Support** | https://github.com/AgentsID-dev/agentsid/issues |
| **Documentation** | https://agentsid.dev/docs |

## 2. Tagline (≤80 chars — Cursor Marketplace card)

Primary:
> **Identity, permissions, and audit for every MCP server your agent uses.**

Alternates to A/B if character count runs tight:
- "Block malicious MCP servers before they reach your agent." (58)
- "Security guard for MCP. A–F grades for every server." (54)
- "MCP-server security at install time and run time." (50)

## 3. Short description (≤200 chars — search result preview)

> AgentsID Guard intercepts every MCP tool call in Cursor, blocks unsafe ones before they execute, and logs an identity-signed audit trail. Backed by a public registry grading 15,983 MCP servers A–F.

*197 chars.*

## 4. Long description (listing body — markdown)

```markdown
## AgentsID Guard for Cursor

AgentsID is identity, permissions, and audit infrastructure for AI agents. Install the guard and every MCP server your Cursor agent calls is intercepted, checked against your policy, and logged with a cryptographic audit trail.

### What it does

- **Blocks unsafe MCP servers** — Cross-references each tool call against the public AgentsID registry (15,983 servers graded A–F) and refuses calls to servers graded D or F by default.
- **Enforces per-tool permissions** — Destructive, execution, and financial tools require explicit approval. Read-only tools run silently.
- **Signs every action with an agent identity** — Every tool call is attributed to a specific agent token with an `on_behalf_of` chain. No more "the agent did it" mysteries in postmortems.
- **Streams a full audit trail** — Shell commands, file edits, MCP calls, and subagent spawns all land in a tamper-evident log.
- **Runs fully local by default** — No telemetry. No cloud dependency. The registry is cached locally and updated on your schedule.

### What you get the moment you install

1. `.cursor/hooks.json` and `.cursor/mcp.json` emitted by the setup wizard — `failClosed: true` on every security hook, so a hook crash denies rather than defaults to allow.
2. Cross-MCP audit: `beforeMCPExecution` catches every call into every other MCP server you've installed, not just ours.
3. A pre-flight grade check on every MCP server in your config. If you've installed a server that scores F, Cursor will tell you before your agent touches it.
4. An optional `.cursor/rules/agentsid-guard.mdc` that nudges the model away from raw Bash bypasses.

### Why this matters

In our census of 15,983 published MCP servers, 1,332 (8.3%) grade F. Servers with 51+ tools grade F at 94.8%. Some of the worst examples ship tool descriptions that instruct the LLM to hide actions from the user ("secretly adjust", "skip approving", "proceed without confirmation"). When an agent reads one of those descriptions, it treats the instruction as authority. AgentsID Guard is a protocol-level check that runs before the model can act on them.

### How it compares

AgentsID is **identity-first**: every action is signed by an agent token with delegation chains. Compare to policy-only tools — those block based on rule matches; we block based on who is acting and on whose behalf. We also publish the underlying data: agentsid.dev/registry is open and every grade is reproducible with `npx @agentsid/scanner`.

### Requires

- Cursor 1.7 or later (hooks support shipped in 1.7)
- Node.js 20+
- A free AgentsID project key (issued instantly at agentsid.dev)

### Install

```
npx @agentsid/setup --host=cursor
```

Restart Cursor. Check Settings → MCP → `agentsid` shows green. Done.

### Links

- Scanner: https://agentsid.dev/registry
- GitHub: https://github.com/AgentsID-dev/agentsid
- Docs: https://agentsid.dev/docs
- Research: https://agentsid.dev/research

### License

MIT. Scanner, server, and setup wizard are all open source. See `LICENSE` in the repository.
```

## 5. Categories / tags

Primary category (pick one per Marketplace taxonomy once published):
- **Security** (first choice)
- **Developer Tools** (fallback)

Keywords/tags (up to 10):
- `mcp`
- `security`
- `agent`
- `permissions`
- `audit`
- `identity`
- `hooks`
- `guard`
- `agentsid`
- `registry`

## 6. Icon spec

- **256×256 PNG**, transparent background
- Source: `web/public/favicon.svg` scaled 8× OR the A–F grade shield mark
- Two-color: amber-500 (#f59e0b) accent on zinc-950 (#09090b) base
- Export to `web/public/marketplace/cursor-icon-256.png` when frontend bandwidth allows

## 7. Screenshots (spec)

Aspect: 16:9 (1600×900 preferred). Three mandatory + two optional.

| # | Title | Frame | Notes |
|---|---|---|---|
| 1 | **"A deny in flight"** | Cursor with a modal dialog showing the guard blocking a call to an F-graded MCP server. Grade pill (F·red) visible. Tool name + server name in monospace. Amber "Allow once" / "Deny" buttons. | The core proof — "this actually intercepts." |
| 2 | **"Grade check at install"** | Cursor terminal running `npx @agentsid/setup --host=cursor` with the pre-flight scan output listing each `mcpServers` entry and its grade. One server shows F with a red warning arrow. | Install-time value. |
| 3 | **"The audit log"** | Either the in-Cursor rules panel or the `~/.agentsid/audit.log` tail in a split pane, showing 6–8 signed entries with agent IDs and `on_behalf_of` chains. | Identity-first proof point. |
| 4 (opt.) | **"Registry lookup"** | `agentsid.dev/registry` browser tab side-by-side with Cursor, same server slug visible in both. | Transparency proof. |
| 5 (opt.) | **"Rules file in action"** | The `.cursor/rules/agentsid-guard.mdc` file open in Cursor, with a soft warning in the status bar when a raw Bash command is proposed. | Defense-in-depth proof. |

Do not stage fake data. Every grade, server name, and log line in a screenshot must come from a real scan of a real package.

## 8. Changelog entry to ship alongside submission

```
v0.2.0 — 2026-04-?? — Cursor hook emission

- New: @agentsid/setup --host=cursor now writes .cursor/hooks.json in addition to
  .cursor/mcp.json. Hooks: beforeShellExecution, beforeMCPExecution, beforeReadFile,
  preToolUse, afterFileEdit, sessionStart. All security hooks set failClosed: true.
- New: Optional .cursor/permissions.json so agentsid:* tools auto-run without
  per-restart UI toggling.
- New: Optional .cursor/rules/agentsid-guard.mdc soft supplement.
- Codex: Added required=true, startup_timeout_sec, tool_timeout_sec. Bash-only hook
  emission is opt-in behind --enable-codex-hooks (experimental).
```

## 9. Outreach template (for when submission opens)

Recipient: Cursor DevRel / partnerships inbox (exact address TBD — research pass before sending).

**Subject:** AgentsID ships Cursor hooks support — adding to your partner roster?

**Body:**

Hi Cursor team,

We shipped AgentsID Guard for Cursor — identity, permissions, and audit for every MCP server your users install. It's live via `npx @agentsid/setup --host=cursor`, uses your 1.7 hooks surface (beforeShellExecution, beforeMCPExecution, beforeReadFile, preToolUse, sessionStart), and sets `failClosed: true` on every security hook.

Three things that might be interesting for your hooks-partners roster:

1. We publish the **public MCP security registry** — 15,983 servers graded A–F, findings reproducible with our open-source scanner. No partner on your current roster ships that.
2. We're **identity-first** rather than policy-first — every action is signed with an agent token and carries an `on_behalf_of` delegation chain. Oasis is closest to us on your list; we differ on where the trust root sits.
3. **Fully open source** (MIT) — scanner, server, setup wizard, guard. No platform SKU.

Would love to be considered for an update to cursor.com/blog/hooks-partners. Happy to send a one-page technical brief, a live demo, or both.

— Steven, AgentsID
https://agentsid.dev

---

## 10. Submission checklist (pre-flight before clicking "Publish")

- [ ] `@agentsid/setup` v0.2+ published on npm with Cursor hook emission
- [ ] `cursor.ts` integration committed + smoke-tested
- [ ] Icon exported to `web/public/marketplace/cursor-icon-256.png`
- [ ] 3 mandatory screenshots captured with real data
- [ ] Listing body reviewed for claim accuracy (no fabricated numbers)
- [ ] Docs landing page for `/docs/integrations/cursor` shipped
- [ ] Support email monitored (support@agentsid.dev or github issues)
- [ ] Short link `agentsid.dev/cursor` redirects to install command / setup docs

Once the blockers above clear, the listing copy is ready to paste into Cursor's submission form verbatim.
