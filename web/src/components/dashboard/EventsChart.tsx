// ─── Events Time-Series Chart (Last 7 Days) ───
// Pure SVG chart showing allowed vs denied events bucketed by day

import { useState, useEffect, useMemo, useCallback } from "react";
import type { AuditEntry } from "./types";
import { apiFetch } from "./utils";

// ─── Props ───

interface EventsChartProps {
  readonly apiKey: string;
}

// ─── Types ───

interface DayBucket {
  readonly date: string;
  readonly label: string;
  readonly allowed: number;
  readonly denied: number;
}

interface TooltipState {
  readonly dayIndex: number;
  readonly x: number;
  readonly y: number;
}

// ─── Constants ───

const CHART_W = 600;
const CHART_H = 200;
const PAD = { top: 16, right: 16, bottom: 32, left: 40 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;
const GREEN = "#16a34a";
const RED = "#dc2626";
const GRIDLINE_COUNT = 4;

// ─── Helpers ───

function buildDayBuckets(entries: readonly AuditEntry[]): readonly DayBucket[] {
  const now = new Date();
  const days: DayBucket[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    days.push({ date: dateKey, label, allowed: 0, denied: 0 });
  }

  const bucketMap = new Map<string, { allowed: number; denied: number }>();
  for (const day of days) {
    bucketMap.set(day.date, { allowed: 0, denied: 0 });
  }

  for (const entry of entries) {
    const dateKey = entry.created_at.slice(0, 10);
    const bucket = bucketMap.get(dateKey);
    if (bucket) {
      if (entry.action === "allow") {
        bucketMap.set(dateKey, { ...bucket, allowed: bucket.allowed + 1 });
      } else {
        bucketMap.set(dateKey, { ...bucket, denied: bucket.denied + 1 });
      }
    }
  }

  return days.map((day) => {
    const counts = bucketMap.get(day.date)!;
    return { ...day, allowed: counts.allowed, denied: counts.denied };
  });
}

function bezierPath(points: readonly { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` Q ${cpx},${prev.y} ${cpx},${(prev.y + curr.y) / 2}`;
    d += ` Q ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }
  return d;
}

function areaPath(
  points: readonly { x: number; y: number }[],
  baseY: number,
): string {
  if (points.length < 2) return "";
  const line = bezierPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x},${baseY} L ${first.x},${baseY} Z`;
}

// ─── Shimmer Placeholder ───

function ChartShimmer() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="h-[200px] bg-muted/50 rounded-lg" />
      <div className="flex gap-4">
        <div className="h-3 w-16 bg-muted rounded" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
    </div>
  );
}

// ─── Chart Component ───

