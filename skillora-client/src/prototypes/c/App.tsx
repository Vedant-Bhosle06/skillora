import React, { ReactNode, useEffect, useId, useState } from "react";
import { m, type Variants } from "motion/react";
import Logo, { LOGO_PATH } from "@/components/Logo";
import { data, hours, RANK_LABEL, scenario, type Scenario } from "../data";

// Prototype C — "Pathfinder"
// Taste skill: design-taste-frontend v2, direction "One motif" (seed 1195429049).
// The idea: SKILLORA's own mark — an S-shaped path through four skill nodes — becomes the one motif.
// It is the giant shape in the hero, the mask for every photograph (paths through woodland),
// the shape of the button and the bullets. Glass is used only for product fragments ([data-ui]).
// Live thing: set your hours per week and read the weeks to your chosen role (real A* totals).

const NODES = [[8, 26.5, 3], [22.5, 23, 2.9], [9.5, 10, 2.9], [24, 6, 3.3]] as const; // same geometry as Logo.tsx
const EASE = [0.22, 1, 0.36, 1] as const;
const rise: Variants = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };
const seq = (gap = 0.075): Variants => ({ hidden: {}, visible: { transition: { staggerChildren: gap } } });

// Real photographs (Unsplash licence, via picsum.photos) of paths through woodland — atmosphere, not product shots.
const PHOTOS = {
  pines: { src: "https://picsum.photos/id/229/1400/1800", alt: "A path through tall pine trees fading into fog", by: "Orlova Maria" },
  fog: { src: "https://picsum.photos/id/923/1400/1800", alt: "A misty forest path covered in fallen leaves", by: "Sebastian Unrau" },
  trail: { src: "https://picsum.photos/id/216/1200/1200", alt: "A narrow dirt trail through mossy woodland", by: "Paul Jarvis" },
  aerial: { src: "https://picsum.photos/id/879/1200/1600", alt: "Aerial view of a path cutting through dense forest", by: "Nick Scheerbart" },
};

/** The motif: the mark's path and nodes, flat, at any size. */
function Motif({ className = "", stroke = 2.4, color = "var(--color-c-accent)", nodes = true }: { className?: string; stroke?: number; color?: string; nodes?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <path d={LOGO_PATH} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      {nodes && NODES.map(([x, y, r]) => <circle key={`${x}`} cx={x} cy={y} r={r + (stroke - 2.4) / 2} fill={color} />)}
    </svg>
  );
}

/** A photograph seen through the motif. */
function MotifPhoto({ src, alt, className = "", width = 7.5 }: { src: string; alt: string; className?: string; width?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label={alt} preserveAspectRatio="xMidYMid slice">
      <defs>
        <mask id={`m${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <path d={LOGO_PATH} stroke="#fff" strokeWidth={width} strokeLinecap="round" fill="none" />
          {NODES.map(([x, y, r]) => <circle key={`${x}`} cx={x} cy={y} r={r + width / 2.6} fill="#fff" />)}
        </mask>
      </defs>
      <image href={src} x="-4" y="-4" width="40" height="40" preserveAspectRatio="xMidYMid slice" mask={`url(#m${id})`} />
    </svg>
  );
}

function Bullet() {
  return <Motif className="mt-1 h-5 w-5 shrink-0" stroke={3} />;
}

function PrimaryButton({ children, href = "#begin" }: { children: ReactNode; href?: string }) {
  return (
    <a href={href} className="group inline-flex items-center gap-3 rounded-full bg-c-accent px-6 py-3.5 text-[17px] font-medium text-c-accent-ink transition-[transform,background-color] duration-300 ease-c hover:bg-c-ink active:scale-[0.98]">
      <Motif className="h-5 w-5 transition-transform duration-500 ease-c group-hover:rotate-[-8deg]" stroke={3} color="currentColor" />
      {children}
    </a>
  );
}

// ── Hero: card beside the picture ───────────────────────────────────────────────────

function Crossfade() {
  const pics = [PHOTOS.pines, PHOTOS.fog, PHOTOS.aerial];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => { if (!document.hidden) setI(x => (x + 1) % pics.length); }, 5800);
    return () => window.clearInterval(t);
  }, [pics.length]);
  return (
    <>
      {pics.map((p, k) => <img key={p.src} src={p.src} alt={k === 0 ? p.alt : ""} aria-hidden={k !== 0} className={`c-fade ${k === i ? "is-on" : ""}`} width={1400} height={1800} />)}
    </>
  );
}

