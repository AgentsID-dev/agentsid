import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Integration tests for `cursor-adapter.sh`.
 *
 * These tests exercise the *real* shell script against a *real* HTTP mock,
 * so they catch protocol-level regressions that the config-shape unit tests
 * miss. The adapter was originally pointed at Claude Code's `pre-tool.sh`
 * and would silently no-op on Cursor because Cursor's decision format,
 * stdin fields, and env-passing mechanism all differ — these tests lock
 * that contract down.
 *
 * We invoke the adapter via `bash /path/to/script.sh <subcommand>` rather
 * than relying on the executable bit, so a fresh clone without +x still
 * runs green.
 */

const ADAPTER_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/hook/cursor-adapter.sh"
);

interface ValidateRequest {
  tool: string;
  token: string;
  params: Record<string, unknown>;
}

interface MockServer {
  url: string;
  readonly requests: ValidateRequest[];
  close: () => Promise<void>;
}

type Decision = {
  allowed: boolean;
  reason?: string;
  rule?: string;
};

function startMock(
  decide: (req: ValidateRequest) => Decision
): Promise<MockServer> {
  return new Promise((resolve) => {
    const requests: ValidateRequest[] = [];
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let parsed: ValidateRequest;
        try {
          parsed = JSON.parse(body || "{}") as ValidateRequest;
        } catch {
          parsed = { tool: "", token: "", params: {} };
        }
        requests.push(parsed);
        const d = decide(parsed);
        const response = {
          valid: true,
          permission: {
            allowed: d.allowed,
            reason: d.reason ?? "",
            matched_rule: d.rule ? { tool_pattern: d.rule } : {},
          },
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (typeof addr !== "object" || addr === null) {
        throw new Error("mock server could not bind");
      }
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        requests,
        close: () =>
          new Promise<void>((r) => {
            server.close(() => r());
          }),
      });
    });
  });
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runAdapter(opts: {
  subcommand: string;
  stdin: unknown;
  home: string;
}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("bash", [ADAPTER_PATH, opts.subcommand], {
      env: {
        ...process.env,
        HOME: opts.home,
        PATH: process.env.PATH ?? "",
      },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += String(c)));
    child.stderr.on("data", (c) => (stderr += String(c)));
    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, exitCode: code ?? -1 }));
    child.stdin.write(JSON.stringify(opts.stdin));
    child.stdin.end();
  });
}

