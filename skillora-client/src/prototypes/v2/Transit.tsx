import React, { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { m, useMotionValueEvent, useScroll, type MotionValue } from "motion/react";
import Logo, { LOGO_PATH } from "@/components/Logo";
import { useRange } from "@/lib/scrollRange";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { g, hours, routeTotal, altHours, genericHours, unlocks, STARTERS, roleDetails, demandWord, ThemeSwitch } from "./shared";

// Prototype v2 · TRANSIT — the learning path as a metro line.
// World: transit diagrams and station signage. The route is drawn as a line shaped like the
// SKILLORA mark; a train rides it as you scroll and the journey time adds up to the real 60 h.
// One accent (line red) carries the route and the primary action; every other line is a quiet
// colour code for the skill's kind.

const APP = "http://localhost:5173";
const LINE: Record<string, string> = {
  programming: "var(--l-blue)", framework: "var(--l-green)", tool: "var(--l-yellow)", database: "var(--l-orange)",
  cloud: "var(--l-blue)", math: "var(--l-green)", domain: "var(--l-orange)", concept: "var(--l-grey)", "soft-skill": "var(--l-grey)",
};

// ── Geometry ─────────────────────────────────────────────────────────────────────────────
const VB_W = 1600, VB_H = 1000;
// Your line, on the logo's 32-grid: "You are here" → the four route stops (the mark's nodes) → terminus.
const LINE_PATH = `M2,26.5 L8,26.5 ${LOGO_PATH.replace(/^M[\d.,]+\s*/, "")} L30,6`;
const ALT_PATH = "M2,26.5 Q4,31 9,31 L16,31 Q21.5,31 22.5,23";
const STOPS: { x: number; y: number; name: string; cost: number; kind: "origin" | "stop" | "terminus" }[] = [
  { x: 2, y: 26.5, name: "You are here · Python, SQL", cost: 0, kind: "origin" },
  ...g.route.map((s, i) => ({ x: [8, 22.5, 9.5, 24][i], y: [26.5, 23, 10, 6][i], name: `${s.name}${s.fromRank ? " · level up" : ""}`, cost: s.estCost, kind: "stop" as const })),
  { x: 30, y: 6, name: g.role.title, cost: 0, kind: "terminus" },
];
const ALT_STOPS = [{ x: 9, y: 31, name: "Excel" }, { x: 16, y: 31, name: "Power BI" }];

/** The faint full network: every skill a station, links drawn along 45°/90° like a diagram. */
function useNetwork() {
  return useMemo(() => {
    const pts = g.nodes.map(n => [n.p[0] + n.p[2] * 0.35, -n.p[1] + n.p[2] * 0.12]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const snap = (v: number) => Math.round(v / 32) * 32;
    const pos = pts.map(([x, y]) => [snap(120 + ((x - x0) / (x1 - x0)) * (VB_W - 240)), snap(90 + ((y - y0) / (y1 - y0)) * (VB_H - 180))]);
    const paths = g.edges.filter(e => e[2]).map(([a, b]) => {
      const [ax, ay] = pos[a], [bx, by] = pos[b];
      const dx = bx - ax, dy = by - ay, d = Math.min(Math.abs(dx), Math.abs(dy));
      const mx = ax + Math.sign(dx) * d, my = ay + Math.sign(dy) * d;
      return { d: `M${ax} ${ay}L${mx} ${my}L${bx} ${by}`, colour: LINE[g.nodes[a].category] ?? "var(--l-grey)" };
    });
    return { pos, paths };
  }, []);
}

/** Where the line sits in the viewBox for this screen shape (the hero uses "slice" scaling). */
function lineFrame(w: number, h: number) {
  const aspect = w / h;
  const visW = Math.min(VB_W, VB_H * aspect), visH = Math.min(VB_H, VB_W / aspect);
  const wide = aspect >= 1;
  const scale = wide ? Math.min((0.62 * visH) / 27, (0.45 * visW) / 28) : Math.min((0.7 * visW) / 28, (0.34 * visH) / 27);
  const cx = wide ? VB_W / 2 + visW * 0.2 : VB_W / 2;
  const cy = wide ? VB_H / 2 - visH * 0.04 : VB_H / 2 - visH * 0.24;
  const s = Math.max(w / VB_W, h / VB_H), ox = (w - VB_W * s) / 2, oy = (h - VB_H * s) / 2;
  const toView = (x: number, y: number) => [cx + (x - 16) * scale, cy + (y - 18.5) * scale] as const;
  const toScreen = (x: number, y: number) => { const [vx, vy] = toView(x, y); return [vx * s + ox, vy * s + oy] as const; };
  return { scale, cx, cy, toScreen, transform: `translate(${cx - 16 * scale} ${cy - 18.5 * scale}) scale(${scale})` };
}

// ── Hero ─────────────────────────────────────────────────────────────────────────────────
function Chapter({ p, range, title, children, h1 = false }: { p: MotionValue<number>; range: [number, number, number, number]; title: string; children: ReactNode; h1?: boolean }) {
  const last = range[3] >= 1;
  const opacity = useRange(p, range, [0, 1, 1, last ? 1 : 0]);
  const y = useRange(p, [range[0], range[1]], [28, 0]);
  const [live, setLive] = useState(range[0] <= 0);
  useMotionValueEvent(p, "change", v => setLive(v >= range[0] && (last || v <= range[3])));
  const H = h1 ? "h1" : "h2";
  return (
    <m.div style={{ opacity, y }} aria-hidden={!live} className={`absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8 lg:right-auto lg:w-[34rem] ${live ? "" : "pointer-events-none"}`}>
      <div className="t-sign overflow-hidden">
        <div className="h-2 bg-t-route" />
        <div className="p-5 sm:p-7">
          <H className="text-[clamp(1.9rem,4.2vw,3.6rem)] font-[850] leading-[1.02] tracking-[-0.02em]">{title}</H>
          <div className="mt-3 text-[16px] leading-relaxed text-t-muted sm:text-[17px]">{children}</div>
        </div>
      </div>
    </m.div>
  );
}

function Hero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const linePath = useRef<SVGPathElement>(null);
  const train = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 1440, h: 900 });
  const { scrollYProgress: p } = useScroll({ target: section, offset: ["start start", "end end"] });
  const net = useNetwork();
  const frame = lineFrame(size.w, size.h);

  const netOpacity = useRange(p, [0.1, 0.32, 0.45, 0.6], [0.08, 0.7, 0.7, 0.22]);
  const drawn = useRange(p, [0.45, 0.76], [0, 1]);
  const dashOffset = useRange(p, [0.45, 0.76], [1, 0]);
  const drawnVisible = useRange(p, [0.449, 0.452], [0, 1]);
  const altShow = useRange(p, [0.78, 0.88], [0, 1]);
  const originGlow = useRange(p, [0.08, 0.16], [0, 1]);

  useLayoutEffect(() => {
    const el = stage.current!;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fractions of the line's length at each stop, measured once from the real path.
  const stopAt = useMemo(() => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", LINE_PATH);
    const total = path.getTotalLength();
    return STOPS.map(st => {
      let best = 0, bestD = Infinity;
      for (let k = 0; k <= 400; k++) {
        const q = path.getPointAtLength((k / 400) * total);
        const d = (q.x - st.x) ** 2 + (q.y - st.y) ** 2;
        if (d < bestD) { bestD = d; best = k / 400; }
      }
      return best;
    });
  }, []);

  // Train position and journey clock follow the drawn length.
  useMotionValueEvent(drawn, "change", v => move(v));
  const move = (v: number) => {
    const path = linePath.current, el = train.current;
    if (!path || !el) return;
    const q = path.getPointAtLength(v * path.getTotalLength());
    const [x, y] = frame.toScreen(q.x, q.y);
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    el.style.opacity = v > 0.001 ? "1" : "0";
    let h = 0;
    STOPS.forEach((st, i) => { if (v >= stopAt[i] - 0.002) h += st.cost; });
    if (clock.current) clock.current.textContent = `${h.toFixed(1).padStart(4, "0")} h`;
  };
  useEffect(() => move(drawn.get()), [size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={section} id="line" className="relative h-[330vh] md:h-[420vh]" aria-label={`Your line to ${g.role.title}`}>
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden>
          <m.g style={{ opacity: netOpacity }}>
            {net.paths.map((e, i) => <path key={i} d={e.d} fill="none" stroke={e.colour} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />)}
            {net.pos.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill="var(--station)" stroke="var(--t-ink)" strokeWidth={2} opacity={0.6} />)}
          </m.g>
          <g transform={frame.transform}>
            <m.path d={ALT_PATH} fill="none" stroke="var(--l-route)" strokeWidth={9} strokeDasharray="2 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ opacity: altShow }} />
            <path d={LINE_PATH} fill="none" stroke="var(--casing)" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={LINE_PATH} fill="none" stroke="var(--t-rule)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <m.path ref={linePath} d={LINE_PATH} pathLength={1} fill="none" stroke="var(--l-route)" strokeWidth={12 / frame.scale} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" style={{ strokeDashoffset: dashOffset, opacity: drawnVisible }} />
            {STOPS.map((st, i) => (
              <circle key={i} cx={st.x} cy={st.y} r={st.kind === "stop" ? 0.62 : 0.85} fill="var(--station)" stroke="var(--t-ink)" strokeWidth={st.kind === "stop" ? 4 : 6} vectorEffect="non-scaling-stroke" />
            ))}
            {ALT_STOPS.map(st => <m.circle key={st.name} cx={st.x} cy={st.y} r={0.55} fill="var(--station)" stroke="var(--t-ink)" strokeWidth={3} vectorEffect="non-scaling-stroke" style={{ opacity: altShow }} />)}
          </g>
        </svg>

        {/* Station signs */}
        {STOPS.map((st, i) => <StopSign key={i} stageW={size.w} p={p} at={i === 0 ? 0.08 : 0.45 + stopAt[i] * 0.31} pos={frame.toScreen(st.x, st.y)} label={st.name} cost={st.cost} terminus={st.kind === "terminus"} origin={st.kind === "origin"} below={st.kind !== "stop"} glow={i === 0 ? originGlow : undefined} />)}
        {ALT_STOPS.map(st => <StopSign key={st.name} stageW={size.w} p={p} at={0.8} pos={frame.toScreen(st.x, st.y)} label={st.name} cost={0} below />)}

        <div ref={train} className="pointer-events-none absolute left-0 top-0 flex h-7 w-11 items-center justify-center rounded-md bg-t-ink text-[10px] font-extrabold text-t-bg opacity-0 shadow-[0_6px_14px_-6px_rgba(0,0,0,.5)]" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-t-route" />
        </div>

        <m.div style={{ opacity: useRange(p, [0.44, 0.48], [0, 1]) }} className="t-sign t-time absolute left-4 top-20 px-4 py-2 text-[14px] lg:left-auto lg:top-auto lg:bottom-8 lg:right-8" aria-hidden>
          Journey <span ref={clock}>00.0 h</span> / {hours(routeTotal)}
        </m.div>

        <Chapter p={p} range={[-0.02, -0.01, 0.06, 0.1]} title="SKILLORA" h1>
          <p className="text-[clamp(1.2rem,2vw,1.6rem)] font-bold leading-snug text-t-ink">Your line to your next role.</p>
          <p className="mt-2">Tell us the skills you have and the job you want. We plan the stops in between, in an order that always works.</p>
          <div className="mt-5 flex flex-wrap gap-3"><Cta>Plan my journey</Cta></div>
        </Chapter>
        <Chapter p={p} range={[0.1, 0.14, 0.24, 0.28]} title="You are here.">
          Python, at beginner level, and SQL, at intermediate. Two stations already on your map.
        </Chapter>
        <Chapter p={p} range={[0.28, 0.32, 0.41, 0.45]} title={`${g.nodes.length} stations, ${g.edges.length} connections.`}>
          Every skill is a station. A prerequisite is the track you take to reach it.
        </Chapter>
        <Chapter p={p} range={[0.45, 0.49, 0.74, 0.78]} title={`Your line to ${g.role.title}.`}>
          {g.route.map(s => s.name).join(", then ")}. {hours(routeTotal)} door to door; a generic roadmap for the same job takes {hours(genericHours)}.
        </Chapter>
        <Chapter p={p} range={[0.78, 0.83, 1, 1]} title="Or change at Excel.">
          <p>Excel then Power BI also gets you there, in {hours(altHours)}. Both lines are on the board; you choose.</p>
          <div className="mt-5"><Cta>Plan my journey</Cta></div>
        </Chapter>
      </div>
    </section>
  );
}