function HeroFragments() {
  const s = scenario("analyst");
  const [p] = s.paths;
  const saved = data.evaluation.scenarios[1];
  return (
    <m.div className="absolute inset-x-4 bottom-4 grid grid-cols-6 gap-3 sm:inset-x-6 sm:bottom-6" variants={seq(0.1)} initial="hidden" animate="visible">
      <m.div variants={rise} data-ui className="col-span-6 p-5 lg:col-span-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[15px] text-c-muted">Route to <span className="text-c-ink">{s.role.title}</span></p>
          <p className="text-[22px] font-medium tabular-nums">{hours(p.totalLearningCost)}</p>
        </div>
        <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
          {p.steps.map((st, i) => (
            <li key={st.slug} className="min-w-0">
              <p className="text-[14px] text-c-muted">Step {i + 1}</p>
              <p className="truncate text-[16px] font-medium">{st.name}</p>
              <p className="text-[14px] tabular-nums text-c-muted">{hours(st.estCost)}</p>
            </li>
          ))}
        </ol>
      </m.div>
      <m.div variants={rise} data-ui className="col-span-3 p-5 lg:col-span-2">
        <p className="text-[34px] font-medium leading-none tabular-nums">{saved.timeSavedPct.toFixed(1)}%</p>
        <p className="mt-2 text-[14px] leading-snug text-c-muted">shorter than a generic roadmap</p>
      </m.div>
      <m.div variants={rise} data-ui className="col-span-3 p-5 lg:hidden">
        <p className="text-[34px] font-medium leading-none tabular-nums">{s.astar.statesToPrimary}</p>
        <p className="mt-2 text-[14px] leading-snug text-c-muted">states searched to find it</p>
      </m.div>
    </m.div>
  );
}

function Hero() {
  return (
    <section className="grid gap-3 p-3 lg:min-h-[100svh] lg:grid-cols-2">
      <div className="relative order-2 flex flex-col overflow-hidden rounded-2xl bg-c-surface p-6 sm:p-10 lg:order-1">
        <nav className="relative z-10 flex items-center justify-between gap-4">
          <Logo variant="mark" wordmark size={28} wordmarkClassName="text-[18px]" />
          <div className="flex gap-5 text-[15px] text-c-muted">
            <a href="#how" className="hover:text-c-ink">How it works</a>
            <a href="#number" className="hidden hover:text-c-ink sm:inline">Your number</a>
          </div>
        </nav>
        <m.div className="relative z-10 mt-16 max-w-[36rem] lg:mt-24" variants={seq()} initial="hidden" animate="visible">
          <m.h1 variants={rise} className="text-[clamp(2.75rem,5.2vw,5.25rem)] font-medium leading-[1.02] tracking-[-0.025em]">
            The shortest path to your next role
          </m.h1>
          <m.p variants={rise} className="mt-8 max-w-[30rem] text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] leading-[1.45] text-c-ink">
            SKILLORA reads the skills you have, then works out the cheapest order to learn the rest, for any of {data.stats.roles} roles.
          </m.p>
          <m.div variants={rise} className="mt-10"><PrimaryButton>Map my skills</PrimaryButton></m.div>
        </m.div>
        {/* The motif at enormous scale, cropped by the card */}
        <div className="pointer-events-none relative -mb-24 -mr-24 mt-10 h-[46vh] self-end lg:-mb-32 lg:h-[52vh]">
          <Motif className="h-full w-auto" stroke={2.9} />
        </div>
      </div>
      <div className="relative order-1 h-[52svh] overflow-hidden rounded-2xl lg:order-2 lg:sticky lg:top-3 lg:h-[calc(100svh-24px)]">
        <Crossfade />
        <HeroFragments />
      </div>
    </section>
  );
}

