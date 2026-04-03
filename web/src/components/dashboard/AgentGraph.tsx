// ─── Agent Relationship Graph ───
// Interactive React Flow canvas showing agents as draggable nodes around a central project hub

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Agent, AuditStats } from "./types";
import {
  agentColor,
  agentInitial,
  agentPersonality,
  effectiveStatus,
} from "./utils";
import { AgentsIDLogo } from "@/components/blocks/logo";

// ─── Constants ───

const HUB_ID = "__project_hub__";
const CIRCLE_RADIUS = 250;

const STATUS_DOT_CLASS: Record<string, string> = {
  active: "bg-green-500",
  expiring: "bg-amber-500 animate-pulse",
  revoked: "bg-red-500",
  expired: "bg-gray-400",
};

// ─── Props ───

interface AgentGraphProps {
  readonly agents: readonly Agent[];
  readonly apiKey: string;
  readonly projectInfo: { name: string; plan: string; id: string } | null;
  readonly auditStats: AuditStats | null;
  readonly onAgentSelect: (agentId: string) => void;
}

// ─── Hub Node Data ───

interface HubNodeData {
  readonly label: string;
  readonly plan: string;
  readonly agentCount: number;
  [key: string]: unknown;
}

// ─── Agent Node Data ───

interface AgentNodeData {
  readonly agentId: string;
  readonly name: string;
  readonly initial: string;
  readonly color: string;
  readonly status: string;
  readonly permCount: number;
  readonly personality: string;
  readonly hasDenyPulse: boolean;
  readonly hasActivityPulse: boolean;
  readonly onSelect: (id: string) => void;
  [key: string]: unknown;
}

// ─── Custom Hub Node ───

function ProjectHubNode({ data }: NodeProps<Node<HubNodeData>>) {
  const planLabel = (data.plan ?? "free").toUpperCase();

  return (
    <div className="bg-white border-2 border-primary rounded-xl shadow-md px-5 py-4 w-[180px] text-center">
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
      <div className="flex items-center justify-center mb-2">
        <AgentsIDLogo className="w-7 h-7" />
      </div>
      <div className="text-sm font-bold tracking-tight truncate">{data.label}</div>
      <div className="flex items-center justify-center gap-2 mt-1.5">
        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
          {planLabel}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {data.agentCount} agent{data.agentCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ─── Custom Agent Node ───

function AgentNode({ data }: NodeProps<Node<AgentNodeData>>) {
  const handleClick = useCallback(() => {
    data.onSelect(data.agentId);
  }, [data]);

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer px-4 py-3 w-[160px] relative group"
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="target" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Top} id="src-top" className="!bg-transparent !border-none !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="src-bottom" className="!bg-transparent !border-none !w-0 !h-0" />

      {/* Pulse rings */}
      {data.hasDenyPulse && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400 animate-ping opacity-60" />
      )}
      {data.hasActivityPulse && !data.hasDenyPulse && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-40" />
      )}

      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: data.color }}
        >
          {data.initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate leading-tight">{data.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT_CLASS[data.status] ?? "bg-gray-400"}`} />
            <span className="text-[10px] text-muted-foreground capitalize">{data.status}</span>
          </div>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-muted-foreground truncate">{data.personality}</span>
        <span className="text-[9px] font-semibold bg-primary/10 text-primary px-1 py-px rounded border border-primary/20">
          {data.permCount}
        </span>
      </div>
    </div>
  );
}

// ─── Node Types (stable reference) ───

const NODE_TYPES = {
  hub: ProjectHubNode,
  agent: AgentNode,
};

// ─── Graph Layout Builder ───