function StopSign({ p, at, pos, label, cost, stageW, terminus = false, origin = false, below = false, glow }: { p: MotionValue<number>; at: number; pos: readonly [number, number]; label: string; cost: number; stageW: number; terminus?: boolean; origin?: boolean; below?: boolean; glow?: MotionValue<number> }) {
  const opacity = useRange(p, [at - 0.015, at + 0.01], [0, 1]);
  // Signs near an edge hang inward so they never leave the screen.
  const align = pos[0] < stageW * 0.22 ? "-translate-x-6" : pos[0] > stageW * 0.78 ? "-translate-x-[calc(100%-24px)]" : "-translate-x-1/2";
  return (
    <m.div style={{ opacity: glow ?? opacity, left: pos[0], top: pos[1] }} className={`pointer-events-none absolute ${below ? "translate-y-5" : "-translate-y-[calc(100%+18px)]"} ${align}`} aria-hidden>
      <div className={`t-sign whitespace-nowrap px-3 py-1.5 text-[13px] font-bold sm:text-[14px] ${terminus ? "bg-t-ink text-t-bg" : ""}`}>
        {label}{cost > 0 && <span className="t-time ml-2 font-normal text-t-muted">+{hours(cost)}</span>}
        {origin && <span className="sr-only">starting point</span>}
      </div>
    </m.div>
  );
}

