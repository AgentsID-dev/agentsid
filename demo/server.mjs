/**
 * AgentsID Demo — A real MCP server protected by AgentsID
 *
 * Tools:
 *   - search_notes: Search through notes (ALLOWED)
 *   - save_note: Save a new note (ALLOWED)
 *   - list_notes: List all notes (ALLOWED)
 *   - delete_note: Delete a note (DENIED by AgentsID)
 *   - admin_reset: Reset everything (DENIED by AgentsID)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ── Config ──
const AGENTSID_PROJECT_KEY = process.env.AGENTSID_PROJECT_KEY;
const AGENTSID_AGENT_TOKEN = process.env.AGENTSID_AGENT_TOKEN;
const AGENTSID_URL = process.env.AGENTSID_URL || 'https://agentsid.dev';

// ── In-memory notes store ──
const notes = [
  { id: 1, title: 'Welcome', content: 'This MCP server is protected by AgentsID!' },
  { id: 2, title: 'Architecture', content: 'We use FastAPI + PostgreSQL + HMAC tokens' },
  { id: 3, title: 'Launch Plan', content: 'Show HN post, Reddit, Twitter thread' },
];
let nextId = 4;

// ── AgentsID Middleware ──
async function validateToolCall(toolName, params) {
  if (!AGENTSID_PROJECT_KEY || !AGENTSID_AGENT_TOKEN) {
    console.error('[AgentsID] No credentials configured — running WITHOUT protection');
    return { allowed: true, reason: 'No AgentsID configured' };
  }

  try {
    const res = await fetch(`${AGENTSID_URL}/api/v1/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENTSID_PROJECT_KEY}`,
      },
      body: JSON.stringify({
        token: AGENTSID_AGENT_TOKEN,
        tool: toolName,
        params: params || {},
      }),
    });

    const data = await res.json();

    if (!data.valid) {
      console.error(`[AgentsID] Token invalid: ${data.reason}`);
      return { allowed: false, reason: data.reason };
    }

    const perm = data.permission || {};
    console.error(`[AgentsID] ${toolName}: ${perm.allowed ? 'ALLOWED' : 'DENIED'} — ${perm.reason || ''}`);

    return {
      allowed: perm.allowed || false,
      reason: perm.reason || 'Unknown',
      pending_approval: perm.pending_approval || false,
    };
  } catch (err) {
    console.error(`[AgentsID] Validation error: ${err.message}`);
    return { allowed: false, reason: 'AgentsID unreachable — failing closed' };
  }
}

// ── MCP Server ──
const server = new McpServer({
  name: 'AgentsID Demo Notes',
  version: '1.0.0',
});

// Tool: search_notes
server.tool(
  'search_notes',
  'Search through notes by keyword',
  { query: z.string().describe('Search keyword') },
  async ({ query }) => {
    const check = await validateToolCall('search_notes', { query });
    if (!check.allowed) {
      return { content: [{ type: 'text', text: `BLOCKED by AgentsID: ${check.reason}` }] };
    }
    const results = notes.filter(n =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.content.toLowerCase().includes(query.toLowerCase())
    );
    return {
      content: [{ type: 'text', text: results.length > 0
        ? results.map(n => `[${n.id}] ${n.title}: ${n.content}`).join('\n')
        : 'No notes found.'
      }],
    };
  }
);

// Tool: save_note
server.tool(
  'save_note',
  'Save a new note',
  {
    title: z.string().describe('Note title'),
    content: z.string().describe('Note content'),
  },
  async ({ title, content }) => {
    const check = await validateToolCall('save_note', { title });
    if (!check.allowed) {
      return { content: [{ type: 'text', text: `BLOCKED by AgentsID: ${check.reason}` }] };
    }
    const note = { id: nextId++, title, content };
    notes.push(note);
    return { content: [{ type: 'text', text: `Note saved: [${note.id}] ${note.title}` }] };
  }
);

// Tool: list_notes
server.tool(
  'list_notes',
  'List all notes',
  {},
  async () => {
    const check = await validateToolCall('list_notes');
    if (!check.allowed) {
      return { content: [{ type: 'text', text: `BLOCKED by AgentsID: ${check.reason}` }] };
    }
    return {
      content: [{ type: 'text', text: notes.map(n => `[${n.id}] ${n.title}: ${n.content}`).join('\n') }],
    };
  }
);

// Tool: delete_note (DENIED by AgentsID — not in permissions)
server.tool(
  'delete_note',
  'Delete a note by ID',
  { id: z.number().describe('Note ID to delete') },
  async ({ id }) => {
    const check = await validateToolCall('delete_note', { id });
    if (!check.allowed) {
      return { content: [{ type: 'text', text: `BLOCKED by AgentsID: ${check.reason}` }] };
    }
    const idx = notes.findIndex(n => n.id === id);
    if (idx === -1) return { content: [{ type: 'text', text: 'Note not found' }] };
    const deleted = notes.splice(idx, 1)[0];
    return { content: [{ type: 'text', text: `Deleted: [${deleted.id}] ${deleted.title}` }] };
  }
);

// Tool: admin_reset (DENIED by AgentsID — not in permissions)
server.tool(
  'admin_reset',
  'Reset all notes — DANGEROUS',
  {},
  async () => {
    const check = await validateToolCall('admin_reset');
    if (!check.allowed) {
      return { content: [{ type: 'text', text: `BLOCKED by AgentsID: ${check.reason}` }] };
    }
    notes.length = 0;
    nextId = 1;
    return { content: [{ type: 'text', text: 'All notes deleted. Database reset.' }] };
  }
);

// ── Start ──
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('[AgentsID Demo] MCP server running with AgentsID protection');
