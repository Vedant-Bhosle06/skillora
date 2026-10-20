import React from "react";
import { ServiceList, ServiceRow } from "@/components/transit";
import { H2, g, hours, routeTotal } from "./data";

/** Service status: the evidence, in plain words. */
export default function Status() {
  const e = g.facts.evaluation, s = g.facts.search;
  return (
    <section id="status" className="mx-auto max-w-6xl scroll-mt-14 px-4 py-24 sm:px-8 md:py-32">
      <h2 className={H2}>Service status</h2>
      <ServiceList className="mt-10">
        <ServiceRow tag="Time" color="var(--line-route)">
          {hours(routeTotal)} on your line. A generic roadmap for the same job takes {hours(e.workedBaselineHours)}, so this plan is {e.workedSavedPct.toFixed(1)}% shorter.
        </ServiceRow>
        <ServiceRow tag="Order" color="var(--line-web)">
          Good service: no stop ever comes before what it needs. A shuffled generic roadmap breaks that up to {Math.round(e.worstShuffledViolations)} times.
        </ServiceRow>
        <ServiceRow tag="Planner" color="var(--line-data)">
          Planned, not guessed. For a {s.role}, the planner checks {s.astar.toLocaleString()} candidate plans before it finds the best one; trying them in plain order takes {s.dijkstra.toLocaleString()}.
        </ServiceRow>
        <ServiceRow tag="Tests" color="var(--foreground)">
          Across {e.profiles} test journeys, plans were {e.meanSavedPct.toFixed(1)}% shorter on average than the generic roadmap.
        </ServiceRow>
      </ServiceList>
    </section>
  );
}
