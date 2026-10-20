import React from "react";
import { DepartureBoard } from "@/components/transit";
import { formatHours } from "@/lib/format";
import { lineFor } from "@/components/landing/data";
import type { StepView } from "@/lib/pathStatus";

/** The next three steps on the route, on a departure board. */
export default function NextDepartures({ steps, skillName, stepCategory }: {
  steps: StepView[]; skillName: (id: string) => string; stepCategory: (id: string) => string;
}) {
  const next = steps.slice(0, 3);
  return (
    <DepartureBoard
      className="mb-10"
      title="Next departures"
      count={next.length > 0 ? `${next.length} of ${steps.length}` : undefined}
      empty="Nothing left on this route."
      maxHeightClass="max-h-none"
      rows={next.map(s => ({
        key: s.skillId,
        color: lineFor(stepCategory(s.skillId)),
        label: skillName(s.skillId),
        detail: <span className="font-mono">{s.status === "in-progress" ? "Up next" : s.status === "locked" ? "Locked" : "Available"} · {formatHours(s.estCost)}</span>,
      }))}
    />
  );
}
