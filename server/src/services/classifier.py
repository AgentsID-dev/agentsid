"""Tool classifier — maps raw (tool, params) calls to semantic taxonomy tags.

The permission engine stores rules against a semantic taxonomy (e.g.
`shell.danger.*`, `file.read[.env]`, `shell.read.list`) because preset authors
think in terms of intent ("block dangerous shell commands"), not in terms of
raw tool names that vary per platform (Bash vs terminal.run vs exec_command).

Raw tool calls coming in from hooks look like:
    tool="Bash", params={"command": "sudo echo hi"}
    tool="Read", params={"file_path": "/.../server/.env"}

Without a classifier, `fnmatch("Bash", "shell.admin.*")` returns False and the
call falls through to the default `*` allow rule — i.e. the semantic preset
is dead. This module closes that gap.

The classifier is intentionally conservative on the over-classification side:
rather than try to parse a shell AST, we pattern-match the first command word
plus a few well-known composite patterns (`curl | bash`, `rm -rf /`). False
negatives are preferable to false positives ONLY for allow rules; for deny
rules we bias towards including more tags so suspicious commands are caught.

The raw tool name is always included in the tag list so exact-name rules
(e.g. Claude Code's `Bash` rule in the claude-code-specific preset) continue
to work exactly as they did before.
"""

from __future__ import annotations

import re

__all__ = ["classify", "matches_any"]


# ── Entry point ──────────────────────────────────────────────────────────────


def classify(tool: str, params: dict | None) -> list[str]:
    """Return every semantic tag this (tool, params) call matches.

    The raw tool name is always the first element so exact-name rules
    (e.g. `"Bash"`, `"Read"`) still match. Platform-specific clients can
    therefore keep using raw-name rules; semantic presets work via this
    classifier without the client needing to know the taxonomy.
    """
    tags: list[str] = [tool]

    if not params or not isinstance(params, dict):
        return tags

    if tool == "Bash":
        cmd = _coerce_str(params.get("command"))
        if cmd:
            tags.extend(_classify_shell(cmd))

    if tool == "Read":
        fp = _coerce_str(params.get("file_path"))
        if fp:
            tags.extend(_classify_file_read(fp))

    if tool in {"Write", "Edit", "NotebookEdit"}:
        fp = _coerce_str(params.get("file_path"))
        if fp:
            tags.extend(_classify_file_write(fp))

    if tool == "WebFetch":
        tags.extend(_classify_web_fetch(params))

    return tags


# ── Rule-matching ────────────────────────────────────────────────────────────


def matches_any(pattern: str, tags: list[str]) -> bool:
    """True if any tag matches the pattern.

    Matching rules:
      - `"*"` is the universal wildcard.
      - Bracketed taxonomic patterns like `file.read[.env]` are LITERAL
        qualifiers, not fnmatch char classes. They match only the exact
        tag string. (fnmatch would otherwise treat `[.env]` as "any char in
        {., e, n, v}", which is not what preset authors intend.)
      - Everything else uses `fnmatch.fnmatch` for glob semantics
        (`shell.danger.*` matches `shell.danger.destroy` and `shell.danger`).
    """
    import fnmatch as _fnmatch

    if pattern == "*":
        return True

    if "[" in pattern:
        return pattern in tags

    return any(_fnmatch.fnmatch(t, pattern) for t in tags)


# ── Shell classification ─────────────────────────────────────────────────────


# Commands that escalate privileges or administrate the system.
_ADMIN_PRIVILEGE = {"sudo", "su", "doas", "pkexec", "runuser"}
_ADMIN_SERVICE = {"systemctl", "service", "launchctl", "rc-service", "sv"}
_ADMIN_USER = {
    "useradd", "usermod", "userdel",
    "groupadd", "groupmod", "groupdel",
    "passwd", "chpasswd",
}

# First-word shell.danger.* classifications.
_DANGER_FORMAT = {"dd", "mkfs", "fdisk", "parted", "wipefs", "shred"}
_DANGER_EVAL = {"eval", "exec"}