describe("cursor-adapter.sh (integration)", () => {
  let tmpHome: string;
  let mock: MockServer | undefined;

  beforeEach(() => {
    tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-adapter-"));
    fs.mkdirSync(path.join(tmpHome, ".agentsid"), { recursive: true });
  });

  afterEach(async () => {
    if (mock) {
      await mock.close();
      mock = undefined;
    }
    fs.rmSync(tmpHome, { recursive: true, force: true });
  });

  function writeEnv(apiUrl: string, extra: Record<string, string> = {}) {
    fs.writeFileSync(
      path.join(tmpHome, ".agentsid", "cursor-env.json"),
      JSON.stringify({
        AGENTSID_PROJECT_KEY: "test-key",
        AGENTSID_AGENT_TOKEN: "test-token",
        AGENTSID_API_URL: apiUrl,
        ...extra,
      }),
      { mode: 0o600 }
    );
  }

  it("shell: deny emits Cursor-format permission decision with both messages", async () => {
    mock = await startMock((req) => {
      const cmd = String(req.params.command ?? "");
      return cmd.includes("rm -rf")
        ? {
            allowed: false,
            reason: "Destructive shell command",
            rule: "Bash(*)",
          }
        : { allowed: true };
    });
    writeEnv(mock.url);

    const result = await runAdapter({
      subcommand: "shell",
      stdin: { command: "rm -rf /tmp/x", cwd: "/tmp", sandbox: false },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    const decision = JSON.parse(result.stdout);
    expect(decision.permission).toBe("deny");
    expect(decision.user_message).toMatch(/AgentsID blocked Bash/);
    expect(decision.user_message).toMatch(/Destructive shell command/);
    expect(decision.user_message).toMatch(/rule: Bash\(\*\)/);
    // agent_message reaches the LLM — it needs enough detail for the model
    // to understand why and reason about an alternative.
    expect(decision.agent_message).toMatch(/AgentsID policy denied/);
    expect(decision.agent_message).toMatch(/Destructive shell command/);

    expect(mock.requests).toHaveLength(1);
    expect(mock.requests[0]).toMatchObject({
      tool: "Bash",
      token: "test-token",
      params: { command: "rm -rf /tmp/x" },
    });
  });

  it("shell: allow emits {permission: 'allow'} and nothing else", async () => {
    mock = await startMock(() => ({ allowed: true }));
    writeEnv(mock.url);

    const result = await runAdapter({
      subcommand: "shell",
      stdin: { command: "ls -la", cwd: "/tmp", sandbox: false },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ permission: "allow" });
  });

  it("mcp: passes tool_name + tool_input through unchanged to /validate", async () => {
    mock = await startMock(() => ({ allowed: false, reason: "policy" }));
    writeEnv(mock.url);

    const result = await runAdapter({
      subcommand: "mcp",
      stdin: {
        tool_name: "fetch",
        tool_input: { url: "https://evil.example" },
        url: "http://mcp.server",
      },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    const decision = JSON.parse(result.stdout);
    expect(decision.permission).toBe("deny");
    expect(mock.requests[0]).toMatchObject({
      tool: "fetch",
      params: { url: "https://evil.example" },
    });
  });

  it("mcp: handles tool_input delivered as a JSON string (some Cursor versions)", async () => {
    mock = await startMock(() => ({ allowed: true }));
    writeEnv(mock.url);

    const result = await runAdapter({
      subcommand: "mcp",
      stdin: {
        tool_name: "fetch",
        tool_input: JSON.stringify({ url: "https://ok.example" }),
      },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    expect(mock.requests[0]).toMatchObject({
      tool: "fetch",
      params: { url: "https://ok.example" },
    });
  });

  it("read: normalises file_path as tool=Read with params.file_path", async () => {
    mock = await startMock((req) =>
      req.params.file_path === "/etc/passwd"
        ? { allowed: false, reason: "Sensitive file" }
        : { allowed: true }
    );
    writeEnv(mock.url);

    const result = await runAdapter({
      subcommand: "read",
      stdin: { file_path: "/etc/passwd", content: "..." },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    const decision = JSON.parse(result.stdout);
    expect(decision.permission).toBe("deny");
    expect(mock.requests[0]).toMatchObject({
      tool: "Read",
      params: { file_path: "/etc/passwd" },
    });
  });

  it("audit: logs to stderr only, no /validate call, exit 0", async () => {
    mock = await startMock(() => ({ allowed: true }));
    writeEnv(mock.url);

    const result = await runAdapter({
      subcommand: "audit",
      stdin: { tool_name: "Bash", hook_event_name: "afterShellExecution" },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Bash");
    expect(mock.requests).toHaveLength(0);
  });

  it("fail-open: unreachable /validate endpoint → exit 0, no decision output", async () => {
    // Don't start a mock — point at a closed port. The adapter should fail
    // open (exit 0, no stdout) rather than breaking the user's session.
    writeEnv("http://127.0.0.1:1");

    const result = await runAdapter({
      subcommand: "shell",
      stdin: { command: "echo hi", cwd: "/tmp", sandbox: false },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("missing env file: exit 0 silently (not yet configured → allow)", async () => {
    // Don't call writeEnv — simulates a fresh user who hasn't run the wizard.
    const result = await runAdapter({
      subcommand: "shell",
      stdin: { command: "whatever" },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });

  it("empty creds in env file: exit 0 (treated as unconfigured)", async () => {
    mock = await startMock(() => ({ allowed: false, reason: "should not fire" }));
    fs.writeFileSync(
      path.join(tmpHome, ".agentsid", "cursor-env.json"),
      JSON.stringify({ AGENTSID_PROJECT_KEY: "", AGENTSID_AGENT_TOKEN: "" })
    );

    const result = await runAdapter({
      subcommand: "shell",
      stdin: { command: "rm -rf /" },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    // Verify the adapter never contacted the API with empty creds.
    expect(mock.requests).toHaveLength(0);
  });

  it("deny reason with shell metacharacters stays quoted inside JSON", async () => {
    // A hostile backend or mis-configured rule could return a reason with
    // backticks, quotes, or `$(…)`. The adapter passes REASON via env to the
    // emitter python3 process rather than shell-interpolating it. If that
    // guard ever regresses, this test blows up.
    const evilReason = '"; rm -rf $HOME #`echo pwned`';
    mock = await startMock(() => ({ allowed: false, reason: evilReason }));
    writeEnv(mock.url);

    const result = await runAdapter({
      subcommand: "shell",
      stdin: { command: "ls", cwd: "/tmp", sandbox: false },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    const decision = JSON.parse(result.stdout);
    expect(decision.permission).toBe("deny");
    expect(decision.user_message).toContain(evilReason);
    // No side effect on the test environment — HOME still exists etc.
    expect(fs.existsSync(tmpHome)).toBe(true);
  });

  it("unknown subcommand: exit 0 silently (treated as audit-like no-op)", async () => {
    writeEnv("http://127.0.0.1:1");

    const result = await runAdapter({
      subcommand: "bogus",
      stdin: { whatever: true },
      home: tmpHome,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
  });
});