function Cta({ children, ghost = false }: { children: ReactNode; ghost?: boolean }) {
  return (
    <a href={`${APP}/register`} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] font-extrabold transition-[transform,background-color] duration-200 active:scale-[0.98] ${ghost ? "bg-t-panel text-t-ink ring-2 ring-t-ink" : "bg-t-route text-white dark:text-[#0e1013]"}`}>
      {children}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </a>
  );
}

// ── From here: pick what you know, read the board ─────────────────────────────────────────
function FromHere() {
  const [known, setKnown] = useState<Set<string>>(new Set(["python", "sql"]));
  const next = useMemo(() => unlocks(known), [known]);
  const toggle = (slug: string) => setKnown(s => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  const nameOf = (slug: string) => g.nodes.find(n => n.slug === slug)!.category;
  return (
    <section id="from-here" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
      <h2 className="max-w-3xl text-[clamp(2.2rem,5vw,4rem)] font-[850] leading-[1.02] tracking-[-0.02em]">Pick the stations you already know.</h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-t-muted">The board lists every skill you could start next from there, using the same prerequisite rules as the planner. Nothing to hover, nothing hidden.</p>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div role="group" aria-label="Skills you know" className="flex flex-wrap content-start gap-2.5">
          {STARTERS.map(s => {
            const on = known.has(s.slug);
            return (
              <button key={s.slug} aria-pressed={on} onClick={() => toggle(s.slug)}
                className={`min-h-11 rounded-full px-4 text-[15px] font-bold ring-2 transition-colors ${on ? "bg-t-ink text-t-bg ring-t-ink" : "bg-t-panel text-t-ink ring-t-rule hover:ring-t-ink"}`}>
                {s.name}
              </button>
            );
          })}
        </div>
        <div className="t-sign overflow-hidden" aria-live="polite">
          <div className="flex items-center justify-between bg-t-ink px-5 py-3 text-t-bg">
            <span className="text-[15px] font-extrabold">Next departures</span>
            <span className="t-time text-[13px]">{next.length} {next.length === 1 ? "stop" : "stops"}</span>
          </div>
          {next.length === 0 ? (
            <p className="px-5 py-8 text-[16px] text-t-muted">Pick a station on the left to see where it leads.</p>
          ) : (
            <ul className="max-h-[26rem] divide-y divide-[var(--t-rule)] overflow-auto">
              {next.map(n => (
                <li key={n.slug} className="flex items-center gap-4 px-5 py-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: LINE[nameOf(n.slug)] ?? "var(--l-grey)" }} aria-hidden />
                  <span className="flex-1 text-[16px] font-bold">{n.name}</span>
                  <span className="text-[13px] text-t-muted">from {n.via.join(" + ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Service status: the evidence, in plain words ─────────────────────────────────────────
function Status() {
  const e = g.facts.evaluation, s = g.facts.search;
  const rows: [string, string, ReactNode][] = [
    ["Time", "var(--l-route)", <>{hours(routeTotal)} on your line. A generic roadmap for the same job takes {hours(e.workedBaselineHours)}, so this plan is {e.workedSavedPct.toFixed(1)}% shorter.</>],
    ["Order", "var(--l-green)", <>Good service: no stop ever comes before what it needs. A shuffled generic roadmap breaks that up to {Math.round(e.worstShuffledViolations)} times.</>],
    ["Planner", "var(--l-blue)", <>Planned, not guessed. For a {s.role}, the planner checks {s.astar.toLocaleString()} candidate plans before it finds the best one; trying them in plain order takes {s.dijkstra.toLocaleString()}.</>],
    ["Tests", "var(--l-yellow)", <>Across {e.profiles} test journeys, plans were {e.meanSavedPct.toFixed(1)}% shorter on average than the generic roadmap.</>],
  ];
  return (
    <section id="status" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
      <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-[850] leading-[1.02] tracking-[-0.02em]">Service status</h2>
      <ul className="mt-10 divide-y-2 divide-[var(--t-rule)] border-y-2 border-[var(--t-rule)]">
        {rows.map(([name, colour, text]) => (
          <li key={name} className="grid gap-3 py-6 sm:grid-cols-[10rem_1fr] sm:items-baseline">
            <span className="t-badge w-max" style={{ background: colour }}>{name}</span>
            <p className="max-w-3xl text-[18px] leading-relaxed">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Destinations: every role, opened to its requirements ─────────────────────────────────
function Destinations() {
  const groups: [string, string][] = [["data", "Data"], ["engineering", "Engineering"], ["design", "Design"]];
  return (
    <section id="destinations" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
      <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-[850] leading-[1.02] tracking-[-0.02em]">{roleDetails.length} destinations</h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-t-muted">Open a role to see what it asks for. Where any one of several tools will do, the board says so. Demand is an expert estimate.</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        {groups.map(([cat, label]) => (
          <div key={cat}>
            <h3 className="border-b-4 border-t-ink pb-2 text-[20px] font-extrabold">{label}</h3>
            <ul>
              {roleDetails.filter(r => r.category === cat).sort((a, b) => b.demandScore - a.demandScore).map(r => (
                <li key={r.slug} className="border-b border-[var(--t-rule)]">
                  <details className="group">
                    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3">
                      <span className="text-[16px] font-bold">{r.title}</span>
                      <span className="text-[13px] text-t-muted">{demandWord(r.demandScore)}<span className="ml-2 inline-block transition-transform group-open:rotate-45" aria-hidden>+</span></span>
                    </summary>
                    <ul className="space-y-1.5 pb-4 text-[15px]">
                      {r.requirements.map((q, i) => (
                        <li key={i}><span className="font-bold">{q.options.join(" or ")}</span> <span className="text-t-muted">· {q.level}{q.label ? ` · ${q.label}` : ""}</span></li>
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

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-2 border-[var(--t-rule)] bg-t-bg/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
        <a href="#line" aria-label="SKILLORA, back to top"><Logo variant="mark" wordmark size={26} wordmarkClassName="text-[17px] text-t-ink" /></a>
        <nav className="ml-6 hidden gap-1 md:flex" aria-label="Sections">
          {[["Your line", "#line"], ["From here", "#from-here"], ["Status", "#status"], ["Destinations", "#destinations"]].map(([l, h]) => (
            <a key={h} href={h} className="rounded-md px-3 py-2 text-[14px] font-bold text-t-muted hover:text-t-ink">{l}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch className="flex h-11 w-11 items-center justify-center rounded-full text-t-ink hover:bg-t-panel" />
          <a href={`${APP}/login`} className="hidden min-h-11 items-center rounded-full px-4 text-[14px] font-bold sm:inline-flex">Sign in</a>
          <a href={`${APP}/register`} className="inline-flex min-h-11 items-center rounded-full bg-t-route px-4 text-[14px] font-extrabold text-white dark:text-[#0e1013]">Plan my journey</a>
        </div>
      </div>
    </header>
  );
}

function Close() {
  return (
    <section className="border-t-2 border-[var(--t-rule)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-8 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-2xl text-[clamp(2.4rem,6vw,5rem)] font-[900] leading-[0.98] tracking-[-0.025em]">Start from your own station.</h2>
        <div className="flex flex-wrap gap-3"><Cta>Plan my journey</Cta><a href={`${APP}/login`} className="inline-flex min-h-11 items-center rounded-full px-5 text-[15px] font-bold ring-2 ring-t-ink">Sign in</a></div>
      </div>
      <footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-[var(--t-rule)] px-4 py-8 text-[14px] text-t-muted sm:flex-row sm:justify-between sm:px-8">
        <span>SKILLORA is a college team project. Every number on this page comes from its dataset, planner and evaluation.</span>
        <a className="underline underline-offset-4" href="https://github.com/Vedant-Bhosle06/skillora/blob/main/docs/D6_Evaluation_Report.md">Read the evaluation</a>
      </footer>
    </section>
  );
}

function StillHero() {
  return (
    <section id="line" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <h1 className="text-[clamp(2.4rem,7vw,5.5rem)] font-[900] tracking-[-0.025em]">SKILLORA</h1>
      <p className="mt-3 text-[clamp(1.3rem,2.4vw,1.8rem)] font-bold">Your line to your next role.</p>
      <ol className="mt-8 flex flex-wrap items-center gap-3 text-[16px] font-bold">
        {STOPS.map((s, i) => <li key={i} className="t-sign px-3 py-2">{s.name}{s.cost > 0 && <span className="t-time ml-2 font-normal text-t-muted">+{hours(s.cost)}</span>}</li>)}
      </ol>
      <p className="mt-6 max-w-2xl text-[17px] text-t-muted">{hours(routeTotal)} door to door for {g.role.title}, from Python and SQL. Changing at Excel and Power BI takes {hours(altHours)}.</p>
      <div className="mt-6"><Cta>Plan my journey</Cta></div>
    </section>
  );
}

export default function Transit() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {reduced ? <StillHero /> : <Hero />}
        <FromHere />
        <Status />
        <Destinations />
      </main>
      <Close />
    </div>
  );
}