# Read-only inspection commands.
_READ_LIST = {"ls", "dir", "find", "locate", "tree", "fd"}
_READ_FILE = {"cat", "head", "tail", "less", "more", "bat", "pager"}
_READ_SEARCH = {"grep", "rg", "ag", "ack", "ripgrep"}
_READ_INFO = {
    "pwd", "whoami", "hostname", "uname", "date", "id", "echo", "printf",
    "env", "printenv", "which", "type", "command",
}
_READ_INSPECT = {"stat", "file", "wc", "du", "df", "checksum", "md5sum", "sha256sum"}

# Mutating filesystem commands (less dangerous than shell.danger.destroy).
_WRITE_CREATE = {"mkdir", "touch", "rmdir"}
_WRITE_MOVE = {"mv", "cp", "ln", "rsync"}
_WRITE_TRANSFORM = {"sed", "awk", "tee"}

# Git subcommands split by read/write.
_GIT_READ_SUB = {"status", "log", "diff", "show", "blame", "branch", "remote",
                 "config", "describe", "ls-files", "rev-parse", "fetch"}
_GIT_WRITE_SUB = {"add", "commit", "push", "pull", "merge", "rebase", "checkout",
                  "reset", "stash", "tag", "cherry-pick", "revert", "clean", "restore"}

# HTTP client command names.
_HTTP_CLIENTS = {"curl", "wget", "http", "httpie"}

# Exact `rm -rf <target>` strings we unambiguously flag as destructive.
# Subdirectories two-or-more levels deep (e.g. /var/log/nginx) are NOT flagged
# here — if an agent is doing sysadmin work it can scope rules narrower.
_RM_DANGEROUS_EXACT = {
    # POSIX system roots
    "/", "/*", "/.", "/..",
    "/etc", "/var", "/usr", "/boot", "/root", "/home",
    "/opt", "/srv", "/sys", "/proc", "/lib", "/sbin", "/bin",
    # macOS roots
    "/Users", "/Applications", "/Library", "/System", "/Volumes",
    # Windows roots
    "C:\\", "C:/", "c:\\", "c:/",
    # Shell expansions for HOME / pwd / literal *
    "$HOME", "~", "$PWD", "${HOME}", "${PWD}", "*",
}

# Prefixes where `rm -rf <prefix>/<single-segment>` is catastrophic (wipes a
# whole user home). Two-or-more segments deep we let through.
_RM_DANGEROUS_HOME_PREFIXES = ("/Users/", "/home/")
_RM_DANGEROUS_EXPANSION_PREFIXES = ("~/", "$HOME/", "${HOME}/")


