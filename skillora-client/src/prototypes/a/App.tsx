import React, { ReactNode, useState } from "react";
import { m, type Variants } from "motion/react";
import Logo from "@/components/Logo";
import { data, hours, RANK_LABEL, scenario } from "../data";

// Prototype A — "Nocturne Glass"
// Taste skill: high-end-visual-design (Vibe: Ethereal Glass · Layout: Asymmetrical Bento).
// Double-bezel glass cards, floating island nav, button-in-button CTAs, blur-fade entrances.

const SPRING = [0.32, 0.72, 0, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: SPRING } },
};
const group = (gap = 0.08, delay = 0): Variants => ({ hidden: {}, visible: { transition: { staggerChildren: gap, delayChildren: delay } } });

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div className={className} variants={rise} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} transition={{ delay }}>
      {children}
    </m.div>
  );
}

/** Outer tray + inner glass plate. */
function Bezel({ children, className = "", core = "" }: { children: ReactNode; className?: string; core?: string }) {
  return (
    <div className={`a-shell ${className}`}>
      <div className={`a-core ${core}`}>{children}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-a-muted ring-1 ring-white/10 bg-white/[0.03]">
      <span className="h-1.5 w-1.5 rounded-full bg-a-blue shadow-[0_0_10px_2px_rgba(92,200,255,0.6)]" />
      {children}
    </span>
  );
}

