import React from "react";
import { demandWord } from "@/lib/format";
import { H2, g } from "./data";

export const ROLE_GROUPS: [string, string][] = [["data", "Data"], ["engineering", "Engineering"], ["design", "Design"]];

/** A plus that turns into a cross when its <details> is open. */
export function ExpandMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-45">
      <path d="M7 1.5v11M1.5 7h11" />
    </svg>
  );
}

/** Every role, opened to its requirements. */
export default function Destinations() {
  return (
    <section id="destinations" className="mx-auto max-w-6xl scroll-mt-14 px-4 py-24 sm:px-8 md:py-32">
      <h2 className={H2}>{g.roles.length} destinations</h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
        Open a role to see what it asks for. Where any one of several tools will do, the board says so. Demand is an expert estimate.
      </p>
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        {ROLE_GROUPS.map(([cat, label]) => (
          <div key={cat}>
            <h3 className="border-b-4 border-foreground pb-2 text-[20px] font-extrabold">{label}</h3>
            <ul>
              {g.roles.filter(r => r.category === cat).sort((a, b) => b.demandScore - a.demandScore).map(r => (
                <li key={r.slug} className="border-b border-border">
                  <details className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 [&::-webkit-details-marker]:hidden">
                      <span className="text-[16px] font-bold">{r.title}</span>
                      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">{demandWord(r.demandScore)}<ExpandMark /></span>
                    </summary>
                    <ul className="space-y-1.5 pb-4 text-[15px]">
                      {r.requirements.map((q, i) => (
                        <li key={i}><span className="font-bold">{q.options.join(" or ")}</span> <span className="text-muted-foreground">· {q.level}{q.label ? ` · ${q.label}` : ""}</span></li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