def _classify_shell(cmd: str) -> list[str]:
    """Classify a shell command string into semantic tags."""
    tags: list[str] = []

    stripped = cmd.strip()
    if not stripped:
        return tags

    first = _first_command_word(stripped)
    git_sub = _git_subcommand(stripped)

    # ── shell.admin.* ────────────────────────────────────────────────────────
    if first in _ADMIN_PRIVILEGE:
        tags.append("shell.admin.sudo")
        tags.append("shell.admin")
    if first in _ADMIN_SERVICE:
        tags.append("shell.admin.service")
        tags.append("shell.admin")
    if first in _ADMIN_USER:
        tags.append("shell.admin.user")
        tags.append("shell.admin")
    # Recursive chmod/chown is admin-grade risk even without sudo
    if first in {"chmod", "chown"} and _has_recursive_flag(stripped):
        tags.append("shell.admin.perms")
        tags.append("shell.admin")

    # ── shell.danger.* ───────────────────────────────────────────────────────
    # Destructive deletion
    if " -rf" in stripped or " -fr" in stripped:
        if first == "rm" and _targets_dangerous_path(stripped):
            tags.append("shell.danger.destroy")
            tags.append("shell.danger")
    # Remote code exec: curl|wget piped into a shell interpreter
    if _is_remote_exec(stripped):
        tags.append("shell.danger.remote_exec")
        tags.append("shell.danger")
    # Disk formatting / low-level IO (mkfs.ext4, mkfs.xfs all count)
    if first in _DANGER_FORMAT or first.startswith("mkfs."):
        tags.append("shell.danger.format")
        tags.append("shell.danger")
    # Classic fork bomb
    if ":(){ :|: &};:" in stripped.replace(" ", "") or ":(){:|:&};:" in stripped.replace(" ", ""):
        tags.append("shell.danger.fork_bomb")
        tags.append("shell.danger")
    # Eval/exec of arbitrary strings (caller-controllable code execution)
    if first in _DANGER_EVAL:
        tags.append("shell.danger.eval")
        tags.append("shell.danger")

    # ── shell.read.* ─────────────────────────────────────────────────────────
    if first in _READ_LIST:
        tags.append("shell.read.list")
        tags.append("shell.read")
    elif first in _READ_FILE:
        tags.append("shell.read.file")
        tags.append("shell.read")
    elif first in _READ_SEARCH:
        tags.append("shell.read.search")
        tags.append("shell.read")
    elif first in _READ_INFO:
        tags.append("shell.read.info")
        tags.append("shell.read")
    elif first in _READ_INSPECT:
        tags.append("shell.read.inspect")
        tags.append("shell.read")

    # Git read/write classification runs independent of the first_word ladder
    # above because `git` is always the first word regardless of subcommand.
    if first == "git":
        if git_sub in _GIT_READ_SUB:
            tags.append("shell.read.git")
            tags.append("shell.read")
            tags.append("git.read." + git_sub)
            tags.append("git.read")
        elif git_sub in _GIT_WRITE_SUB:
            tags.append("shell.write.git")
            tags.append("shell.write")
            tags.append("git.write." + git_sub)
            tags.append("git.write")

    # ── shell.write.* ────────────────────────────────────────────────────────
    if first in _WRITE_CREATE:
        tags.append("shell.write.create")
        tags.append("shell.write")
    elif first in _WRITE_MOVE:
        tags.append("shell.write.move")
        tags.append("shell.write")
    elif first in _WRITE_TRANSFORM:
        tags.append("shell.write.transform")
        tags.append("shell.write")
    elif first == "rm" and "shell.danger" not in tags:
        # Non-dangerous rm (no -rf against a dangerous root) still classifies
        # as a write-style mutation.
        tags.append("shell.write.remove")
        tags.append("shell.write")

    # ── http.* from curl/wget ────────────────────────────────────────────────
    if first in _HTTP_CLIENTS:
        method = _curl_method(stripped)
        tags.append(f"http.{method.lower()}")

    return tags


# ── File-read / file-write classification ────────────────────────────────────


def _classify_file_read(path: str) -> list[str]:
    tags = ["file.read"]
    name = _basename(path)

    # Secrets-like files. The preset patterns use bracketed literals
    # (file.read[.env], file.read[*.pem], file.read[*.key]) which we emit
    # as tags verbatim; matches_any() handles these as literal equality.

    # .env and variants — .env, .env.local, .env.production, foo.env, and
    # .envrc (direnv's env file — same sensitivity class).
    if (
        name == ".env"
        or name == ".envrc"
        or name.startswith(".env.")
        or _has_suffix(name, ".env")
    ):
        tags.append("file.read[.env]")
    if _has_suffix(name, ".pem"):
        tags.append("file.read[*.pem]")
    if _has_suffix(name, ".key"):
        tags.append("file.read[*.key]")
    if _has_suffix(name, ".pfx") or _has_suffix(name, ".p12"):
        tags.append("file.read[*.pfx]")
    if name in {"id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"}:
        tags.append("file.read[ssh_key]")
    # `.secrets` / `secrets` file or directory — common dotfile convention
    # for per-project credential storage (dotenv-cli, shell profiles, etc.).
    if name == ".secrets" or name == "secrets":
        tags.append("file.read[.secrets]")
    # AWS-style `credentials` filenames (~/.aws/credentials, etc.) and
    # GCP's `application_default_credentials.json`.
    if (
        name == "credentials"
        or name == "application_default_credentials.json"
        or _has_suffix(name, ".credentials")
    ):
        tags.append("file.read[credentials]")
    # `*.token` — bearer tokens, API tokens, session tokens.
    if _has_suffix(name, ".token"):
        tags.append("file.read[*.token]")

    return tags


def _classify_file_write(path: str) -> list[str]:
    return ["file.write"]


def _classify_web_fetch(params: dict) -> list[str]:
    # All WebFetch calls are HTTP GETs at the tool level.
    return ["http.get"]


# ── Helpers ──────────────────────────────────────────────────────────────────


def _coerce_str(value: object) -> str:
    if isinstance(value, str):
        return value
    return ""