function IslandButton({ children, href = "#", ghost = false }: { children: ReactNode; href?: string; ghost?: boolean }) {
  return (
    <a
      href={href}
      className={`group inline-flex items-center gap-3 rounded-full pl-6 pr-1.5 py-1.5 text-sm font-semibold transition-[transform,background-color,box-shadow] duration-500 ease-spring active:scale-[0.98] ${
        ghost
          ? "text-a-ink ring-1 ring-white/12 bg-white/[0.04] hover:bg-white/[0.08]"
          : "text-[#0b0b14] bg-[#eceef6] hover:shadow-[0_0_40px_-6px_rgba(139,123,255,0.65)]"
      }`}
    >
      {children}
      <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-spring group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-105 ${ghost ? "bg-white/10" : "bg-[#0b0b14]/10"}`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden><path d="M4 10 10 4M5 4h5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </a>
  );
}

function Nav() {
  const links = [["How it works", "#how"], ["Roles", "#roles"], ["Evidence", "#evidence"]];
  return (
    <header className="fixed inset-x-0 top-5 z-40 flex justify-center px-4">
      <nav className="a-pill-glass flex w-full max-w-max items-center gap-1 rounded-full py-1.5 pl-4 pr-1.5">
        <Logo variant="mark" wordmark size={24} wordmarkClassName="text-[15px] tracking-tight" />
        <div className="mx-4 hidden items-center gap-1 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-2 text-[13px] text-a-muted transition-colors duration-300 hover:text-a-ink">{label}</a>
          ))}
        </div>
        <a href="#" className="ml-3 rounded-full bg-white/[0.08] px-4 py-2 text-[13px] font-semibold text-a-ink ring-1 ring-white/10 transition-colors hover:bg-white/[0.14]">Sign in</a>
      </nav>
    </header>
  );
}

// ── Hero path card: the real Data Analyst plan from the worked example ───────────────

function HeroPathCard() {
  const s = scenario("analyst");
  const [primary, alt] = s.paths;
  return (
    <Bezel className="w-full max-w-[460px]">
      <div className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-a-muted">Your path to</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{s.role.title}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tracking-tight a-gradient-text">{hours(primary.totalLearningCost)}</p>
            <p className="text-[11px] text-a-muted">{primary.steps.length} steps · A* search</p>
          </div>
        </div>
        <p className="mt-4 text-[12px] text-a-muted">
          Starting from {s.held.map(h => `${h.name} (${RANK_LABEL[h.rank].toLowerCase()})`).join(" and ")}
        </p>

        <m.ol className="relative mt-6 space-y-1" variants={group(0.14, 0.35)} initial="hidden" animate="visible">
          {/* The learning path itself, drawn as the steps arrive */}
          <svg className="pointer-events-none absolute left-[15px] top-4 h-[calc(100%-2rem)] w-1" viewBox="0 0 2 100" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="a-path" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#8b7bff" /><stop offset="1" stopColor="#5cc8ff" /></linearGradient>
            </defs>
            <m.path d="M1 0 V100" stroke="url(#a-path)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.4, ease: SPRING }} />
          </svg>
          {primary.steps.map((st, i) => (
            <m.li key={st.slug} variants={rise} className="relative flex gap-4 rounded-2xl px-1 py-2.5">
              <span className="relative z-10 mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#0b0d18] text-[11px] font-semibold ring-1 ring-white/15">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold tracking-tight">
                    {st.name}
                    {st.fromRank > 0 && <span className="ml-2 rounded-full bg-a-blue/15 px-2 py-0.5 align-middle text-[10px] font-medium text-a-blue">upgrade</span>}
                  </p>
                  <p className="shrink-0 text-[12px] tabular-nums text-a-muted">{hours(st.estCost)}</p>
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-a-muted">{st.rationale}</p>
              </div>
            </m.li>
          ))}
        </m.ol>

        <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/[0.06]">
          <p className="text-[12px] text-a-muted">Alternative: {alt.steps.slice(0, 2).map(x => x.name).join(" → ")} …</p>
          <p className="text-[12px] tabular-nums text-a-ink">{hours(alt.totalLearningCost)}</p>
        </div>
      </div>
    </Bezel>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto grid min-h-[100dvh] max-w-6xl items-center gap-14 px-4 pb-24 pt-36 md:grid-cols-[1.1fr_1fr] md:px-8">
      <m.div variants={group(0.1, 0.1)} initial="hidden" animate="visible">
        <m.div variants={rise}><Eyebrow>A* search · {data.stats.skills} skills · {data.stats.roles} roles</Eyebrow></m.div>
        <m.h1 variants={rise} className="mt-7 text-[clamp(2.6rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
          The shortest path to <span className="a-gradient-text">your next role.</span>
        </m.h1>
        <m.p variants={rise} className="mt-7 max-w-md text-[17px] leading-relaxed text-a-muted">
          SKILLORA maps what you already know onto a graph of {data.stats.skills} skills, then computes the cheapest learning path to the role you want — in an order where every step is ready for you.
        </m.p>
        <m.div variants={rise} className="mt-10 flex flex-wrap gap-3">
          <IslandButton>Map my skills</IslandButton>
          <IslandButton ghost href="#how">See how it works</IslandButton>
        </m.div>
      </m.div>
      <m.div className="flex justify-center md:justify-end" variants={rise} initial="hidden" animate="visible" transition={{ delay: 0.25 }}>
        <HeroPathCard />
      </m.div>
    </section>
  );
}

// ── Bento ─────────────────────────────────────────────────────────────────────────────

function MiniGraph() {
  const { nodes, edges } = data.graph;
  const pos = Object.fromEntries(nodes.map(n => [n.slug, { x: 64 + n.x * 456, y: 18 + n.y * 304 }]));
  return (
    <svg viewBox="0 0 600 340" className="h-full w-full" role="img" aria-label="Part of the SKILLORA skill graph around Machine Learning Engineer">
      <defs>
        <radialGradient id="a-node" r="1"><stop offset="0" stopColor="#c8c0ff" /><stop offset="1" stopColor="#8b7bff" /></radialGradient>
      </defs>
      {edges.map((e, i) => {
        const a = pos[e.s], b = pos[e.t];
        const lit = nodes.find(n => n.slug === e.t)?.inPrimary;
        return (
          <m.path
            key={`${e.s}-${e.t}`}
            d={`M${a.x} ${a.y} C${a.x + 90} ${a.y}, ${b.x - 90} ${b.y}, ${b.x} ${b.y}`}
            fill="none"
            stroke={lit ? "rgba(139,123,255,0.55)" : "rgba(255,255,255,0.10)"}
            strokeWidth={lit ? 1.4 : 1}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.02 * i, ease: SPRING }}
          />
        );
      })}
      {nodes.map(n => {
        const p = pos[n.slug];
        return (
          <g key={n.slug}>
            {n.inPrimary && <circle cx={p.x} cy={p.y} r="11" fill="rgba(139,123,255,0.16)" />}
            <circle cx={p.x} cy={p.y} r={n.held ? 5.5 : 4.5} fill={n.held ? "#5cc8ff" : n.inPrimary ? "url(#a-node)" : "rgba(255,255,255,0.25)"} />
            <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10.5" fill={n.inPrimary || n.held ? "#d7dbea" : "#6f7590"}>{n.name}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Tile({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal className={className} delay={delay}>
      <Bezel className="h-full" core="p-6 sm:p-7 flex flex-col">{children}</Bezel>
    </Reveal>
  );
}

function TileTitle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-a-muted">{body}</p>
    </div>
  );
}

function Bento() {
  const analyst = scenario("analyst");
  const ml = scenario("ml");
  const [p1, p2] = analyst.paths;
  const worked = data.evaluation.scenarios[1];
  const maxScore = Math.max(p1.compositeScore, p2.compositeScore);
  return (
    <section id="how" className="relative mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-36">
      <Reveal className="max-w-2xl">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-6 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">A plan that knows what you already know.</h2>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-12 md:auto-rows-[minmax(220px,auto)]">
        <Tile className="md:col-span-7 md:row-span-2">
          <TileTitle title="Your skills, as a graph" body={`Each skill knows what it needs first. Blue is what you hold; violet is the cheapest route to ${ml.role.title}.`} />
          <div className="mt-6 min-h-[260px] flex-1"><MiniGraph /></div>
        </Tile>

        <Tile className="md:col-span-5" delay={0.08}>
          <TileTitle title="Skips what you know" body={`Python and SQL already count. Against a generic ${analyst.role.title} roadmap of ${hours(worked.baselineHours)}:`} />
          <p className="mt-auto pt-6 text-[clamp(3rem,6vw,4.5rem)] font-semibold leading-none tracking-[-0.04em] a-gradient-text">{worked.timeSavedPct.toFixed(1)}%</p>
          <p className="mt-2 text-[13px] text-a-muted">less learning time · {hours(worked.systemHours)} instead</p>
        </Tile>

        <Tile className="md:col-span-5" delay={0.12}>
          <TileTitle title="Routes, not a list" body="When a role accepts either tool, you get both routes, ranked by time and market demand." />
          <div className="mt-6 space-y-3">
            {[p1, p2].map(p => (
              <div key={p.rank}>
                <div className="flex justify-between text-[12px]"><span>{p.steps.filter(x => ["tableau", "power-bi"].includes(x.slug)).map(x => x.name).join("")} route</span><span className="tabular-nums text-a-muted">{hours(p.totalLearningCost)} · score {p.compositeScore}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <m.div className="h-full rounded-full bg-gradient-to-r from-a-violet to-a-blue" initial={{ width: 0 }} whileInView={{ width: `${(p.compositeScore / maxScore) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: SPRING }} />
                </div>
              </div>
            ))}
          </div>
        </Tile>

        <Tile className="md:col-span-4" delay={0.04}>
          <TileTitle title="Always in order" body="No step ever comes before something it needs. A shuffled generic roadmap breaks that." />
          <div className="mt-auto flex items-end gap-6 pt-6">
            <div><p className="text-4xl font-semibold tracking-tight">0</p><p className="text-[12px] text-a-muted">order mistakes</p></div>
            <div><p className="text-4xl font-semibold tracking-tight text-a-muted">{Math.max(...data.evaluation.scenarios.map(s => s.baselineOrderViolations)).toFixed(1)}</p><p className="text-[12px] text-a-muted">in a shuffled generic roadmap</p></div>
          </div>
        </Tile>

        <Tile className="md:col-span-4" delay={0.08}>
          <TileTitle title="Finds the best plan first" body={`States searched before the best ${ml.role.title} plan appears.`} />
          <div className="mt-auto space-y-3 pt-6">
            {[["A* (SKILLORA)", ml.astar.statesToPrimary, true], ["Dijkstra", ml.dijkstra.statesToPrimary, false]].map(([label, n, best]) => (
              <div key={String(label)}>
                <div className="flex justify-between text-[12px]"><span>{label}</span><span className="tabular-nums text-a-muted">{Number(n).toLocaleString()}</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06]">
                  <m.div className={`h-full rounded-full ${best ? "bg-a-blue" : "bg-white/25"}`} initial={{ width: 0 }} whileInView={{ width: `${(Number(n) / ml.dijkstra.statesToPrimary) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: SPRING }} />
                </div>
              </div>
            ))}
          </div>
        </Tile>

        <Tile className="md:col-span-4" delay={0.12}>
          <TileTitle title="Moves as you learn" body={`Tick off Tableau and the plan recomputes: ${hours(p1.totalLearningCost - p1.steps[0].estCost)} left.`} />
          <div className="mt-auto flex items-center gap-5 pt-6">
            <ProgressRing value={1} total={p1.steps.length} />
            <p className="text-[13px] leading-relaxed text-a-muted">1 of {p1.steps.length} steps done.<br />Old plans are kept in your history.</p>
          </div>
        </Tile>
      </div>
    </section>
  );
}

function ProgressRing({ value, total }: { value: number; total: number }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-label={`${value} of ${total} steps done`}>
      <circle cx="38" cy="38" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="6" fill="none" />
      <m.circle cx="38" cy="38" r={r} stroke="url(#a-ring)" strokeWidth="6" fill="none" strokeLinecap="round" transform="rotate(-90 38 38)"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - value / total) }} viewport={{ once: true }} transition={{ duration: 1.4, ease: SPRING }} />
      <defs><linearGradient id="a-ring"><stop offset="0" stopColor="#8b7bff" /><stop offset="1" stopColor="#5cc8ff" /></linearGradient></defs>
      <text x="38" y="43" textAnchor="middle" fontSize="15" fontWeight="600" fill="#eceef6">{Math.round((value / total) * 100)}%</text>
    </svg>
  );
}

// ── Roles + close ─────────────────────────────────────────────────────────────────────

function Roles() {
  const [active, setActive] = useState("data");
  const cats = ["data", "engineering", "design"];
  const shown = data.roles.filter(r => r.category === active);
  return (
    <section id="roles" className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-32">
      <div className="grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <Eyebrow>{data.stats.roles} roles</Eyebrow>
          <h2 className="mt-6 text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">Pick where you are headed.</h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-a-muted">Every role lists what it needs, including the places where more than one tool will do.</p>
          <div className="mt-8 inline-flex rounded-full bg-white/[0.04] p-1 ring-1 ring-white/10">
            {cats.map(c => (
              <button key={c} onClick={() => setActive(c)} className={`rounded-full px-4 py-2 text-[13px] capitalize transition-colors duration-300 ${active === c ? "bg-white/[0.12] text-a-ink" : "text-a-muted hover:text-a-ink"}`}>{c}</button>
            ))}
          </div>
        </Reveal>
        <m.ul key={active} className="grid gap-3 sm:grid-cols-2" variants={group(0.05)} initial="hidden" animate="visible">
          {shown.map(r => (
            <m.li key={r.slug} variants={rise}>
              <Bezel core="px-5 py-4">
                <p className="font-semibold tracking-tight">{r.title}</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1 flex-1 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-a-violet" style={{ width: `${r.demandScore * 100}%` }} /></div>
                  <span className="text-[11px] tabular-nums text-a-muted">demand {r.demandScore.toFixed(2)}</span>
                </div>
                <p className="mt-2 text-[12px] text-a-muted">{r.requirements} requirements</p>
              </Bezel>
            </m.li>
          ))}
        </m.ul>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section id="evidence" className="mx-auto max-w-6xl px-4 pb-24 md:px-8 md:pb-32">
      <Reveal>
        <Bezel core="px-6 py-16 text-center sm:px-16 sm:py-24">
          <h2 className="mx-auto max-w-2xl text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em]">Start with what you already know.</h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-a-muted">Across six test profiles, plans were {data.evaluation.meanTimeSavedPct.toFixed(1)}% shorter on average than a generic roadmap, with zero steps out of order.</p>
          <div className="mt-10 flex justify-center"><IslandButton>Map my skills</IslandButton></div>
        </Bezel>
      </Reveal>
      <footer className="mt-16 flex flex-col items-center justify-between gap-4 text-[13px] text-a-muted sm:flex-row">
        <Logo variant="mark" wordmark size={22} wordmarkClassName="text-[14px]" />
        <p>{data.stats.skills} skills · {data.stats.prerequisiteEdges} prerequisite links · {data.stats.orGroups} either-or choices</p>
      </footer>
    </section>
  );
}

export default function App() {
  return (
    <>
      <div className="a-ambient" aria-hidden><i /><i /><i /></div>
      <div className="a-grain" aria-hidden />
      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <Bento />
          <Roles />
          <Close />
        </main>
      </div>
    </>
  );
}
