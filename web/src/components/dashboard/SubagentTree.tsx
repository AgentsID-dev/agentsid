// ─── SubagentTree ───
// Renders the parent → child subagent lineage for a given root agent.
// Fetched from GET /api/v1/agents/:id/lineage.

import { useEffect, useState } from "react";
import type { LineageNode } from "./types";
import { apiFetch } from "./utils";

interface SubagentTreeProps {
  readonly apiKey: string;
  readonly rootAgentId: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  "code-reviewer": "bg-purple-500/20 text-purple-300 border-purple-500/40",
  explorer: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Explore: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  Plan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  "build-error-resolver": "bg-amber-500/20 text-amber-300 border-amber-500/40",
  "tdd-guide": "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  "general-purpose": "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

function typeBadge(agentType: string | null): string {
  if (!agentType) return "bg-slate-500/20 text-slate-400 border-slate-500/40";
  return TYPE_COLORS[agentType] ?? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40";
}

function TreeNode({ node, depth }: { readonly node: LineageNode; readonly depth: number }) {
  const statusColor =
    node.status === "active"
      ? "text-emerald-400"
      : node.status === "revoked"
        ? "text-rose-400"
        : "text-slate-500";

  return (
    <div className="font-mono text-sm">
      <div
        className="flex items-center gap-2 py-1"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
        {depth > 0 && <span className="text-slate-600">└─</span>}
        <span
          className={`inline-block rounded border px-2 py-0.5 text-xs ${typeBadge(node.agent_type)}`}
        >
          {node.agent_type ?? "root"}
        </span>
        <span className="text-slate-300">{node.name}</span>
        <span className="text-xs text-slate-500">{node.id}</span>
        <span className={`text-xs ${statusColor}`}>● {node.status}</span>
      </div>
      {node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function SubagentTree({ apiKey, rootAgentId }: SubagentTreeProps) {
  const [tree, setTree] = useState<LineageNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rootAgentId || !apiKey) {
      setTree(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");

    apiFetch<LineageNode>(apiKey, `/agents/${rootAgentId}/lineage`)
      .then((data) => {
        if (!cancelled) setTree(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load lineage";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, rootAgentId]);

  if (!rootAgentId) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-slate-500">
        Select an agent to see its subagent tree.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-slate-500">
        Loading lineage…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-6 text-rose-300">
        {error}
      </div>
    );
  }

  if (!tree) return null;

  const totalDescendants = countDescendants(tree);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Subagent Lineage</h3>
        <span className="text-xs text-slate-500">
          {totalDescendants} descendant{totalDescendants === 1 ? "" : "s"}
        </span>
      </div>
      <TreeNode node={tree} depth={0} />
    </div>
  );
}

function countDescendants(node: LineageNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child);
  }
  return count;
}