def _first_command_word(cmd: str) -> str:
    """Return the first word that's a command, skipping leading env
    assignments and common line prefixes.

    `FOO=bar sudo ls` → `sudo`
    `! sudo ls`       → `sudo`
    `( sudo ls )`     → `sudo`
    """
    stripped = cmd.strip().lstrip("!()[]{}|&;")
    words = stripped.split()
    for w in words:
        w = w.lstrip("!()[]{}|&;")
        if "=" in w:
            name, _, _ = w.partition("=")
            if name and name.replace("_", "").isalnum() and name[0].isalpha():
                # Likely an env assignment FOO=bar — skip.
                continue
        return w
    return ""


def _git_subcommand(cmd: str) -> str:
    """Get the second word when the first is `git`, else empty string."""
    parts = cmd.strip().split()
    if len(parts) >= 2 and parts[0] == "git":
        return parts[1]
    return ""


def _has_recursive_flag(cmd: str) -> bool:
    """True if the command contains a recursive flag (-R / -r / --recursive)."""
    return bool(re.search(r"\s-([a-zA-Z]*[rR][a-zA-Z]*)\b", cmd)) or " --recursive" in cmd


def _targets_dangerous_path(cmd: str) -> bool:
    """Parse rm arguments and flag when any one names a catastrophic target.

    We walk positional args (not flags). For each, the rule is:
      - exact match against `_RM_DANGEROUS_EXACT` → danger
      - matches `<home-prefix>/<single-segment>` (e.g. /Users/steven,
        ~/Documents) → danger, because wiping a user home/dir one segment
        deep is typically catastrophic
      - anything else → not flagged (let narrower scopes decide)

    The heuristic favours false negatives over false positives: we'd rather
    not block legitimate sysadmin work like `rm -rf /var/log/rotating.log`
    than accidentally block obvious attacks.
    """
    parts = cmd.strip().split()
    if not parts or parts[0] != "rm":
        return False

    args = [p for p in parts[1:] if not p.startswith("-")]
    if not args:
        return False

    for arg in args:
        cleaned = arg.rstrip("/")

        if arg in _RM_DANGEROUS_EXACT or cleaned in _RM_DANGEROUS_EXACT:
            return True

        # /Users/steven, /home/bob — exactly one segment under a critical root
        for prefix in _RM_DANGEROUS_HOME_PREFIXES:
            if arg.startswith(prefix):
                rest = arg[len(prefix):].rstrip("/")
                if rest and "/" not in rest:
                    return True

        # ~/Documents, $HOME/Desktop — one level under the user's home
        for prefix in _RM_DANGEROUS_EXPANSION_PREFIXES:
            if arg.startswith(prefix):
                rest = arg[len(prefix):].rstrip("/")
                if rest and "/" not in rest:
                    return True

    return False


def _is_remote_exec(cmd: str) -> bool:
    """Detect `curl|wget … | bash|sh|zsh|python` and friends."""
    # Allow other pipes between (e.g. `curl ... | tr ... | bash`).
    pattern = re.compile(
        r"\b(curl|wget|http|httpie|fetch)\b[^|]*\|[\s\S]*?\|?\s*(bash|sh|zsh|ksh|python|python3|node|ruby|perl|pwsh|powershell)\b"
    )
    return bool(pattern.search(cmd))


def _curl_method(cmd: str) -> str:
    m = re.search(r"(?:^|\s)-X\s+([A-Z]+)", cmd)
    if m:
        return m.group(1).upper()
    m = re.search(r"--request\s+([A-Z]+)", cmd)
    if m:
        return m.group(1).upper()
    if re.search(r"(^|\s)(-d\b|--data|--data-raw|--data-urlencode)\s", cmd):
        return "POST"
    return "GET"


def _basename(path: str) -> str:
    """Last path segment, handling both POSIX and Windows-style separators."""
    for sep in ("/", "\\"):
        if sep in path:
            path = path.rsplit(sep, 1)[-1]
    return path


def _has_suffix(name: str, suffix: str) -> bool:
    """Case-sensitive suffix check that treats dotted suffixes literally
    (so `.env` in `app.env` matches but `.env.local` also matches because
    we still look for the component)."""
    return name.endswith(suffix)
