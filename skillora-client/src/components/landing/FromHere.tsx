import React, { useMemo, useState } from "react";
import { DepartureBoard, StationChip } from "@/components/transit";
import { unlocks, STARTERS } from "@/lib/unlocks";
import { H2, categoryOf, lineFor } from "./data";

/** Pick the stations you know, read the board of what opens next. Same rule as the planner. */
export default function FromHere() {
  const [known, setKnown] = useState<Set<string>>(new Set(["python", "sql"]));
  const next = useMemo(() => unlocks(known), [known]);
  const toggle = (slug: string) => setKnown(s => { const n = new Set(s); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  return (
    <section id="from-here" className="mx-auto max-w-6xl scroll-mt-14 px-4 py-24 sm:px-8 md:py-32">
      <h2 className={`max-w-3xl ${H2}`}>Pick the stations you already know.</h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
        The board lists every skill you could start next from there, using the same prerequisite rules as the planner. Nothing to hover, nothing hidden.
      </p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div role="group" aria-label="Skills you know" className="flex flex-wrap content-start gap-2.5">
          {STARTERS.map(s => (
            <StationChip key={s.slug} pressed={known.has(s.slug)} onToggle={() => toggle(s.slug)} color={lineFor(categoryOf(s.slug))}>
              {s.name}
            </StationChip>
          ))}
        </div>
        <DepartureBoard
          title="Next departures"
          count={`${next.length} ${next.length === 1 ? "stop" : "stops"}`}
          empty="Pick a station on the left to see where it leads."
          rows={next.map(n => ({ key: n.slug, color: lineFor(categoryOf(n.slug)), label: n.name, detail: `from ${n.via.join(" + ")}` }))}
        />
      </div>
    </section>
  );
}
