#!/usr/bin/env bash
# AgentsID PreToolUse hook for Claude Code.
# Runs BEFORE every tool call. Calls /api/v1/validate to check permission.
# If denied, blocks the tool with a reason Claude can see.
# If the API is unreachable or slow, allows the tool (fail-open on network errors).

set -euo pipefail

# ── Read stdin ────────────────────────────────────────────────────────────────
INPUT=$(cat)

# ── Extract tool name and params ─────────────────────────────────────────────
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

TOOL_INPUT=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(json.dumps(data.get('tool_input', {})))
except Exception:
    print('{}')
" 2>/dev/null || true)

# ── Resolve config ───────────────────────────────────────────────────────────
API_BASE="${AGENTSID_API_URL:-https://api.agentsid.dev}"
PROJECT_KEY="${AGENTSID_PROJECT_KEY:-}"
AGENT_TOKEN="${AGENTSID_AGENT_TOKEN:-}"

# If no token configured, allow everything (not yet set up)
if [[ -z "$AGENT_TOKEN" ]] || [[ -z "$PROJECT_KEY" ]]; then
  exit 0
fi

# ── Call /validate ───────────────────────────────────────────────────────────
RESPONSE=$(curl -s --max-time 2 \
  -X POST "${API_BASE}/api/v1/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PROJECT_KEY}" \
  -d "{\"token\":\"${AGENT_TOKEN}\",\"tool\":\"${TOOL_NAME}\",\"params\":${TOOL_INPUT}}" \
  2>/dev/null || true)

# Fail-open: if API is unreachable, allow the tool
if [[ -z "$RESPONSE" ]]; then
  exit 0
fi

# ── Parse response ───────────────────────────────────────────────────────────
DECISION=$(printf '%s' "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if not data.get('valid', False):
        print('deny|Token validation failed')
        sys.exit(0)
    perm = data.get('permission', {})
    if perm and not perm.get('allowed', True):
        reason = perm.get('reason', 'Denied by policy')
        matched = perm.get('matched_rule', {})
        rule = matched.get('tool_pattern', '') if matched else ''
        msg = reason
        if rule:
            msg += ' (rule: ' + rule + ')'
        print('deny|' + msg)
    else:
        print('allow|')
except Exception:
    print('allow|')
" 2>/dev/null || true)

ACTION="${DECISION%%|*}"
REASON="${DECISION#*|}"

# ── Output decision ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
RESET='\033[0m'

if [[ "$ACTION" == "deny" ]]; then
  # Print visual feedback to stderr (user sees this)
  printf "${RED}⛔ DENIED${RESET}  %s — %s\n" "$TOOL_NAME" "$REASON" >&2

  # Output JSON that blocks the tool call
  python3 -c "
import json
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': 'AgentsID: ' + '''${REASON}'''.replace(\"'\", \"'\")
    }
}))
" 2>/dev/null
else
  # Print visual feedback to stderr (user sees this)
  printf "${GREEN}✓ ALLOWED${RESET} %s\n" "$TOOL_NAME" >&2
  exit 0
fi