function buildGraphElements(
  agents: readonly Agent[],
  projectInfo: { name: string; plan: string; id: string } | null,
  auditStats: AuditStats | null,
  onAgentSelect: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Hub node at center
  nodes.push({
    id: HUB_ID,
    type: "hub",
    position: { x: 0, y: 0 },
    draggable: true,
    data: {
      label: projectInfo?.name ?? "Project",
      plan: projectInfo?.plan ?? "free",
      agentCount: agents.length,
    },
  });

  // Build agent ID set for delegation detection
  const agentIdSet = new Set(agents.map((a) => a.id));

  // Place agents in a circle
  const count = agents.length;
  const denyRate = auditStats?.deny_rate_pct ?? 0;
  const totalEvents = auditStats?.total_events ?? 0;

  agents.forEach((agent, index) => {
    const angle = (2 * Math.PI * index) / Math.max(count, 1) - Math.PI / 2;
    const x = Math.cos(angle) * CIRCLE_RADIUS;
    const y = Math.sin(angle) * CIRCLE_RADIUS;

    const status = effectiveStatus(agent);
    const personality = agentPersonality(denyRate / Math.max(count, 1), totalEvents);
    const permCount = agent.permissions?.length ?? 0;

    // Heuristic: agents with high deny rate get deny pulse
    const hasDenyPulse = denyRate > 20 && status === "active";
    const hasActivityPulse = totalEvents > 0 && status === "active" && !hasDenyPulse;

    nodes.push({
      id: agent.id,
      type: "agent",
      position: { x, y },
      draggable: true,
      data: {
        agentId: agent.id,
        name: agent.name,
        initial: agentInitial(agent.name),
        color: agentColor(agent.id),
        status,
        permCount,
        personality: `${personality.emoji} ${personality.label}`,
        hasDenyPulse,
        hasActivityPulse,
        onSelect: onAgentSelect,
      },
    });

    // Hub-to-agent edge
    edges.push({
      id: `hub-${agent.id}`,
      source: HUB_ID,
      target: agent.id,
      type: "default",
      style: { stroke: "#e8e5e0", strokeWidth: 1 },
      animated: false,
    });

    // Delegation edge: if created_by matches another agent's ID
    if (agentIdSet.has(agent.created_by)) {
      edges.push({
        id: `delegation-${agent.created_by}-${agent.id}`,
        source: agent.created_by,
        target: agent.id,
        type: "default",
        animated: true,
        style: {
          stroke: "#f59e0b",
          strokeWidth: 2,
          strokeDasharray: "6 3",
        },
        markerEnd: {
          type: "arrowclosed" as const,
          color: "#f59e0b",
          width: 16,
          height: 16,
        },
      });
    }
  });

  return { nodes, edges };
}

// ─── Main Component ───

function AgentGraph({
  agents,
  apiKey: _apiKey,
  projectInfo,
  auditStats,
  onAgentSelect,
}: AgentGraphProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = buildGraphElements(
      agents,
      projectInfo,
      auditStats,
      onAgentSelect,
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [agents, projectInfo, auditStats, onAgentSelect]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] text-muted-foreground text-sm">
        No agents to display. Register an agent to see the relationship graph.
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] rounded-2xl border border-border overflow-hidden bg-[#faf9f7]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        nodesDraggable={true}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="[&_.react-flow__node]:!bg-transparent [&_.react-flow__edge-path]:transition-colors"
      >
        <Background color="#e8e5e0" gap={20} size={1} />
        <Controls
          position="top-right"
          showInteractive={false}
          className="!bg-white !border-border !rounded-lg !shadow-sm [&_button]:!bg-white [&_button]:!border-border [&_button]:!text-foreground [&_button:hover]:!bg-primary/5"
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.id === HUB_ID) return "#f59e0b";
            const agentData = node.data as AgentNodeData | undefined;
            return agentData?.color ?? "#e8e5e0";
          }}
          maskColor="rgba(250, 249, 247, 0.7)"
          className="!bg-white !border-border !rounded-lg !shadow-sm"
          pannable
          zoomable={false}
        />
      </ReactFlow>
    </div>
  );
}

export { AgentGraph };