function EventsChart({ apiKey }: EventsChartProps) {
  const [entries, setEntries] = useState<readonly AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents() {
      try {
        setLoading(true);
        setError("");
        const data = await apiFetch<{ entries: AuditEntry[] }>(
          "/audit/?limit=500&days=7",
          apiKey,
        );
        if (!cancelled) {
          setEntries(data.entries ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chart data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    return () => { cancelled = true; };
  }, [apiKey]);

  const buckets = useMemo(() => buildDayBuckets(entries), [entries]);

  const totalCount = useMemo(
    () => buckets.reduce((sum, b) => sum + b.allowed + b.denied, 0),
    [buckets],
  );

  const maxVal = useMemo(
    () => Math.max(...buckets.map((b) => Math.max(b.allowed, b.denied)), 1),
    [buckets],
  );

  const toPoint = useCallback(
    (index: number, value: number) => ({
      x: PAD.left + (index / Math.max(buckets.length - 1, 1)) * PLOT_W,
      y: PAD.top + PLOT_H - (value / maxVal) * PLOT_H,
    }),
    [buckets.length, maxVal],
  );

  const allowedPoints = useMemo(
    () => buckets.map((b, i) => toPoint(i, b.allowed)),
    [buckets, toPoint],
  );

  const deniedPoints = useMemo(
    () => buckets.map((b, i) => toPoint(i, b.denied)),
    [buckets, toPoint],
  );

  const gridlines = useMemo(() => {
    const lines: { y: number; label: string }[] = [];
    for (let i = 0; i <= GRIDLINE_COUNT; i++) {
      const val = Math.round((maxVal / GRIDLINE_COUNT) * i);
      const y = PAD.top + PLOT_H - (val / maxVal) * PLOT_H;
      lines.push({ y, label: String(val) });
    }
    return lines;
  }, [maxVal]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const scaleX = CHART_W / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const plotX = mouseX - PAD.left;

      if (plotX < 0 || plotX > PLOT_W) {
        setTooltip(null);
        return;
      }

      const step = PLOT_W / Math.max(buckets.length - 1, 1);
      const index = Math.round(plotX / step);
      const clampedIndex = Math.max(0, Math.min(buckets.length - 1, index));
      const point = allowedPoints[clampedIndex];

      setTooltip({ dayIndex: clampedIndex, x: point.x, y: point.y });
    },
    [buckets.length, allowedPoints],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  if (loading) return <ChartShimmer />;

  if (error) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Failed to load events: {error}
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        No events in the last 7 days
      </div>
    );
  }

  const baseY = PAD.top + PLOT_H;
  const tooltipBucket = tooltip !== null ? buckets[tooltip.dayIndex] : null;

  return (
    <div>
      {/* Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Gridlines */}
          {gridlines.map((g) => (
            <g key={g.label + g.y}>
              <line
                x1={PAD.left}
                y1={g.y}
                x2={CHART_W - PAD.right}
                y2={g.y}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="4 4"
                strokeWidth={0.5}
              />
              <text
                x={PAD.left - 6}
                y={g.y + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {g.label}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {buckets.map((b, i) => {
            const x = PAD.left + (i / Math.max(buckets.length - 1, 1)) * PLOT_W;
            return (
              <text
                key={b.date}
                x={x}
                y={CHART_H - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {b.label}
              </text>
            );
          })}

          {/* Allowed area */}
          <path
            d={areaPath(allowedPoints, baseY)}
            fill={GREEN}
            fillOpacity={0.1}
          />
          {/* Allowed line */}
          <path
            d={bezierPath(allowedPoints)}
            fill="none"
            stroke={GREEN}
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Denied area */}
          <path
            d={areaPath(deniedPoints, baseY)}
            fill={RED}
            fillOpacity={0.1}
          />
          {/* Denied line */}
          <path
            d={bezierPath(deniedPoints)}
            fill="none"
            stroke={RED}
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Data points */}
          {allowedPoints.map((p, i) => (
            <circle key={"a" + i} cx={p.x} cy={p.y} r={3} fill={GREEN} />
          ))}
          {deniedPoints.map((p, i) => (
            <circle key={"d" + i} cx={p.x} cy={p.y} r={3} fill={RED} />
          ))}

          {/* Hover vertical line */}
          {tooltip !== null && (
            <line
              x1={tooltip.x}
              y1={PAD.top}
              x2={tooltip.x}
              y2={baseY}
              stroke="currentColor"
              className="text-muted-foreground"
              strokeWidth={0.5}
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {/* Tooltip (HTML overlay for better styling) */}
        {tooltip !== null && tooltipBucket !== null && (
          <div
            className="absolute pointer-events-none bg-card border border-border shadow-lg rounded-lg p-3 text-xs z-10"
            style={{
              left: `${(tooltip.x / CHART_W) * 100}%`,
              top: `${(tooltip.y / CHART_H) * 100}%`,
              transform: tooltip.x > CHART_W / 2
                ? "translate(-110%, -50%)"
                : "translate(10%, -50%)",
            }}
          >
            <div className="font-semibold text-foreground mb-1">
              {tooltipBucket.label}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: GREEN }} />
              <span className="text-muted-foreground">Allowed:</span>
              <span className="font-medium text-foreground">{tooltipBucket.allowed}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full" style={{ background: RED }} />
              <span className="text-muted-foreground">Denied:</span>
              <span className="font-medium text-foreground">{tooltipBucket.denied}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: GREEN }} />
          Allowed
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: RED }} />
          Denied
        </div>
      </div>
    </div>
  );
}

export { EventsChart };
export type { EventsChartProps };
