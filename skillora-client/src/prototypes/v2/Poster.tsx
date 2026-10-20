import React, { ReactNode, useMemo, useRef, useState } from "react";
import { m, useMotionValueEvent, useScroll, type MotionValue } from "motion/react";
import Logo from "@/components/Logo";
import { useRange, piecewise } from "@/lib/scrollRange";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { g, hours, routeTotal, unlocks, STARTERS, roleDetails, demandWord, ThemeSwitch } from "./shared";

// Prototype v2 · POSTER — International Typographic Style.
// The hero is a subtraction you can scroll through, every step real: the generic Data Analyst
// roadmap is 115 h; SQL is already yours (−30); Python only needs its level-up (−20); Tableau
// replaces Excel + Power BI (−5) — 60 h. A grid of all 114 skills shows each change.

const APP = "http://localhost:5173";
const base = Object.fromEntries(g.facts.baseline.map(b => [b.name, b.hours]));
const pythonUp = g.route.find(s => s.slug === "python")!.estCost;
const tableau = g.route.find(s => s.slug === "tableau")!.estCost;
const STEPS = [
  { at: 0.12, value: g.facts.evaluation.workedBaselineHours },
  { at: 0.34, value: g.facts.evaluation.workedBaselineHours - base["SQL"] },
  { at: 0.52, value: g.facts.evaluation.workedBaselineHours - base["SQL"] - (base["Python"] - pythonUp) },
  { at: 0.7, value: routeTotal },
];
// The counter only changes inside short windows, so each sentence has a number to point at.
const COUNTER_IN = STEPS.flatMap((s, i) => (i === 0 ? [0, s.at] : [s.at - 0.06, s.at]));
const COUNTER_OUT = STEPS.flatMap((s, i) => (i === 0 ? [s.value, s.value] : [STEPS[i - 1].value, s.value]));

// ── Rolling counter ──────────────────────────────────────────────────────────────────────
function Digit({ pos }: { pos: number }) {
  return (
    <span className="p-digit">
      <span style={{ transform: `translateY(${-pos}em)` }}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => <i key={i}>{d}</i>)}
      </span>
    </span>
  );
}
function Counter({ value }: { value: number }) {
  const ones = value % 10;
  const tens = Math.floor(value / 10) % 10 + Math.max(0, ones - 9);
  const hundreds = Math.floor(value / 100) + Math.max(0, (value % 100) - 99);
  return (
    <span className="p-big p-num inline-flex items-start" aria-label={`${Math.round(value)} hours`}>
      {value >= 99.5 && <Digit pos={hundreds} />}
      <Digit pos={tens} />
      <Digit pos={ones} />
      <span className="ml-[0.06em] normal-case">h</span>
    </span>
  );
}

