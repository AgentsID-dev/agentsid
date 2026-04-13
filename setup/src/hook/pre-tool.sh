#!/usr/bin/env bash
# AgentsID PreToolUse hook for Claude Code.
# Runs BEFORE every tool call. Calls /api/v1/validate to check permission.
# If denied, blocks the tool with a reason Claude can see.
# If the API is unreachable or slow, allows the tool (fail-open on network errors).
#
# Special handling for the `Task` tool (Claude Code's subagent spawner):
#   When tool_name == "Task", we call /api/v1/agents/derive instead of /validate
#   to issue a scoped child identity for the subagent being spawned. This gives
#   us audit lineage (parent → child) and scoped permissions per subagent type.

set -euo pipefail

# ── Read stdin ────────────────────────────────────────────────────────────────
INPUT=$(cat)

# ── Diagnostic capture (opt-in) ──────────────────────────────────────────────
# Set AGENTSID_DEBUG=1 to dump full hook stdin for investigating what Claude
# Code exposes about subagent context. Logs to ~/.agentsid/hook-stdin.log.
if [[ "${AGENTSID_DEBUG:-}" == "1" ]]; then
  DEBUG_LOG="${HOME}/.agentsid/hook-stdin.log"
  mkdir -p "$(dirname "$DEBUG_LOG")"
  {
    printf '=== %s ===\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf '%s\n' "$INPUT"
    printf '\n'
  } >> "$DEBUG_LOG"
fi

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
AGENT_ID="${AGENTSID_AGENT_ID:-}"

# If no token configured, allow everything (not yet set up)
if [[ -z "$AGENT_TOKEN" ]] || [[ -z "$PROJECT_KEY" ]]; then
  exit 0
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RESET='\033[0m'

# ── Branch: Task tool spawns a subagent ──────────────────────────────────────
if [[ "$TOOL_NAME" == "Task" ]]; then
  # Extract subagent_type from tool_input.
  SUBAGENT_TYPE=$(printf '%s' "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # Claude Code exposes this as 'subagent_type' in tool_input.
    print(data.get('subagent_type', 'general-purpose'))
except Exception:
    print('general-purpose')
" 2>/dev/null || printf 'general-purpose')

  # Hash the prompt to tag this subagent invocation in audit (not for auth).
  TASK_HASH=$(printf '%s' "$TOOL_INPUT" | python3 -c "
import sys, json, hashlib
try:
    data = json.load(sys.stdin)
    prompt = data.get('prompt', '') or data.get('description', '')
    print(hashlib.sha256(prompt.encode('utf-8')).hexdigest()[:16])
except Exception:
    print('')
" 2>/dev/null || true)

  # Skip if we don't know the parent agent ID — can't derive without lineage.
  if [[ -z "$AGENT_ID" ]]; then
    printf "${CYAN}ⓘ SPAWN${RESET} Task/%s (no AGENTSID_AGENT_ID — skipping derive)\n" \
      "$SUBAGENT_TYPE" >&2
    exit 0
  fi

  # Build derive request body in python, passing user-controlled values via env
  # vars (NOT shell interpolation) so a malicious subagent_type like
  # "$(rm -rf ~)" cannot break out into bash.
  DERIVE_BODY=$(
    SUBAGENT_TYPE="$SUBAGENT_TYPE" \
    TASK_HASH="$TASK_HASH" \
    python3 -c "
import json, os
print(json.dumps({
    'parent_agent_id': os.environ.get('AGENTSID_AGENT_ID', ''),
    'parent_token': os.environ.get('AGENTSID_AGENT_TOKEN', ''),
    'agent_type': os.environ.get('SUBAGENT_TYPE', '').strip() or 'general-purpose',
    'task_hash': (os.environ.get('TASK_HASH', '').strip() or None),
}))
" 2>/dev/null || printf '{}')

  DERIVE_RESPONSE=$(curl -s --max-time 3 \
    -X POST "${API_BASE}/api/v1/agents/derive" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${PROJECT_KEY}" \
    -d "$DERIVE_BODY" \
    2>/dev/null || true)

  # Fail-open on network errors.
  if [[ -z "$DERIVE_RESPONSE" ]]; then
    printf "${CYAN}ⓘ SPAWN${RESET} Task/%s (derive unreachable — allowing)\n" \
      "$SUBAGENT_TYPE" >&2
    exit 0
  fi

  # Parse response: if server returned 403 the body is {"detail": "..."}.
  DERIVE_DECISION=$(printf '%s' "$DERIVE_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'detail' in data and 'agent' not in data:
        # Denied — server sent error.
        print('deny|' + str(data['detail']))
    elif 'agent' in data:
        child_id = data['agent']['id']
        print('allow|spawned ' + child_id)
    else:
        print('allow|')
except Exception:
    print('allow|')
" 2>/dev/null || true)

  SPAWN_ACTION="${DERIVE_DECISION%%|*}"
  SPAWN_REASON="${DERIVE_DECISION#*|}"

  if [[ "$SPAWN_ACTION" == "deny" ]]; then
    printf "${RED}⛔ DENIED${RESET} Task/%s — %s\n" "$SUBAGENT_TYPE" "$SPAWN_REASON" >&2
    SPAWN_REASON="$SPAWN_REASON" python3 -c "
import json, os
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': 'AgentsID: ' + os.environ.get('SPAWN_REASON', '')
    }
}))
" 2>/dev/null
    exit 0
  else
    printf "${CYAN}ⓘ SPAWN${RESET} Task/%s — %s\n" "$SUBAGENT_TYPE" "$SPAWN_REASON" >&2
    exit 0
  fi
fi

# ── Default branch: any other tool → /validate ───────────────────────────────
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
if [[ "$ACTION" == "deny" ]]; then
  # Print visual feedback to stderr (user sees this)
  printf "${RED}⛔ DENIED${RESET}  %s — %s\n" "$TOOL_NAME" "$REASON" >&2

  # Output JSON that blocks the tool call. Pass REASON via env (not shell
  # interpolation) so a crafted deny message can't escape into bash.
  REASON="$REASON" python3 -c "
import json, os
print(json.dumps({
    'hookSpecificOutput': {
        'hookEventName': 'PreToolUse',
        'permissionDecision': 'deny',
        'permissionDecisionReason': 'AgentsID: ' + os.environ.get('REASON', '')
    }
}))
" 2>/dev/null
else
  # Print visual feedback to stderr (user sees this)
  printf "${GREEN}✓ ALLOWED${RESET} %s\n" "$TOOL_NAME" >&2
  exit 0
fi
