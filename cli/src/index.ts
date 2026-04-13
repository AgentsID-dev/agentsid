#!/usr/bin/env node
/**
 * AgentsID CLI
 *
 * Usage:
 *   npx agentsid init [--lang=typescript|python]     Create a project + starter MCP server
 *   npx agentsid register <name> --user <user_id>   Register an agent
 *   npx agentsid list                               List agents
 *   npx agentsid revoke <agent_id>                  Revoke an agent
 *   npx agentsid audit                              View audit log
 *   npx agentsid validate <token>                   Validate a token
 *   npx agentsid introspect <token>                 Full token inspection
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createInterface } from "node:readline";

const CONFIG_DIR = join(homedir(), ".agentsid");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const DEFAULT_BASE_URL = "https://agentsid.dev";

interface Config {
  projectKey?: string;
  projectId?: string;
  baseUrl?: string;
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getBaseUrl(config: Config): string {
  return process.env.AGENTSID_URL || config.baseUrl || DEFAULT_BASE_URL;
}

function getProjectKey(config: Config): string {
  const key = process.env.AGENTSID_PROJECT_KEY || config.projectKey;
  if (!key) {
    console.error("No project key found. Run `agentsid init` first or set AGENTSID_PROJECT_KEY.");
    process.exit(1);
  }
  return key;
}

async function request(
  baseUrl: string,
  method: string,
  path: string,
  body?: unknown,
  authKey?: string,
): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authKey) headers["Authorization"] = `Bearer ${authKey}`;

  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    console.error(`Error ${res.status}: ${data.detail || JSON.stringify(data)}`);
    process.exit(1);
  }
  return data;
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function tsServerTemplate(projectKey: string): string {
  return `import { createHttpMiddleware } from '@agentsid/sdk';
import http from 'http';

const guard = createHttpMiddleware({
  projectKey: process.env.AGENTSID_PROJECT_KEY || '${projectKey}',
});

// Define your tools
const tools = {
  search_notes: async (params) => {
    return { results: ['Note 1', 'Note 2'] };
  },
  save_note: async (params) => {
    return { saved: true };
  },
  delete_note: async (params) => {
    return { deleted: true };
  },
};

// MCP-style tool handler with AgentsID protection
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/tools') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { tool, params, token } = JSON.parse(body);

    // AgentsID validates every tool call
    const auth = await guard.validate(token, tool);
    if (!auth.valid || !auth.permission?.allowed) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Blocked by AgentsID', reason: auth.permission?.reason }));
      return;
    }

    const result = await tools[tool]?.(params) ?? { error: 'Unknown tool' };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ name: 'my-agentsid-server', tools: Object.keys(tools) }));
});

server.listen(3001, () => console.log('Protected MCP server running on http://localhost:3001'));
`;
}

function pyServerTemplate(projectKey: string): string {
  return `import asyncio
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from agentsid import AgentsID

aid = AgentsID(project_key="${projectKey}")

tools = {
    "search_notes": lambda params: {"results": ["Note 1", "Note 2"]},
    "save_note": lambda params: {"saved": True},
    "delete_note": lambda params: {"deleted": True},
}

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/tools":
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length))
            tool, params, token = data["tool"], data.get("params", {}), data["token"]

            # AgentsID validates every tool call
            loop = asyncio.new_event_loop()
            result = loop.run_until_complete(aid.validate(token, tool))
            if not result.get("valid") or not result.get("permission", {}).get("allowed"):
                self.send_response(403)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Blocked by AgentsID"}).encode())
                return

            output = tools.get(tool, lambda p: {"error": "Unknown tool"})(params)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(output).encode())

if __name__ == "__main__":
    server = HTTPServer(("", 3001), Handler)
    print("Protected MCP server running on http://localhost:3001")
    server.serve_forever()
`;
}

// ═══════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════

async function cmdInit() {
  const config = loadConfig();
  const baseUrl = getBaseUrl(config);

  const name = args[1] || "My Project";
  const email = args.find((a) => a.startsWith("--email="))?.split("=")[1];

  console.log(`Creating project "${name}"...`);
  const data = await request(baseUrl, "POST", "/projects/", { name, email });

  saveConfig({
    ...config,
    projectKey: data.api_key,
    projectId: data.project.id,
    baseUrl,
  });

  console.log(`\nProject created!`);
  console.log(`  ID:      ${data.project.id}`);
  console.log(`  API Key: ${data.api_key}`);
  console.log(`\nConfig saved to ${CONFIG_FILE}`);

  // Scaffold a starter MCP server
  const langArg = args.find((a) => a.startsWith("--lang="))?.split("=")[1];
  const langAnswer = langArg || await prompt("\nLanguage for starter MCP server? [typescript/python] (default: typescript): ");
  const lang = langAnswer.toLowerCase().startsWith("p") ? "python" : "typescript";

  const projectKey = data.api_key;
  const outputDir = process.cwd();

  if (lang === "python") {
    const fileName = "agentsid_server.py";
    const filePath = join(outputDir, fileName);
    writeFileSync(filePath, pyServerTemplate(projectKey));
    console.log(`\n  Created ${fileName}`);
    console.log(`\nNext steps:`);
    console.log(`  1. pip install agentsid`);
    console.log(`  2. python ${fileName}`);
    console.log(`  3. Open https://agentsid.dev/dashboard to see your agents`);
  } else {
    const fileName = "agentsid-server.mjs";
    const filePath = join(outputDir, fileName);
    writeFileSync(filePath, tsServerTemplate(projectKey));
    console.log(`\n  Created ${fileName}`);
    console.log(`\nNext steps:`);
    console.log(`  1. npm install @agentsid/sdk`);
    console.log(`  2. node ${fileName}`);
    console.log(`  3. Open https://agentsid.dev/dashboard to see your agents`);
  }
}

async function cmdRegister() {
  const config = loadConfig();
  const baseUrl = getBaseUrl(config);
  const key = getProjectKey(config);

  const name = args[1];
  if (!name) {
    console.error("Usage: agentsid register <agent-name> --user <user_id> [--permissions search,save] [--ttl 24]");
    process.exit(1);
  }

  const userId = args.find((a) => a.startsWith("--user="))?.split("=")[1]
    || args[args.indexOf("--user") + 1];
  if (!userId) {
    console.error("--user <user_id> is required");
    process.exit(1);
  }

  const permsArg = args.find((a) => a.startsWith("--permissions="))?.split("=")[1]
    || args[args.indexOf("--permissions") + 1];
  const permissions = permsArg ? permsArg.split(",") : undefined;

  const ttlArg = args.find((a) => a.startsWith("--ttl="))?.split("=")[1]
    || args[args.indexOf("--ttl") + 1];
  const ttlHours = ttlArg ? parseInt(ttlArg) : undefined;

  const data = await request(baseUrl, "POST", "/agents/", {
    name,
    on_behalf_of: userId,
    permissions,
    ttl_hours: ttlHours,
  }, key);

  console.log(`\nAgent registered!`);
  console.log(`  ID:      ${data.agent.id}`);
  console.log(`  Name:    ${data.agent.name}`);
  console.log(`  Token:   ${data.token}`);
  console.log(`  Expires: ${data.expires_at}`);
  console.log(`\nSave the token — it won't be shown again.`);
}

async function cmdList() {
  const config = loadConfig();
  const baseUrl = getBaseUrl(config);
  const key = getProjectKey(config);

  const status = args.find((a) => a.startsWith("--status="))?.split("=")[1];
  const qs = status ? `?status=${status}` : "";

  const agents = await request(baseUrl, "GET", `/agents/${qs}`, undefined, key);

  if (agents.length === 0) {
    console.log("No agents found.");
    return;
  }

  console.log(`\n${"ID".padEnd(30)} ${"Name".padEnd(20)} ${"Status".padEnd(10)} ${"Created By".padEnd(15)} Expires`);
  console.log("─".repeat(100));
  for (const a of agents) {
    console.log(
      `${a.id.padEnd(30)} ${a.name.padEnd(20)} ${a.status.padEnd(10)} ${a.created_by.padEnd(15)} ${a.expires_at || "never"}`
    );
  }
  console.log(`\n${agents.length} agent(s)`);
}

async function cmdRevoke() {
  const config = loadConfig();
  const baseUrl = getBaseUrl(config);
  const key = getProjectKey(config);

  const agentId = args[1];
  if (!agentId) {
    console.error("Usage: agentsid revoke <agent_id>");
    process.exit(1);
  }

  await request(baseUrl, "DELETE", `/agents/${agentId}`, undefined, key);
  console.log(`Agent ${agentId} revoked. All tokens invalidated.`);
}

async function cmdValidate() {
  const config = loadConfig();
  const baseUrl = getBaseUrl(config);
  const key = getProjectKey(config);

  const token = args[1];
  if (!token) {
    console.error("Usage: agentsid validate <token> [--tool <tool_name>]");
    process.exit(1);
  }

  const tool = args.find((a) => a.startsWith("--tool="))?.split("=")[1]
    || args[args.indexOf("--tool") + 1];

  const data = await request(baseUrl, "POST", "/validate", { token, tool }, key);

  if (data.valid) {
    console.log(`\n  Valid:        ${data.valid}`);
    console.log(`  Agent:        ${data.agent_id}`);
    console.log(`  Project:      ${data.project_id}`);
    console.log(`  Delegated by: ${data.delegated_by}`);
    console.log(`  Expires:      ${new Date(data.expires_at * 1000).toISOString()}`);
    if (data.permission) {
      console.log(`  Permission:   ${data.permission.allowed ? "ALLOWED" : "DENIED"} — ${data.permission.reason}`);
    }
  } else {
    console.log(`\n  Valid: false`);
    console.log(`  Reason: ${data.reason}`);
  }
}

async function cmdAudit() {
  const config = loadConfig();
  const baseUrl = getBaseUrl(config);
  const key = getProjectKey(config);

  const agentId = args.find((a) => a.startsWith("--agent="))?.split("=")[1];
  const limit = args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "20";

  const params = [`limit=${limit}`];
  if (agentId) params.push(`agent_id=${agentId}`);

  const data = await request(baseUrl, "GET", `/audit/?${params.join("&")}`, undefined, key);

  if (data.entries.length === 0) {
    console.log("No audit entries found.");
    return;
  }

  console.log(`\n${"Time".padEnd(22)} ${"Agent".padEnd(28)} ${"Tool".padEnd(20)} ${"Action".padEnd(8)} Result`);
  console.log("─".repeat(100));
  for (const e of data.entries) {
    const time = new Date(e.created_at).toISOString().slice(0, 19).replace("T", " ");
    console.log(
      `${time.padEnd(22)} ${e.agent_id.padEnd(28)} ${e.tool.padEnd(20)} ${e.action.padEnd(8)} ${e.result}`
    );
  }
  console.log(`\n${data.total} total entries (showing ${data.entries.length})`);
}

async function cmdHelp() {
  console.log(`
AgentsID CLI — Identity and auth for AI agents

Commands:
  init [name] [--lang=ts|python]   Create a project, scaffold MCP server
  register <name> --user <id>      Register an agent
  list [--status active|revoked]   List agents
  revoke <agent_id>                Revoke an agent
  validate <token> [--tool name]   Validate a token
  audit [--agent <id>] [--limit N] View audit log
  help                             Show this help

Options:
  --user <id>              Human authorizing the agent
  --permissions <a,b,c>    Comma-separated tool patterns
  --ttl <hours>            Token lifetime (default: 24, max: 720)

Environment:
  AGENTSID_PROJECT_KEY     Project API key (overrides config)
  AGENTSID_URL             Server URL (default: https://agentsid.dev)

Config: ~/.agentsid/config.json
`);
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

const args: string[] = process.argv.slice(2);
const command: string | undefined = args[0];

const commands: Record<string, () => Promise<void>> = {
  init: cmdInit,
  register: cmdRegister,
  list: cmdList,
  revoke: cmdRevoke,
  validate: cmdValidate,
  audit: cmdAudit,
  help: cmdHelp,
};

const fn = commands[command || "help"];
if (!fn) {
  console.error(`Unknown command: ${command}. Run "agentsid help" for usage.`);
  process.exit(1);
}

fn().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
