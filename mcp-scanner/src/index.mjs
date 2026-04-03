#!/usr/bin/env node
/**
 * AgentsID MCP Scanner
 *
 * Scans MCP servers for security issues and looks up pre-scanned results
 * from the AgentsID public registry.
 *
 * Usage:
 *   claude mcp add agentsid-scanner -- npx @agentsid/mcp-scanner
 *
 * Tools:
 *   scan_mcp                — Run a live security scan on any MCP server
 *   lookup_mcp              — Look up a pre-scanned server from the registry
 *   get_server_session_info — Check what authentication a server requires
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { scanStdio, scanHttp } from "@agentsid/scanner/src/scanner.mjs";

const REGISTRY_API = "https://agentsid.dev/api/registry";

const TOOLS = [
  {
    name: "scan_mcp",
    description:
      "Runs a security scan on a specific MCP server and returns its trust score (0–100), " +
      "letter grade (A–F), and list of security findings. " +
      "Provide an npx command (e.g. 'npx @modelcontextprotocol/server-github') or an HTTP URL. " +
      "The scan checks only the named server's tool descriptions and input schemas. " +
      "Returns JSON with score, grade, and findings.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          maxLength: 512,
          description:
            "The MCP server to scan. An npx command (e.g. 'npx @modelcontextprotocol/server-github') " +
            "or an HTTP URL (e.g. 'https://my-mcp-server.example.com/mcp'). " +
            "Scans only the specified server.",
        },
        env: {
          type: "object",
          description:
            "Optional environment variables to pass to the server process, " +
            "such as API keys the server requires to start.",
          additionalProperties: { type: "string" },
        },
      },
      required: ["target"],
    },
  },
  {
    name: "lookup_mcp",
    description:
      "Looks up a pre-scanned MCP server's trust score, grade, and findings from the AgentsID registry. " +
      "Returns cached results for the specific named package without spawning any process. " +
      "Use this to check a known package before installing it.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          maxLength: 256,
          description:
            "The registry slug for the specific server to look up. " +
            "Typically the npm package name with slashes replaced by hyphens " +
            "(e.g. 'modelcontextprotocol-server-github' for '@modelcontextprotocol/server-github').",
        },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_server_session_info",
    description:
      "Checks the session posture for a specific MCP server from its registry report. " +
      "Returns whether the specific server exposes session-related tools, what external services it connects to, " +
      "and whether its profile indicates it handles sensitive user data. " +
      "Useful for evaluating a specific server before connecting an agent to it.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          maxLength: 256,
          description:
            "The registry slug for the specific server to check. " +
            "(e.g. 'modelcontextprotocol-server-github')",
        },
      },
      required: ["slug"],
    },
  },
];

// ─── Handlers ───

async function handleScanMcp({ target, env: extraEnv = {} }) {
  if (!target || typeof target !== "string") {
    return { content: [{ type: "text", text: JSON.stringify({ error: "target is required" }) }] };
  }
  if (target.length > 512) {
    return { content: [{ type: "text", text: JSON.stringify({ error: "target exceeds maximum length" }) }] };
  }

  try {
    const isHttp = target.startsWith("http://") || target.startsWith("https://");
    const result = isHttp
      ? await scanHttp(target, { json: true, env: extraEnv })
      : await scanStdio(target, { json: true, env: extraEnv });

    const parsed = typeof result === "string" ? JSON.parse(result) : result;

    const summary = {
      server: parsed.server?.name ?? target,
      version: parsed.server?.version ?? "unknown",
      toolCount: parsed.toolCount ?? 0,
      score: parsed.grade?.score ?? 0,
      grade: parsed.grade?.overall ?? "F",
      categories: parsed.grade?.categories ?? {},
      findings: {
        critical: parsed.summary?.CRITICAL ?? 0,
        high: parsed.summary?.HIGH ?? 0,
        medium: parsed.summary?.MEDIUM ?? 0,
        low: parsed.summary?.LOW ?? 0,
      },
      topFindings: (parsed.findings ?? [])
        .filter((f) => f.severity === "CRITICAL" || f.severity === "HIGH")
        .slice(0, 10)
        .map((f) => ({ severity: f.severity, category: f.category, tool: f.tool, detail: f.detail })),
    };

    return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
  } catch (err) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: err.message, target }) }],
    };
  }
}

async function fetchRegistry(slug) {
  const res = await fetch(`${REGISTRY_API}/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Registry API error: ${res.status}`);
  return res.json();
}

async function handleLookupMcp({ slug }) {
  if (!slug || typeof slug !== "string") {
    return { content: [{ type: "text", text: JSON.stringify({ error: "slug is required" }) }] };
  }

  try {
    const data = await fetchRegistry(slug);
    if (!data) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: `No registry entry found for: ${slug}`,
            hint: "Use scan_mcp to run a live scan instead.",
          }),
        }],
      };
    }
    const { riskProfile, ...rest } = data;
    const result = {
      ...rest,
      ...(riskProfile && Object.keys(riskProfile).length > 0 ? { riskProfile } : {}),
    };
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
  }
}

async function handleGetServerSessionInfo({ slug }) {
  if (!slug || typeof slug !== "string") {
    return { content: [{ type: "text", text: JSON.stringify({ error: "slug is required" }) }] };
  }

  try {
    const data = await fetchRegistry(slug);
    if (!data) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: `No registry entry found for: ${slug}`,
            hint: "Use scan_mcp to run a live scan instead.",
          }),
        }],
      };
    }

    const riskProfile = data.riskProfile ?? {};
    const authFindings = (data.topFindings ?? []).filter(
      (f) => f.category === "auth" || f.rule?.includes("auth")
    );

    const result = {
      slug,
      server: data.server,
      requiresCredentials: (riskProfile.credential_access ?? 0) > 0,
      requiresPrivilegedAccess: (riskProfile.privilege ?? 0) > 0,
      authFindings,
      recommendation:
        (riskProfile.credential_access ?? 0) > 0
          ? "Server accesses credentials — review what keys it requests before connecting."
          : "No credential access detected in this server's tool descriptions.",
      registryUrl: data.registryUrl,
    };

    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }] };
  }
}

// ─── Server ───

const server = new Server(
  { name: "agentsid-scanner", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "scan_mcp") return handleScanMcp(args ?? {});
  if (name === "lookup_mcp") return handleLookupMcp(args ?? {});
  if (name === "get_server_session_info") return handleGetServerSessionInfo(args ?? {});

  return {
    content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AgentsID Scanner running — scan_mcp, lookup_mcp, get_server_session_info ready");
}

main().catch((err) => {
  console.error("Failed to start AgentsID Scanner:", err);
  process.exit(1);
});
