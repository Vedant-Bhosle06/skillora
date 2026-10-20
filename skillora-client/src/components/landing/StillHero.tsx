import React from "react";
import PlanCta from "./PlanCta";
import LineIllustration from "./LineIllustration";
import { SignPanel } from "@/components/transit";
import { STOPS, altHours, g, heldNames, hours, routeTotal } from "./data";

/** The reduced-motion hero: the same line and stops, drawn still. */
export default function StillHero() {
  return (
    <section id="line" className="mx-auto max-w-6xl scroll-mt-14 px-4 py-16 sm:px-8" aria-label={`Your line to ${g.role.title}`}>
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-[clamp(2.4rem,7vw,5.5rem)] font-[900] leading-none tracking-[-0.025em]">SKILLORA</h1>
          <p className="mt-3 text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold">Your line to your next role.</p>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            {hours(routeTotal)} door to door for {g.role.title}, from {heldNames.replace(", ", " and ")}. Changing at Excel and Power BI takes {hours(altHours)}.
          </p>
          <div className="mt-6"><PlanCta /></div>
        </div>
        <LineIllustration className="mx-auto w-full max-w-md" />
      </div>
      <ol className="mt-10 flex flex-wrap items-center gap-3 text-[16px] font-bold">
        {STOPS.map((s, i) => (
          <li key={i}>
            <SignPanel className="px-3 py-2">
              {s.name}{s.cost > 0 && <span className="ml-2 font-mono font-normal text-muted-foreground">+{hours(s.cost)}</span>}
            </SignPanel>
          </li>
        ))}
      </ol>
    </section>
  );
}
