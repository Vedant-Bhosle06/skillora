import React, { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { CheckIcon, LockIcon } from "@/components/transit";
import { formatDate, formatHours } from "@/lib/format";
import { refId } from "@/lib/requirements";
import type { StepView } from "@/lib/pathStatus";
import type { CompletedSkill, Skill } from "@/api/types";
import CategoryBadge from "./CategoryBadge";
import Chevron from "./Chevron";
import SkillDetail from "./SkillDetail";

/** The checklist: completed stations, then the stops still to come, each with its expandable detail. */
export default function SkillChecklist({
  domainFilter, visibleCompleted, visibleSteps, expandedRows, toggleRow, completedCategory, stepCategory,
  skillName, skillById, prerequisiteNames, handleComplete, handleUncomplete, busy, roleTitle,
}: {
  domainFilter: string | null;
  visibleCompleted: CompletedSkill[];
  visibleSteps: StepView[];
  expandedRows: Set<string>;
  toggleRow: (key: string) => void;
  completedCategory: (c: CompletedSkill) => string;
  stepCategory: (id: string) => string;
  skillName: (id: string) => string;
  skillById: (id: string) => Skill | undefined;
  prerequisiteNames: (id: string) => string[];
  handleComplete: (skillId: string) => void;
  handleUncomplete: (skillId: string) => void;
  busy: boolean;
  roleTitle: string;
}) {
  // One completed row at a time asks "Undo completion?" in place of its button (no modal).
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <section className="mb-12" aria-labelledby="checklist-h">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="checklist-h" className="font-display text-xl font-extrabold text-foreground">Skill checklist</h2>
        {domainFilter && <span className="rounded-full border border-border px-3 py-1 text-sm font-bold text-foreground">{domainFilter}</span>}
      </div>
      <div className="flex flex-col gap-2">
        {visibleCompleted.length > 0 && <h3 className="mt-2 text-base font-bold text-foreground">Completed</h3>}
        {visibleCompleted.map(c => {
          const category = completedCategory(c);
          const id = refId(c.skillId);
          const skill = id ? skillById(id) : undefined;
          const isExpanded = expandedRows.has(c._id);
          return (
            <div key={c._id} className="rounded-md border border-border bg-card">
              <div className="flex items-center gap-3 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
                  <CheckIcon size={14} strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-foreground">{c.skillId?.name ?? "Deleted skill"}</span>
                    {category && <CategoryBadge category={category} />}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">Completed {formatDate(c.completedAt)}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  {id && (confirmId === id ? (
                    <span className="flex items-center gap-1" role="group" aria-label={`Undo completion of ${c.skillId?.name ?? "skill"}?`}>
                      <span className="text-sm font-bold text-foreground">Undo completion?</span>
                      <button
                        autoFocus
                        disabled={busy}
                        onClick={() => { setConfirmId(null); handleUncomplete(id); }}
                        className="min-h-11 rounded-full px-3 text-sm font-bold text-foreground underline underline-offset-4 hover:bg-muted disabled:opacity-50"
                      >Yes</button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="min-h-11 rounded-full px-3 text-sm font-bold text-foreground underline underline-offset-4 hover:bg-muted"
                      >Cancel</button>
                    </span>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => setConfirmId(id)}
                      className="min-h-11 rounded-full px-3 text-sm font-bold text-foreground underline underline-offset-4 hover:bg-muted disabled:opacity-50"
                    >
                      Mark as not done<span className="sr-only">: {c.skillId?.name ?? "skill"}</span>
                    </button>
                  ))}
                  <span className="hidden sm:inline-flex"><StatusBadge status="completed" /></span>
                  <Chevron open={isExpanded} onClick={() => toggleRow(c._id)} label={c.skillId?.name ?? "skill"} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4">
                  <SkillDetail
                    description={skill?.description}
                    hours={skill?.estHours ?? 0}
                    prerequisites={id ? prerequisiteNames(id) : []}
                    completedAt={c.completedAt}
                    proficiency={c.proficiency}
                  />
                </div>
              )}
            </div>
          );
        })}

        {visibleSteps.length > 0 && <h3 className="mt-4 text-base font-bold text-foreground">Remaining</h3>}
        {visibleSteps.map(step => {
          const category = stepCategory(step.skillId);
          const isLocked = step.status === "locked";
          const lockHint = isLocked ? `Complete ${step.blockedBy.map(skillName).join(", ")} first` : undefined;
          const isExpanded = expandedRows.has(step.skillId);

          return (
            <div key={step.skillId} className={`rounded-md border ${isLocked ? "border-border bg-card" : "border-foreground bg-card"}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">#{step.order}</span>
                    <span className={`text-base font-bold ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>{skillName(step.skillId)}</span>
                    {category && <CategoryBadge category={category} />}
                  </div>
                  {step.rationale && !isExpanded && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{step.rationale}</p>
                  )}
                  {isLocked && lockHint && <p className="mt-0.5 text-sm text-muted-foreground">{lockHint}</p>}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{formatHours(step.estCost)}</span>
                  <span className="hidden sm:inline-flex"><StatusBadge status={step.status} /></span>
                  <span title={lockHint}>
                    <button
                      onClick={() => handleComplete(step.skillId)}
                      disabled={isLocked || busy}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        isLocked ? "border-border text-muted-foreground" : "border-foreground text-foreground hover:bg-foreground hover:text-background"
                      }`}
                    >
                      {isLocked ? <><LockIcon size={14} /> Locked<span className="sr-only">. {lockHint}</span></> : <><CheckIcon size={14} strokeWidth={2.2} /> Mark complete<span className="sr-only">: {skillName(step.skillId)}</span></>}
                    </button>
                  </span>
                  <Chevron open={isExpanded} onClick={() => toggleRow(step.skillId)} label={skillName(step.skillId)} />
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4">
                  <SkillDetail
                    description={skillById(step.skillId)?.description}
                    rationale={step.rationale}
                    fromRank={step.fromRank}
                    toRank={step.toRank}
                    hours={step.estCost}
                    prerequisites={prerequisiteNames(step.skillId)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {visibleCompleted.length === 0 && visibleSteps.length === 0 && (
          domainFilter ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No skills in this domain on your current path.
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-center text-sm text-muted-foreground">
                You already meet every requirement for {roleTitle}.
              </p>
            </Card>
          )
        )}
      </div>
    </section>
  );
}
