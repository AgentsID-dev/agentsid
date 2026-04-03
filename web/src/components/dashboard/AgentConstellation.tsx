// ─── Agent Constellation ───
// Animated SVG visualization of agents orbiting a central hub

import { useState, useCallback, useMemo, useRef } from "react";
import type { Agent } from "./types";
import { effectiveStatus } from "./utils";

interface AgentConstellationProps {
  readonly agents: readonly Agent[];
  readonly onAgentClick: (agentId: string) => void;
}

interface NodePosition {
  readonly x: number;
  readonly y: number;
  readonly agent: Agent;
  readonly size: number;
  readonly color: string;
  readonly opacity: number;
  readonly floatDelay: number;
  readonly floatDuration: number;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 360;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = SVG_HEIGHT / 2;
const HUB_RADIUS = 18;

function statusColor(status: string): string {
  switch (status) {
    case "active":
      return "#16a34a";
    case "expiring":
      return "#d97706";
    case "revoked":
      return "#dc2626";
    default:
      return "#9b9bab";
  }
}

function computeNodePositions(
  agents: readonly Agent[],
): readonly NodePosition[] {
  if (agents.length === 0) return [];

  // Group agents by creator
  const creators: Record<string, readonly Agent[]> = {};
  const creatorOrder: string[] = [];

  for (const agent of agents) {
    const creator = agent.created_by || "unknown";
    if (!creators[creator]) {
      creatorOrder.push(creator);
      creators[creator] = [];
    }
    creators[creator] = [...(creators[creator] ?? []), agent];
  }

  const positions: NodePosition[] = [];

  creatorOrder.forEach((creator, ci) => {
    const angle =
      (ci / creatorOrder.length) * Math.PI * 2 - Math.PI / 2;
    const agentList = creators[creator] ?? [];

    agentList.forEach((agent, ai) => {
      const agentAngle =
        angle + (ai - (agentList.length - 1) / 2) * 0.4;
      // Use deterministic "random" based on agent id
      const idHash = agent.id
        .split("")
        .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const pseudoRandom = (idHash % 100) / 100;
      const r =
        Math.min(SVG_WIDTH, SVG_HEIGHT) * (0.25 + pseudoRandom * 0.12);
      const ax = CENTER_X + r * Math.cos(agentAngle);
      const ay = CENTER_Y + r * Math.sin(agentAngle);

      const status = effectiveStatus(agent);
      const color = statusColor(status);
      const size = 10 + Math.min(20, (agent.name || "").length);

      positions.push({
        x: ax,
        y: ay,
        agent,
        size,
        color,
        opacity: status === "active" ? 0.9 : 0.5,
        floatDelay: (idHash % 60) / 10,
        floatDuration: 5 + (idHash % 40) / 10,
      });
    });
  });

  return positions;
}

function AgentConstellation({
  agents,
  onAgentClick,
}: AgentConstellationProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const positions = useMemo(() => computeNodePositions(agents), [agents]);

  const hoveredAgent = useMemo(() => {
    if (!hoveredId) return null;
    return agents.find((a) => a.id === hoveredId) ?? null;
  }, [hoveredId, agents]);

  const handleMouseEnter = useCallback(
    (agentId: string, x: number, y: number) => {
      setHoveredId(agentId);
      // Position tooltip, flip if too far right
      const tx = x + 20 > SVG_WIDTH - 180 ? x - 170 : x + 20;
      setTooltipPos({ x: tx, y: y - 10 });
    },
    [],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleClick = useCallback(
    (agentId: string) => {
      onAgentClick(agentId);
    },
    [onAgentClick],
  );

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <span className="text-4xl mb-2">{"\uD83C\uDF1F"}</span>
        <p className="text-sm">No agents to visualize</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ height: SVG_HEIGHT }}
    >
      {/* Connection lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="hubGlow">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Hub glow */}
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={40}
          fill="url(#hubGlow)"
          className="animate-pulse"
        />

        {/* Connection lines from center to each agent */}
        {positions.map((pos) => (
          <line
            key={`line-${pos.agent.id}`}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={pos.x}
            y2={pos.y}
            stroke="rgba(124, 91, 240, 0.08)"
            strokeWidth="1"
          />
        ))}
      </svg>

      {/* Agent nodes */}
      {positions.map((pos) => (
        <button
          key={pos.agent.id}
          className="absolute rounded-full transition-transform duration-200 hover:scale-150 cursor-pointer border-0 p-0"
          style={{
            left: `${(pos.x / SVG_WIDTH) * 100}%`,
            top: `${(pos.y / SVG_HEIGHT) * 100}%`,
            width: pos.size,
            height: pos.size,
            background: pos.color,
            boxShadow: `0 0 ${pos.size}px ${pos.color}`,
            opacity: pos.opacity,
            transform: "translate(-50%, -50%)",
            animation: `constellation-float ${pos.floatDuration}s ease-in-out infinite`,
            animationDelay: `${pos.floatDelay}s`,
          }}
          onMouseEnter={() => handleMouseEnter(pos.agent.id, pos.x, pos.y)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(pos.agent.id)}
          aria-label={`Agent: ${pos.agent.name}`}
        />
      ))}

      {/* Central hub */}
      <div
        className="absolute rounded-full flex items-center justify-center font-extrabold text-sm text-white z-10"
        style={{
          left: `${(CENTER_X / SVG_WIDTH) * 100}%`,
          top: `${(CENTER_Y / SVG_HEIGHT) * 100}%`,
          width: HUB_RADIUS * 2,
          height: HUB_RADIUS * 2,
          transform: "translate(-50%, -50%)",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          boxShadow: "0 0 30px rgba(124, 91, 240, 0.3)",
        }}
      >
        A
      </div>

      {/* Tooltip */}
      {hoveredAgent && (
        <div
          className="absolute bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg z-20 pointer-events-none"
          style={{
            left: `${(tooltipPos.x / SVG_WIDTH) * 100}%`,
            top: `${(tooltipPos.y / SVG_HEIGHT) * 100}%`,
          }}
        >
          <div className="font-semibold text-foreground">
            {hoveredAgent.name}
          </div>
          <div className="text-muted-foreground mt-0.5">
            Status:{" "}
            <span
              style={{
                color: statusColor(effectiveStatus(hoveredAgent)),
              }}
            >
              {effectiveStatus(hoveredAgent)}
            </span>
          </div>
          <div className="text-muted-foreground">
            Created by: {hoveredAgent.created_by}
          </div>
        </div>
      )}

      {/* Float animation keyframes */}
      <style>{`
        @keyframes constellation-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

export { AgentConstellation };
