import React, { ReactNode } from "react";
import { m, type Variants } from "motion/react";
import { landingGraph, formatHours } from "@/content/landingGraph";
import GraphMap from "./GraphMap";
import { Bezel, Label } from "./Glass";

// "How it works" as an asymmetrical bento of glass tiles. Every figure is real: the snapshot's
// route, the A* engine's search counts and the D6 evaluation results.

const EXPO = [0.16, 1, 0.3, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EXPO } },
};

function Tile({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div className={className} variants={rise} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} transition={{ delay }}>
      <Bezel className="h-full" core="flex flex-col p-6 sm:p-7">{children}</Bezel>
    </m.div>
  );
}

function Head({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Bar({ value, max, strong = true }: { value: number; max: number; strong?: boolean }) {
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
      <m.div className={`h-full rounded-full ${strong ? "bg-gradient-brand" : "bg-foreground/25"}`}
        initial={{ width: 0 }} whileInView={{ width: `${(value / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EXPO }} />
    </div>
  );
}

function Ring({ done, total }: { done: number; total: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${done} of ${total} steps done`}>
      <circle cx="38" cy="38" r={r} strokeWidth="6" fill="none" className="stroke-foreground/10" />
      <m.circle cx="38" cy="38" r={r} strokeWidth="6" fill="none" strokeLinecap="round" transform="rotate(-90 38 38)" className="stroke-primary"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - done / total) }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EXPO }} />
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="600" className="fill-foreground">{Math.round((done / total) * 100)}%</text>
    </svg>
  );
}

export default function Bento() {
  const g = landingGraph;
  const { routes, search, evaluation } = g.facts;
  const maxScore = Math.max(...routes.map(r => r.score));
  const first = g.route[0];
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 md:py-36">
      <m.div className="max-w-2xl" variants={rise} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <Label>How it works</Label>
        <h2 className="font-statement mt-5 text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02]">A plan that knows <span className="italic">what you know.</span></h2>
      </m.div>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-12 md:auto-rows-[minmax(220px,auto)]">
        <Tile className="md:col-span-7 md:row-span-2">
          <Head title="Your skills, as a graph" body={`Every skill knows what it needs first. Blue is what you hold; violet is the cheapest route to ${g.role.title}.`} />
          <div className="mt-4 flex flex-1 items-center"><GraphMap className="w-full" highlight="route" title={`Skill graph with the route to ${g.role.title}`} /></div>
        </Tile>

        <Tile className="md:col-span-5" delay={0.08}>
          <Head title="Skips what you know" body={`Python and SQL already count. Against a generic ${g.role.title} roadmap of ${formatHours(evaluation.workedBaselineHours)}:`} />
          <p className="text-gradient-brand mt-auto pt-6 text-[clamp(3rem,6vw,4.5rem)] font-semibold leading-none tracking-[-0.04em]">{evaluation.workedSavedPct.toFixed(1)}%</p>
          <p className="mt-2 text-[13px] text-muted-foreground">less learning time · {formatHours(g.totalHours)} instead</p>
        </Tile>

        <Tile className="md:col-span-5" delay={0.12}>
          <Head title="Routes, not a list" body="When a role accepts either tool, you see both routes, ranked by time and market demand." />
          <div className="mt-6 space-y-3">
            {routes.map(r => (
              <div key={r.via.join()}>
                <div className="flex justify-between text-[12px] text-foreground"><span>{r.via.join(" → ")} route</span><span className="tabular-nums text-muted-foreground">{formatHours(r.hours)} · score {r.score}</span></div>
                <Bar value={r.score} max={maxScore} />
              </div>
            ))}
          </div>
        </Tile>

        <Tile className="md:col-span-4" delay={0.04}>
          <Head title="Always in order" body="No step comes before something it needs. A shuffled generic roadmap breaks that." />
          <div className="mt-auto flex items-end gap-6 pt-6">
            <div><p className="text-4xl font-semibold tracking-tight text-foreground">0</p><p className="text-[12px] text-muted-foreground">steps out of order</p></div>
            <div><p className="text-4xl font-semibold tracking-tight text-muted-foreground">{evaluation.worstShuffledViolations.toFixed(1)}</p><p className="text-[12px] text-muted-foreground">in a shuffled roadmap</p></div>
          </div>
        </Tile>

        <Tile className="md:col-span-4" delay={0.08}>
          <Head title="Finds the best plan first" body={`States searched before the best ${search.role} plan appears.`} />
          <div className="mt-auto space-y-3 pt-6">
            <div><div className="flex justify-between text-[12px] text-foreground"><span>A* (SKILLORA)</span><span className="tabular-nums text-muted-foreground">{search.astar.toLocaleString()}</span></div><Bar value={search.astar} max={search.dijkstra} /></div>
            <div><div className="flex justify-between text-[12px] text-foreground"><span>Dijkstra</span><span className="tabular-nums text-muted-foreground">{search.dijkstra.toLocaleString()}</span></div><Bar value={search.dijkstra} max={search.dijkstra} strong={false} /></div>
          </div>
        </Tile>

        <Tile className="md:col-span-4" delay={0.12}>
          <Head title="Moves as you learn" body={`Tick off ${first.name} and the plan is worked out again: ${formatHours(g.totalHours - first.estCost)} left.`} />
          <div className="mt-auto flex items-center gap-5 pt-6">
            <Ring done={1} total={g.route.length} />
            <p className="text-[13px] leading-relaxed text-muted-foreground">1 of {g.route.length} steps done.<br />Earlier plans stay in your history.</p>
          </div>
        </Tile>
      </div>
    </section>
  );
}
