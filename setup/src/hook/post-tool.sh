#!/usr/bin/env bash
# AgentsID PostToolUse hook for Claude Code.
# Reads a JSON event from stdin, queries the AgentsID audit API, and
# prints a coloured DENIED / ALLOWED result to stderr.
# Always exits 0 so a transient API failure never blocks the agent.

set -euo pipefail

# ── Read stdin ────────────────────────────────────────────────────────────────
INPUT=$(cat)

# ── Extract tool_name ─────────────────────────────────────────────────────────
TOOL_NAME=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('tool_name', ''))
except Exception:
    print('')
" 2>/dev/null || true)

if [[ -z "$TOOL_NAME" ]]; then
  exit 0
fi

# ── Resolve API base URL ──────────────────────────────────────────────────────
API_BASE="${AGENTSID_API_URL:-https://api.agentsid.dev}"
PROJECT_KEY="${AGENTSID_PROJECT_KEY:-}"
ENDPOINT="${API_BASE}/api/v1/audit/?limit=1&tool=${TOOL_NAME}"

# ── Query audit endpoint ──────────────────────────────────────────────────────
HEADERS=(-H "Content-Type: application/json")
if [[ -n "$PROJECT_KEY" ]]; then
  HEADERS+=(-H "Authorization: Bearer ${PROJECT_KEY}")
fi
RESPONSE=$(curl -s --max-time 0.5 "${HEADERS[@]}" "$ENDPOINT" 2>/dev/null || true)

if [[ -z "$RESPONSE" ]]; then
  exit 0
fi

# ── Parse action from response ────────────────────────────────────────────────
ACTION=$(printf '%s' "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    entries = data.get('entries', [])
    if entries:
        print(entries[0].get('action', ''))
    else:
        print('')
except Exception:
    print('')
" 2>/dev/null || true)

# ── Print result ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
RESET='\033[0m'

if [[ "$ACTION" == "deny" ]]; then
  printf "${RED}⛔ DENIED${RESET}  %s\n" "$TOOL_NAME" >&2
elif [[ "$ACTION" == "allow" ]]; then
  printf "${GREEN}✓ ALLOWED${RESET}  %s\n" "$TOOL_NAME" >&2
fi

exit 0