// ── Showcase: square plate, spare text (role tabs) ───────────────────────────────────

function Showcase() {
  const [id, setId] = useState("analyst");
  const s = scenario(id);
  const [p, alt] = s.paths;
  return (
    <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 py-28 md:px-10 lg:min-h-[88svh] lg:grid-cols-2 lg:py-40">
      <m.div variants={rise} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="relative aspect-square w-full">
        <MotifPhoto src={PHOTOS.trail.src} alt={PHOTOS.trail.alt} className="h-full w-full" width={8.5} />
      </m.div>
      <m.div variants={seq()} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
        <m.div variants={rise} role="tablist" aria-label="Example roles" className="flex flex-wrap gap-2">
          {data.scenarios.map(x => (
            <button key={x.id} role="tab" aria-selected={x.id === id} onClick={() => setId(x.id)}
              className={`rounded-full px-4 py-2 text-[15px] transition-colors duration-300 ${x.id === id ? "bg-c-ink text-c-paper-ink" : "bg-c-surface text-c-muted hover:text-c-ink"}`}>
              {x.role.title}
            </button>
          ))}
        </m.div>
        <m.h2 variants={rise} key={`h-${id}`} className="mt-10 text-[clamp(2rem,3.4vw,3.25rem)] font-medium leading-[1.05] tracking-[-0.025em]">
          {s.role.title} in {hours(p.totalLearningCost)}
        </m.h2>
        <m.p variants={rise} key={`p-${id}`} className="mt-5 max-w-[34rem] text-[19px] leading-relaxed">
          Starting from {s.held.map(h => `${h.name} (${RANK_LABEL[h.rank].toLowerCase()})`).join(", ")}: {p.steps.length} steps, each one ready when you reach it.
          {alt && ` A second route takes ${hours(alt.totalLearningCost)}.`}
        </m.p>
        <m.ul variants={rise} key={`l-${id}`} className="mt-8 space-y-3">
          {p.steps.slice(0, 5).map(st => (
            <li key={st.slug} className="flex gap-3 text-[17px]"><Bullet /><span><span className="font-medium">{st.name}</span> <span className="text-c-muted">· {hours(st.estCost)}</span></span></li>
          ))}
          {p.steps.length > 5 && <li className="pl-8 text-[17px] text-c-muted">and {p.steps.length - 5} more</li>}
        </m.ul>
      </m.div>
    </section>
  );
}

// ── How it works: one card, four fields ──────────────────────────────────────────────

function StageCard({ stage, light = false }: { stage: number; light?: boolean }) {
  const s = scenario("analyst");
  const [p] = s.paths;
  const left = p.totalLearningCost - p.steps[0].estCost;
  return (
    <div data-ui className={`w-full max-w-[280px] p-5 text-[15px] ${light ? "c-ui-light" : ""}`}>
      <p className={light ? "text-black/55" : "text-c-muted"}>You know</p>
      <p>{s.held.map(h => `${h.name} · ${RANK_LABEL[h.rank]}`).join(", ")}</p>
      {stage >= 2 && (<><p className={`mt-3 ${light ? "text-black/55" : "text-c-muted"}`}>Aiming for</p><p>{s.role.title} · 5 requirements</p></>)}
      {stage >= 3 && (
        <ol className="mt-3 space-y-1">
          {p.steps.map(st => (
            <li key={st.slug} className="flex justify-between gap-3">
              <span className={stage >= 4 && st.slug === "tableau" ? "line-through opacity-50" : ""}>{st.name}</span>
              <span className="tabular-nums opacity-60">{hours(st.estCost)}</span>
            </li>
          ))}
        </ol>
      )}
      {stage >= 3 && <p className="mt-3 font-medium">{stage >= 4 ? `${hours(left)} left · 1 of 4 done` : `${hours(p.totalLearningCost)} in total`}</p>}
    </div>
  );
}

