import React from "react";
import { Card, ProficiencyBadge } from "@/components/ui";
import { StationChip } from "@/components/transit";
import { formatDate } from "@/lib/format";
import type { CompletedSkill } from "@/api/types";
import CategoryBadge from "./CategoryBadge";

/** Completion history across every role (or just this one), newest first. */
export default function CompletionHistory({ history, historyScope, setHistoryScope, completedCategory, onViewDetails }: {
  history: CompletedSkill[];
  historyScope: "all" | "role";
  setHistoryScope: (s: "all" | "role") => void;
  completedCategory: (c: CompletedSkill) => string;
  onViewDetails: (entryId: string) => void;
}) {
  return (
    <section className="mb-12" aria-labelledby="history-h">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="history-h" className="font-display text-xl font-extrabold text-foreground">Completion history</h2>
        <div className="flex gap-2">
          {(["all", "role"] as const).map(scope => (
            <StationChip key={scope} pressed={historyScope === scope} onToggle={() => setHistoryScope(scope)}>
              {scope === "all" ? "All roles" : "This role"}
            </StationChip>
          ))}
        </div>
      </div>
      <Card className="divide-y divide-border">
        {history.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">No skills completed yet.</p>
        )}
        {history.map(entry => {
          const category = completedCategory(entry);
          return (
            <div key={entry._id} className="flex flex-wrap items-center gap-2 px-4 py-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <span className="text-base font-bold text-foreground">{entry.skillId?.name ?? "Deleted skill"}</span>
                {category && <CategoryBadge category={category} />}
                <ProficiencyBadge level={entry.proficiency} />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-sm text-muted-foreground">{formatDate(entry.completedAt)}</span>
                {entry.skillId && (
                  <button onClick={() => onViewDetails(entry._id)} className="min-h-11 rounded-full px-3 text-sm font-bold text-foreground underline underline-offset-4 hover:bg-muted">
                    View details<span className="sr-only">: {entry.skillId.name}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