// ── The 114-skill grid ───────────────────────────────────────────────────────────────────
const ORDER = [...g.nodes.keys()].sort((a, b) => g.nodes[a].category.localeCompare(g.nodes[b].category) || g.nodes[a].name.localeCompare(g.nodes[b].name));
type CellState = "none" | "generic" | "known" | "dropped" | "route";
function cellState(slug: string, v: number): CellState {
  const name = g.nodes.find(n => n.slug === slug)!.name;
  const generic = name in base;
  if (slug === "sql" && v >= STEPS[1].at - 0.02) return "known";
  if (slug === "python" && v >= STEPS[2].at - 0.02) return v >= STEPS[3].at - 0.02 ? "route" : "known";
  if ((slug === "excel" || slug === "power-bi") && v >= STEPS[3].at - 0.02) return "dropped";
  if (g.route.some(r => r.slug === slug) && v >= STEPS[3].at - 0.02) return "route";
  if (generic && v >= STEPS[0].at - 0.06) return "generic";
  return "none";
}
function SkillGrid({ v }: { v: number }) {
  return (
    <div className="grid grid-cols-[repeat(19,minmax(0,1fr))] gap-[3px] sm:gap-1" aria-hidden>
      {ORDER.map(i => {
        const st = cellState(g.nodes[i].slug, v);
        const cls = {
          none: "bg-p-cell",
          generic: "bg-transparent ring-2 ring-inset ring-p-ink",
          known: "bg-p-ink",
          dropped: "bg-p-cell opacity-40",
          route: "bg-p-field",
        }[st];
        return <span key={i} className={`aspect-square transition-[background-color,box-shadow,opacity] duration-300 ${cls}`} />;
      })}
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────────────────
function Line({ p, range, children }: { p: MotionValue<number>; range: [number, number, number, number]; children: ReactNode }) {
  const last = range[3] >= 1;
  const opacity = useRange(p, range, [0, 1, 1, last ? 1 : 0]);
  const x = useRange(p, [range[0], range[1]], [-24, 0]);
  const [live, setLive] = useState(range[0] < 0);
  useMotionValueEvent(p, "change", v => setLive(v >= range[0] && (last || v <= range[3])));
  return <m.div style={{ opacity, x }} aria-hidden={!live} className={`absolute inset-x-0 bottom-0 ${live ? "" : "pointer-events-none"}`}>{children}</m.div>;
}

function Hero() {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({ target: section, offset: ["start start", "end end"] });
  const [v, setV] = useState(0);
  useMotionValueEvent(p, "change", setV);
  const value = piecewise(v, COUNTER_IN, COUNTER_OUT);
  const titleOut = useRange(p, [0.06, 0.11], [1, 0]);
  const field = useRange(p, [0.66, 0.72], [0, 1]);
  return (
    <section ref={section} id="count" className="relative h-[340vh] md:h-[440vh]" aria-label="From the generic roadmap to your route">
      <div className="sticky top-0 grid h-[100svh] grid-rows-[auto_1fr_auto] overflow-hidden px-4 pb-6 pt-20 sm:px-8 md:grid-cols-12 md:grid-rows-[1fr_auto] md:gap-x-6">
        <m.div style={{ opacity: field }} className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-p-field md:block" aria-hidden />
        <div className="relative md:col-span-7 md:row-span-1 md:self-center">
          <m.div style={{ opacity: titleOut }} className="mb-2 md:absolute md:-top-24 md:left-0 md:mb-0">
            <h1 className="p-big text-[clamp(3rem,9vw,8rem)]">Skillora</h1>
          </m.div>
          <div className="text-[clamp(7rem,27vw,24rem)] leading-none">
            <Counter value={value} />
          </div>
        </div>
        <div className="relative z-10 self-center md:col-span-5 md:col-start-8 md:row-span-1 md:px-6">
          <SkillGrid v={v} />
          <p className="mt-3 text-[13px] text-p-muted md:text-p-on-field/80">{g.nodes.length} skills. Outlined: the generic roadmap. Solid: what you know. Vermilion: your route.</p>
        </div>
        <div className="relative h-[13.5rem] md:col-span-6 md:row-start-2 md:h-[12rem]">
          <Line p={p} range={[-0.02, -0.01, 0.08, 0.12]}>
            <p className="max-w-xl text-[clamp(1.3rem,2.2vw,1.9rem)] font-semibold leading-snug">The shortest path to your next role, counted in hours.</p>
            <a href={`${APP}/register`} className="mt-4 inline-flex min-h-11 items-center bg-p-field px-5 text-[15px] font-bold text-p-on-field">Count my hours</a>
          </Line>
          <Line p={p} range={[0.12, 0.15, 0.27, 0.3]}>
            <h2 className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-bold leading-tight">A generic {g.role.title} roadmap.</h2>
            <p className="mt-2 max-w-xl text-[17px] text-p-muted">{g.facts.baseline.map(b => b.name).join(", ")}: {hours(g.facts.evaluation.workedBaselineHours)}, the same for everyone.</p>
          </Line>
          <Line p={p} range={[0.3, 0.34, 0.46, 0.49]}>
            <h2 className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-bold leading-tight">SQL is already yours. −{hours(base["SQL"])}</h2>
            <p className="mt-2 max-w-xl text-[17px] text-p-muted">You know it at intermediate level, which is what the role asks for.</p>
          </Line>
          <Line p={p} range={[0.49, 0.52, 0.63, 0.66]}>
            <h2 className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-bold leading-tight">Python only needs the level-up. −{hours(base["Python"] - pythonUp)}</h2>
            <p className="mt-2 max-w-xl text-[17px] text-p-muted">Beginner to intermediate costs half of learning it from zero.</p>
          </Line>
          <Line p={p} range={[0.66, 0.7, 1, 1]}>
            <h2 className="text-[clamp(1.5rem,2.6vw,2.2rem)] font-bold leading-tight">Tableau, not Excel and Power BI. −{hours(base["Excel"] + base["Power BI"] - tableau)}</h2>
            <p className="mt-2 max-w-xl text-[17px] text-p-muted">The role needs one BI tool. Your route: {g.route.map(s => s.name).join(" → ")}, in an order that always works.</p>
            <a href={`${APP}/register`} className="mt-4 inline-flex min-h-11 items-center bg-p-ink px-5 text-[15px] font-bold text-p-ground">Count my hours</a>
          </Line>
        </div>
      </div>
    </section>
  );
}

// ── What opens up ────────────────────────────────────────────────────────────────────────
function Opens() {
  const [known, setKnown] = useState<Set<string>>(new Set(["python", "sql"]));
  const next = useMemo(() => unlocks(known), [known]);
  const toggle = (slug: string) => setKnown(s => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  return (
    <section id="opens" className="border-t-[3px] border-p-ink px-4 py-20 sm:px-8 md:py-28">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 className="p-big text-[clamp(3rem,8vw,7rem)]">What opens up</h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-p-muted">Choose what you already know. The list shows every skill you could start next, under the same rules the planner uses.</p>
          <div role="group" aria-label="Skills you know" className="mt-8 flex flex-wrap gap-2">
            {STARTERS.map(s => {
              const on = known.has(s.slug);
              return <button key={s.slug} aria-pressed={on} onClick={() => toggle(s.slug)} className={`min-h-11 border-[3px] border-p-ink px-4 text-[15px] font-bold ${on ? "bg-p-ink text-p-ground" : "hover:bg-p-cell"}`}>{s.name}</button>;
            })}
          </div>
        </div>
        <div className="md:col-span-7" aria-live="polite">
          <p className="p-big p-num text-[clamp(5rem,14vw,12rem)] text-p-field">{next.length}</p>
          <p className="mt-2 text-[15px] font-bold">{next.length === 1 ? "skill" : "skills"} you could start now</p>
          <ul className="mt-6 columns-1 gap-8 sm:columns-2">
            {next.map(n => (
              <li key={n.slug} className="mb-3 break-inside-avoid border-t border-p-ink pt-2">
                <span className="text-[19px] font-bold">{n.name}</span>
                <span className="block text-[14px] text-p-muted">opened by {n.via.join(" + ")}</span>
              </li>
            ))}
            {next.length === 0 && <li className="text-p-muted">Choose at least one skill on the left.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Proof, set as type ───────────────────────────────────────────────────────────────────
function Proof() {
  const e = g.facts.evaluation, s = g.facts.search;
  const rows: [string, string][] = [
    ["Never out of order.", `Every step comes after what it needs. A shuffled generic roadmap breaks that up to ${Math.round(e.worstShuffledViolations)} times.`],
    ["Planned, not guessed.", `For a ${s.role}, the planner weighs ${s.astar.toLocaleString()} candidate plans to find the best; trying them in plain order takes ${s.dijkstra.toLocaleString()}.`],
    [`${e.meanSavedPct.toFixed(1)}% shorter, on average.`, `Across ${e.profiles} test profiles, against the generic roadmap for the same role.`],
  ];
  return (
    <section id="proof" className="bg-p-field px-4 py-20 text-p-on-field sm:px-8 md:py-28">
      <ul className="grid gap-12 md:grid-cols-3">
        {rows.map(([t, d]) => (
          <li key={t} className="border-t-[3px] border-p-on-field pt-4">
            <h3 className="p-big text-[clamp(2.4rem,4vw,3.6rem)]">{t}</h3>
            <p className="mt-4 max-w-sm text-[17px] leading-relaxed">{d}</p>
          </li>
        ))}
      </ul>
      <a className="mt-12 inline-block text-[15px] font-bold underline underline-offset-4" href="https://github.com/Vedant-Bhosle06/skillora/blob/main/docs/D6_Evaluation_Report.md">Read the evaluation</a>
    </section>
  );
}

// ── Index of roles ───────────────────────────────────────────────────────────────────────
function RoleIndex() {
  const sorted = [...roleDetails].sort((a, b) => a.category.localeCompare(b.category) || b.demandScore - a.demandScore);
  return (
    <section id="roles" className="px-4 py-20 sm:px-8 md:py-28">
      <div className="grid gap-8 md:grid-cols-12">
        <h2 className="p-big text-[clamp(3rem,8vw,7rem)] md:col-span-4">{roleDetails.length} roles</h2>
        <div className="md:col-span-8">
          <div className="hidden grid-cols-[1fr_8rem_9rem] border-b-[3px] border-p-ink pb-2 text-[13px] font-bold uppercase tracking-wide sm:grid"><span>Role</span><span>Area</span><span>Demand*</span></div>
          {sorted.map(r => (
            <details key={r.slug} className="group border-b border-p-ink">
              <summary className="grid min-h-12 cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-2 py-3 sm:grid-cols-[1fr_8rem_9rem]">
                <span className="text-[18px] font-bold">{r.title}</span>
                <span className="hidden text-[15px] capitalize text-p-muted sm:block">{r.category}</span>
                <span className="text-[14px] text-p-muted">{demandWord(r.demandScore)}</span>
              </summary>
              <p className="pb-4 text-[15px] leading-relaxed"><span className="font-bold">Asks for </span>{r.requirements.map(q => `${q.options.join(" or ")} (${q.level})`).join(", ")}.</p>
            </details>
          ))}
          <p className="mt-4 text-[13px] text-p-muted">*Demand is an expert estimate, not a measurement.</p>
        </div>
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b-[3px] border-p-ink bg-p-ground">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-8">
        <a href="#count" aria-label="SKILLORA, back to top"><Logo variant="mark" wordmark size={24} wordmarkClassName="text-[16px] text-p-ink" /></a>
        <nav className="ml-6 hidden gap-5 text-[14px] font-bold md:flex" aria-label="Sections">
          {[["The count", "#count"], ["What opens up", "#opens"], ["Proof", "#proof"], ["Roles", "#roles"]].map(([l, h]) => <a key={h} href={h} className="hover:underline">{l}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeSwitch className="flex h-11 w-11 items-center justify-center hover:bg-p-cell" />
          <a href={`${APP}/login`} className="hidden min-h-11 items-center px-3 text-[14px] font-bold sm:inline-flex">Sign in</a>
          <a href={`${APP}/register`} className="inline-flex min-h-11 items-center bg-p-field px-4 text-[14px] font-bold text-p-on-field">Count my hours</a>
        </div>
      </div>
    </header>
  );
}

function Begin() {
  return (
    <>
      <a href={`${APP}/register`} className="group relative block min-h-[46svh] overflow-hidden bg-p-field text-p-on-field transition-colors duration-0 hover:bg-p-ink hover:text-p-ground focus-visible:bg-p-ink focus-visible:text-p-ground md:min-h-[58svh]">
        <p className="absolute left-4 top-6 max-w-xs text-[17px] font-bold sm:left-8">Start from what you know. We count the rest.</p>
        <span className="p-big absolute bottom-4 left-3 text-[clamp(7rem,30vw,30rem)] sm:left-6">Begin</span>
      </a>
      <footer className="flex flex-col gap-2 px-4 py-8 text-[14px] text-p-muted sm:flex-row sm:justify-between sm:px-8">
        <span>SKILLORA is a college team project. Every number here comes from its dataset, planner and evaluation.</span>
        <span>{g.nodes.length} skills · {g.edges.length} links · {roleDetails.length} roles</span>
      </footer>
    </>
  );
}

function StillHero() {
  return (
    <section id="count" className="px-4 pb-16 pt-24 sm:px-8">
      <h1 className="p-big text-[clamp(3rem,9vw,8rem)]">Skillora</h1>
      <p className="mt-4 max-w-xl text-[clamp(1.2rem,2vw,1.6rem)] font-semibold">The shortest path to your next role, counted in hours.</p>
      <p className="p-big p-num mt-8 text-[clamp(6rem,22vw,18rem)]">{routeTotal}h</p>
      <p className="max-w-xl text-[17px] text-p-muted">Instead of {hours(g.facts.evaluation.workedBaselineHours)} for a generic {g.role.title} roadmap: SQL is already yours, Python only needs the level-up, and Tableau replaces Excel and Power BI.</p>
    </section>
  );
}

export default function Poster() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {reduced ? <StillHero /> : <Hero />}
        <Opens />
        <Proof />
        <RoleIndex />
      </main>
      <Begin />
    </div>
  );
}