function HowItWorks() {
  const fields = [
    ["bg-[#0f0f0f]", "Add the skills you already have, with your level."],
    ["bg-[#181818]", "Pick the role you want. It lists what it needs."],
    ["bg-[#232323]", "Get the cheapest route, in an order that works."],
    ["bg-c-paper text-c-paper-ink", "Tick skills off. The route is worked out again."],
  ];
  return (
    <section id="how" className="grid lg:grid-cols-4">
      {fields.map(([bg, clause], i) => (
        <m.div key={i} className={`flex min-h-[64svh] flex-col p-5 sm:p-8 lg:min-h-[84svh] ${bg}`} variants={seq(0.09)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
          {i === 0 && <m.h2 variants={rise} className="text-[24px] font-semibold">How it works</m.h2>}
          <m.p variants={rise} className={`max-w-[18rem] text-[clamp(1.25rem,1.1rem+0.6vw,1.6rem)] leading-snug ${i === 0 ? "mt-3" : "mt-[2.25rem]"}`}>{clause}</m.p>
          <m.div variants={rise} className="mt-8 lg:mt-[18svh]"><StageCard stage={i + 1} light={i === 3} /></m.div>
        </m.div>
      ))}
    </section>
  );
}

// ── Your number: the live figure ─────────────────────────────────────────────────────

function YourNumber() {
  const [id, setId] = useState("analyst");
  const [perWeek, setPerWeek] = useState(8);
  const s: Scenario = scenario(id);
  const total = s.paths[0].totalLearningCost;
  const weeks = Math.ceil(total / perWeek);
  return (
    <section id="number" className="mx-auto grid max-w-[1400px] gap-10 px-5 py-28 md:px-10 lg:min-h-[88svh] lg:grid-cols-2 lg:items-end lg:py-40">
      <div>
      <m.div variants={seq()} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
        <m.h2 variants={rise} className="text-[clamp(1.75rem,2.6vw,2.75rem)] font-medium tracking-[-0.02em]">How many hours a week?</m.h2>
        <m.div variants={rise} className="mt-7 grid max-w-[640px] gap-5">
          <div className="flex flex-wrap gap-2">
            {data.scenarios.map(x => (
              <button key={x.id} onClick={() => setId(x.id)} aria-pressed={x.id === id}
                className={`rounded-full px-4 py-2 text-[15px] transition-colors duration-300 ${x.id === id ? "bg-c-ink text-c-paper-ink" : "bg-c-surface text-c-muted hover:text-c-ink"}`}>{x.role.title}</button>
            ))}
          </div>
          <div data-ui className="p-5">
            <label htmlFor="c-hours" className="flex justify-between text-[15px]"><span>Hours a week</span><span className="tabular-nums">{perWeek} h</span></label>
            <input id="c-hours" type="range" min={2} max={30} value={perWeek} onChange={e => setPerWeek(Number(e.target.value))}
              className="c-range mt-1" style={{ ["--fill" as string]: `${((perWeek - 2) / 28) * 100}%` }} />
          </div>
        </m.div>
      </m.div>
      <p className="mt-8 max-w-[34rem] text-[19px] leading-relaxed">
        {hours(total)} of learning for {s.role.title}, starting from {s.held.map(h => h.name).join(" and ")}, at {perWeek} hours a week.
      </p>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 lg:justify-end">
        <p className="text-[clamp(7rem,22vw,22rem)] font-medium leading-[0.8] tracking-[-0.05em] tabular-nums text-c-accent" aria-live="polite">{weeks}</p>
        <p className="pb-4 text-[clamp(1.5rem,2.4vw,2.5rem)] font-medium">{weeks === 1 ? "week" : "weeks"}</p>
      </div>
    </section>
  );
}

// ── Small points, beside a photograph in the motif ───────────────────────────────────

function Points() {
  const points: [string, string][] = [
    ["Either tool is priced.", "Tableau or Power BI: you see both routes and both totals."],
    ["Upgrades cost less.", "Going from beginner to intermediate costs half of the full hours."],
    ["Order is checked.", "Every plan is validated before you see it. Nothing comes too early."],
    ["Plans move with you.", "Tick a skill off and the route is worked out again."],
    ["History is kept.", "Earlier plans stay, so you can see how far you have come."],
    [`${data.stats.skills} skills, ${data.stats.prerequisiteEdges} links.`, `A curated graph across ${data.stats.roles} roles, small enough to check by hand.`],
  ];
  return (
    <section className="grid items-center gap-12 overflow-hidden py-28 lg:grid-cols-12 lg:py-40">
      <m.div className="relative -ml-[12vw] h-[60svh] lg:col-span-5 lg:h-[78svh]" variants={rise} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
        <MotifPhoto src={PHOTOS.aerial.src} alt={PHOTOS.aerial.alt} className="h-full w-full" width={9} />
      </m.div>
      <m.div className="px-5 md:px-10 lg:col-span-7 lg:pr-16" variants={seq(0.07)} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
        <m.h2 variants={rise} className="text-[clamp(2rem,3.2vw,3rem)] font-medium leading-[1.05] tracking-[-0.025em]">The small things it gets right</m.h2>
        <ul className="mt-14 grid gap-x-12 gap-y-9 sm:grid-cols-2">
          {points.map(([t, d]) => (
            <m.li key={t} variants={rise} className="flex gap-3">
              <Bullet />
              <div><p className="text-[19px] font-medium">{t}</p><p className="mt-1 text-[17px] leading-relaxed text-c-muted">{d}</p></div>
            </m.li>
          ))}
        </ul>
      </m.div>
    </section>
  );
}

// ── One word is the button + the mark, built large ───────────────────────────────────

function Begin() {
  return (
    <a id="begin" href="#" className="group relative block min-h-[46svh] overflow-hidden bg-c-accent text-c-accent-ink transition-colors duration-0 hover:bg-c-ink focus-visible:bg-c-ink focus-visible:outline-none lg:min-h-[60svh]">
      <p className="absolute left-5 top-6 max-w-[18rem] text-[17px] leading-snug sm:left-10 sm:top-10 sm:text-[19px]">Map your skills and see your route.</p>
      <span className="absolute right-5 top-5 text-[32px] sm:right-10 sm:top-8" aria-hidden>↗</span>
      <span className="absolute bottom-6 left-3 text-[clamp(6rem,38vw,40rem)] font-extrabold leading-[0.78] tracking-[-0.06em] sm:left-6">Begin</span>
    </a>
  );
}

function Footer() {
  return (
    <footer className="bg-c-paper px-5 pb-10 pt-16 text-c-paper-ink md:px-10">
      <div className="flex items-end gap-6">
        <Motif className="h-[26svh] w-auto shrink-0" stroke={3.2} color="#0a0a0a" />
        <p className="text-[clamp(3.5rem,13vw,12rem)] font-semibold leading-[0.8] tracking-[-0.05em]">SKILLORA</p>
      </div>
      <div className="mt-14 grid gap-8 text-[15px] sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="font-medium">Product</p><p className="mt-2 text-black/60">Roadmap · Graph · Progress</p></div>
        <div><p className="font-medium">Data</p><p className="mt-2 text-black/60">{data.stats.skills} skills · {data.stats.roles} roles · {data.stats.orGroups} either-or choices</p></div>
        <div className="lg:col-span-2"><p className="font-medium">Photographs</p><p className="mt-2 text-black/60">{Object.values(PHOTOS).map(p => p.by).join(", ")} — Unsplash licence, via picsum.photos.</p></div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <main>
      <Hero />
      <Showcase />
      <HowItWorks />
      <YourNumber />
      <Points />
      <Begin />
      <Footer />
    </main>
  );
}
