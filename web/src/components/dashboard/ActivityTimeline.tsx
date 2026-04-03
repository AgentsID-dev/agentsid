// ─── Activity Timeline ───
// Vertical timeline of audit entries for an agent

import type { AuditEntry } from "./types";
import { relativeTime } from "./utils";

interface ActivityTimelineProps {
  readonly entries: readonly AuditEntry[];
  readonly loading: boolean;
}

function ActivityTimeline({ entries, loading }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <span className="inline-block w-6 h-6 border-3 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No activity recorded
      </div>
    );
  }

  return (
    <div className="relative max-h-[500px] overflow-y-auto">
      {/* Vertical connecting line */}
      <div className="absolute left-[89px] top-0 bottom-0 w-px bg-border" />

      {entries.map((entry) => {
        const isAllow = entry.action === "allow";
        return (
          <div
            key={entry.id}
            className="flex items-start gap-4 py-3 relative hover:bg-primary/5 rounded-lg transition-colors px-2"
          >
            {/* Timestamp */}
            <div className="text-muted-foreground/70 whitespace-nowrap min-w-[72px] font-mono text-[11px] text-right pt-0.5">
              {relativeTime(entry.created_at)}
            </div>

            {/* Colored dot */}
            <div className="relative z-10 shrink-0 mt-1">
              <div
                className={`w-3 h-3 rounded-full border-2 border-card ${
                  isAllow ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    isAllow
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                  }`}
                >
                  {isAllow ? "ALLOW" : "DENY"}
                </span>
                <span className="font-mono text-sm font-medium truncate">
                  {entry.tool}
                </span>
                {entry.result && (
                  <span className="text-muted-foreground/60 text-xs">
                    {entry.result}
                  </span>
                )}
              </div>
              {entry.error_message && (
                <div className="text-destructive text-[11px] mt-1 truncate">
                  {entry.error_message}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* View all link */}
      <div className="text-center pt-3 border-t border-border mt-2">
        <span className="text-xs text-primary cursor-pointer hover:underline">
          View all in Audit Feed
        </span>
      </div>
    </div>
  );
}

export { ActivityTimeline };
