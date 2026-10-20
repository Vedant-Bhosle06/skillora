import React from "react";
import { ProficiencyBadge } from "@/components/ui";
import { formatDate, formatHours, rankLabel } from "@/lib/format";
import type { Proficiency } from "@/api/types";

export interface SkillDetailProps {
  description?: string;
  rationale?: string;
  fromRank?: number;
  toRank?: number;
  hours: number;
  /** One entry per requirement; OR-groups are already joined with "or". */
  prerequisites: string[];
  completedAt?: string;
  proficiency?: Proficiency;
}

export default function SkillDetail({ description, rationale, fromRank, toRank, hours, prerequisites, completedAt, proficiency }: SkillDetailProps) {
  return (
    <div className="flex flex-col gap-3 pt-3 pb-1">
      {rationale && (
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">Why this skill? </span>{rationale}
        </p>
      )}
      {description && <p className="text-sm text-foreground">{description}</p>}

      <div>
        <p className="mb-1 text-sm font-bold text-foreground">Needs first</p>
        <p className="text-sm text-foreground">{prerequisites.length > 0 ? prerequisites.join(" · ") : "Nothing: a starting point."}</p>
      </div>

      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-sm">
        {fromRank !== undefined && toRank !== undefined && (
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Level</dt>
            <dd className="font-mono text-foreground">{rankLabel(fromRank)} to {rankLabel(toRank)}</dd>
          </div>
        )}
        {proficiency && (
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Proficiency</dt>
            <dd><ProficiencyBadge level={proficiency} /></dd>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <dt className="text-muted-foreground">Estimated</dt>
          <dd className="font-mono text-foreground">{formatHours(hours)}</dd>
        </div>
        {completedAt && (
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Completed</dt>
            <dd className="font-mono text-foreground">{formatDate(completedAt)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
