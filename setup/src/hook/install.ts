import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const HOOK_INSTALL_DIR = path.join(os.homedir(), ".agentsid", "hooks");

/**
 * Return the path where a hook will be installed.
 */
export function getHookPath(filename: string): string {
  return path.join(HOOK_INSTALL_DIR, filename);
}

/**
 * Copy a hook script to ~/.agentsid/hooks/ and chmod 755.
 * Creates parent directories as needed.
 */
function installHookFile(filename: string): string {
  const sourceDir = path.dirname(fileURLToPath(import.meta.url));
  const sourcePath = path.join(sourceDir, filename);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Hook source file not found: ${sourcePath}`);
  }

  const destPath = getHookPath(filename);
  const destDir = path.dirname(destPath);

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(sourcePath, destPath);
  fs.chmodSync(destPath, 0o755);

  return destPath;
}

/**
 * Install all hook scripts:
 * - pre-tool.sh       → Claude Code PreToolUse (blocks denied tool calls)
 * - post-tool.sh      → Claude Code PostToolUse (logs results)
 * - cursor-adapter.sh → Cursor before/after hooks (translates Cursor's
 *                       per-event stdin into a /validate call and emits
 *                       the {permission, user_message, agent_message}
 *                       shape Cursor expects)
 *
 * All three are installed unconditionally so a user who switches platforms
 * after setup doesn't need to re-run the wizard. Unused scripts sitting in
 * ~/.agentsid/hooks/ are harmless.
 *
 * Returns the installed pre-tool hook path (the Claude Code primary).
 */
export async function installHook(): Promise<string> {
  installHookFile("post-tool.sh");
  installHookFile("cursor-adapter.sh");
  return installHookFile("pre-tool.sh");
}
