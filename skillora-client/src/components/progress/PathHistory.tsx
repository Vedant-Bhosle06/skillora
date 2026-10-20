import React from "react";
import { Button, Card } from "@/components/ui";
import { toApiError } from "@/api/client";
import { formatDateTime, formatHours } from "@/lib/format";
import { totalHours } from "@/lib/pathMetrics";
import type { ComputedPathDoc } from "@/api/types";
import Chevron from "./Chevron";

/** Path history (FR-19): archived snapshots, each expandable to its primary route. */
export default function PathHistory({ pathHistory, historyLimit, setHistoryLimit, roleTitles, expandedRows, toggleRow, skillName }: {
  pathHistory: { isPending: boolean; error: unknown; data: ComputedPathDoc[] | undefined; refetch: () => unknown };
  historyLimit: number;
  setHistoryLimit: (fn: (n: number) => number) => void;
  roleTitles: Map<string, string>;
  expandedRows: Set<string>;
  toggleRow: (key: string) => void;
  skillName: (id: string) => string;
}) {
  return (
    <section aria-labelledby="path-history-h">
      <h2 id="path-history-h" className="mb-4 font-display text-xl font-extrabold text-foreground">Past plans</h2>
      <Card className="divide-y divide-border">
        {pathHistory.isPending && <p className="p-4 text-center text-sm text-muted-foreground">Loading path history…</p>}
        {pathHistory.error != null && (
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">{toApiError(pathHistory.error).message}</p>
            <Button size="sm" variant="secondary" onClick={() => void pathHistory.refetch()}>Retry</Button>
          </div>
        )}
        {pathHistory.data?.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No archived paths yet. Each recompute keeps a snapshot here.</p>
        )}
        {pathHistory.data?.slice(0, historyLimit).map(doc => {
          const primary = doc.paths.find(p => p.rank === 1) ?? doc.paths[0];
          const primarySteps = primary ? [...primary.steps].sort((a, b) => a.order - b.order) : [];
          const isExpanded = expandedRows.has(doc._id);
          return (
            <div key={doc._id} className="px-4 py-2">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-foreground">{roleTitles.get(doc.targetRoleId) ?? "Deleted role"}</p>
                  <p className="mt-0.5 font-mono text-sm text-muted-foreground">
                    {formatDateTime(doc.generatedAt)} · {doc.algorithm === "a_star" ? "A*" : doc.algorithm} · {primarySteps.length} step{primarySteps.length === 1 ? "" : "s"} · {formatHours(totalHours(primarySteps))}
                  </p>
                </div>
                {primarySteps.length > 0 && <Chevron open={isExpanded} onClick={() => toggleRow(doc._id)} label="plan" />}
              </div>
              {isExpanded && (
                <ol className="mb-2 ml-1 mt-2 flex flex-col gap-1">
                  {primarySteps.map(s => (
                    <li key={s.skillId} className="text-sm text-muted-foreground">
                      <span className="font-mono">#{s.order}</span> {skillName(s.skillId)} · <span className="font-mono">{formatHours(s.estCost)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
        {(pathHistory.data?.length ?? 0) > historyLimit && (
          <div className="p-3 text-center">
            <Button size="sm" variant="ghost" onClick={() => setHistoryLimit(n => n + 10)}>Show more</Button>
          </div>
        )}
      </Card>
    </section>
  );
}
