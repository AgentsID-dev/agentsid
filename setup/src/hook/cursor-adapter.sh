#!/usr/bin/env bash
# AgentsID Cursor hook adapter.
#
# Cursor's hook I/O contract differs from Claude Code's in three ways:
#   1. Stdin shape is per-event (beforeShellExecution has `command`/`cwd`,
#      beforeReadFile has `file_path`, etc.) rather than the unified CC
#      `{tool_name, tool_input, ...}` payload.
#   2. Permission decisions are emitted as `{"permission":"deny","user_message",
#      "agent_message"}` instead of CC's `hookSpecificOutput.permissionDecision`.
#   3. hooks.json cannot inject env on hook entries — Cursor only pipes env
#      through `sessionStart` hook stdout, or inherits the user's shell env.
#
# This adapter normalises Cursor stdin into a /validate call, loads AGENTSID_*
# credentials from the wizard-written env file, and emits Cursor-format
# decisions. One script, four sub-commands:
#   cursor-adapter.sh shell   → beforeShellExecution
#   cursor-adapter.sh mcp     → beforeMCPExecution
#   cursor-adapter.sh read    → beforeReadFile
#   cursor-adapter.sh audit   → after{Shell,File,MCP}* events (audit-only)
#
# Fail-open on network errors: if /validate is unreachable we exit 0 silently,
# which lets the underlying operation proceed. `failClosed: true` in hooks.json
# only fires on non-zero exit or timeout, so our exit path matters.

set -euo pipefail

MODE="${1:-}"
INPUT=$(cat)
ENV_FILE="${HOME}/.agentsid/cursor-env.json"

# ── Load AGENTSID_* from wizard-written env file ──────────────────────────────
# If the file doesn't exist or is malformed we exit 0 (not configured → allow).
# We use shlex.quote on values so a crafted credential can't escape into bash.
if [[ ! -f "$ENV_FILE" ]]; then
  exit 0
fi

LOAD=$(EF="$ENV_FILE" python3 -c "
import json, os, shlex
try:
    with open(os.environ['EF']) as f:
        d = json.load(f)
    for k in ('AGENTSID_PROJECT_KEY','AGENTSID_AGENT_TOKEN','AGENTSID_AGENT_ID','AGENTSID_API_URL'):
        v = d.get(k, '')
        print(f'{k}={shlex.quote(str(v))}')
except Exception:
    pass
" 2>/dev/null || true)
eval "$LOAD"

PROJECT_KEY="${AGENTSID_PROJECT_KEY:-}"
AGENT_TOKEN="${AGENTSID_AGENT_TOKEN:-}"
API_BASE="${AGENTSID_API_URL:-https://api.agentsid.dev}"

if [[ -z "$PROJECT_KEY" ]] || [[ -z "$AGENT_TOKEN" ]]; then
  exit 0
fi

# ── Event → (tool_name, tool_input) normalisation ────────────────────────────
# The /validate endpoint evaluates against tool_name + tool_input. Each Cursor
# event has a different stdin shape; we pick the right fields per event.
case "$MODE" in
  shell)
    TOOL_NAME="Bash"
    TOOL_INPUT=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(json.dumps({'command': d.get('command', ''), 'cwd': d.get('cwd', '')}))
except Exception:
    print('{}')
" 2>/dev/null || printf '{}')
    ;;
  mcp)
    # Cursor's beforeMCPExecution already gives us tool_name + tool_input.
    # tool_input may be a JSON string — pass it through as-is.
    FIELDS=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    tn = d.get('tool_name', '')
    ti = d.get('tool_input', {})
    if isinstance(ti, str):
        try: ti = json.loads(ti)
        except Exception: ti = {'raw': ti}
    print(tn)
    print(json.dumps(ti))
except Exception:
    print('')
    print('{}')
" 2>/dev/null || printf '\n{}')
    TOOL_NAME=$(printf '%s' "$FIELDS" | sed -n '1p')
    TOOL_INPUT=$(printf '%s' "$FIELDS" | sed -n '2p')
    [[ -z "$TOOL_NAME" ]] && exit 0
    ;;
  read)
    TOOL_NAME="Read"
    TOOL_INPUT=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(json.dumps({'file_path': d.get('file_path', '')}))
except Exception:
    print('{}')
" 2>/dev/null || printf '{}')
    ;;
  audit)
    # Audit-only — log the event name + tool name to stderr for visibility,
    # then exit 0. No permission output, no /validate call. This matches CC's
    # post-tool.sh: a denied action cannot be undone here, we just observe.
    TN=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('tool_name', '') or d.get('hook_event_name', ''))
except Exception:
    print('')
" 2>/dev/null || true)
    if [[ -n "$TN" ]]; then
      printf '\033[0;36mⓘ audit\033[0m %s\n' "$TN" >&2
    fi
    exit 0
    ;;
  *)
    exit 0
    ;;
esac

# ── Call /validate ────────────────────────────────────────────────────────────
RESPONSE=$(curl -s --max-time 2 \
  -X POST "${API_BASE}/api/v1/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${PROJECT_KEY}" \
  -d "{\"token\":\"${AGENT_TOKEN}\",\"tool\":\"${TOOL_NAME}\",\"params\":${TOOL_INPUT}}" \
  2>/dev/null || true)

# Fail-open on network failure so a flaky API doesn't brick the user's session.
if [[ -z "$RESPONSE" ]]; then
  exit 0
fi

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
        msg = reason + (' (rule: ' + rule + ')' if rule else '')
        print('deny|' + msg)
    else:
        print('allow|')
except Exception:
    print('allow|')
" 2>/dev/null || true)

ACTION="${DECISION%%|*}"
REASON="${DECISION#*|}"

# ── Emit Cursor-format decision ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
RESET='\033[0m'

if [[ "$ACTION" == "deny" ]]; then
  printf "${RED}⛔ DENIED${RESET}  %s — %s\n" "$TOOL_NAME" "$REASON" >&2
  # Use env-passed REASON so a crafted deny message can't break out into bash.
  REASON="$REASON" TOOL_NAME="$TOOL_NAME" python3 -c "
import json, os
reason = os.environ.get('REASON', '')
tn = os.environ.get('TOOL_NAME', '')
print(json.dumps({
    'permission': 'deny',
    'user_message': 'AgentsID blocked ' + tn + ': ' + reason,
    'agent_message': 'AgentsID policy denied this action. Reason: ' + reason,
}))
" 2>/dev/null
else
  printf "${GREEN}✓ ALLOWED${RESET} %s\n" "$TOOL_NAME" >&2
  python3 -c "import json; print(json.dumps({'permission': 'allow'}))" 2>/dev/null
fi
