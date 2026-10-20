import React, { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { m, useMotionValueEvent, useScroll, type MotionValue } from "motion/react";
import Logo from "@/components/Logo";
import { useRange, piecewise } from "@/lib/scrollRange";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useTheme } from "@/context/ThemeContext";
import { g, hours, routeTotal, altHours, unlocks, STARTERS, roleDetails, demandWord, ThemeSwitch } from "./shared";

// Prototype v2 · TERRAIN — the skill graph as a survey map.
// Contours are computed from the real graph (a skill rises with the number of skills that connect
// through it). The route is a trail from basecamp (what you know) to the summit (the role); its
// elevation profile is the real learning hours, against the generic roadmap's 115 h.

const APP = "http://localhost:5173";
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ── Map geometry ─────────────────────────────────────────────────────────────────────────
const NORM = (() => {
  const pts = g.nodes.map(n => [n.p[0] + n.p[2] * 0.35, -n.p[1] + n.p[2] * 0.12]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return pts.map(([x, y]) => [0.08 + ((x - x0) / (x1 - x0)) * 0.84, 0.1 + ((y - y0) / (y1 - y0)) * 0.8] as const);
})();
const IDX = new Map(g.nodes.map((n, i) => [n.slug, i]));
const ROUTE_PTS = g.route.map(s => NORM[IDX.get(s.slug)!]);
const BASE = NORM[IDX.get("python")!];
const SQL = NORM[IDX.get("sql")!];
const SUMMIT = [Math.min(0.95, ROUTE_PTS[3][0] + 0.05), Math.max(0.05, ROUTE_PTS[3][1] - 0.07)] as const;
const TRAIL_STOPS = [BASE, ...ROUTE_PTS, SUMMIT];

/** Catmull-Rom smoothing of the trail through its stops (normalised map units). */
function smoothTrail(pts: readonly (readonly [number, number])[], per = 40) {
  const out: [number, number][] = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    for (let t = 0; t < per; t++) {
      const u = t / per, u2 = u * u, u3 = u2 * u;
      const f = (k: 0 | 1) => 0.5 * ((2 * P[i][k]) + (-P[i - 1][k] + P[i + 1][k]) * u + (2 * P[i - 1][k] - 5 * P[i][k] + 4 * P[i + 1][k] - P[i + 2][k]) * u2 + (-P[i - 1][k] + 3 * P[i][k] - 3 * P[i + 1][k] + P[i + 2][k]) * u3);
      out.push([f(0), f(1)]);
    }
  }
  out.push([P[P.length - 2][0], P[P.length - 2][1]]);
  return out;
}
const TRAIL = smoothTrail(TRAIL_STOPS);
const STOP_AT = TRAIL_STOPS.map((_, i) => (i * 40) / (TRAIL.length - 1));

/** Marching squares over a height field built from the graph. Returns segments per level. */
function contours(cols: number, rows: number, levels: number) {
  const field = new Float32Array(cols * rows);
  const sig2 = 2 * 0.055 * 0.055;
  g.nodes.forEach((n, i) => {
    const [nx, ny] = NORM[i], amp = 0.35 + Math.min(n.degree, 10) * 0.13;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const dx = c / (cols - 1) - nx, dy = (r / (rows - 1) - ny) * 0.62;
      field[r * cols + c] += amp * Math.exp(-(dx * dx + dy * dy) / sig2);
    }
  });
  let max = 0;
  field.forEach(v => (max = Math.max(max, v)));
  const out: number[][] = [];
  for (let k = 1; k <= levels; k++) {
    const iso = (max * k) / (levels + 1);
    const segs: number[] = [];
    for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
      const a = field[r * cols + c], b = field[r * cols + c + 1], d = field[(r + 1) * cols + c], e = field[(r + 1) * cols + c + 1];
      const pts: number[] = [];
      const edge = (v1: number, v2: number, x1: number, y1: number, x2: number, y2: number) => {
        if ((v1 < iso) !== (v2 < iso)) { const t = (iso - v1) / (v2 - v1); pts.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); }
      };
      edge(a, b, c, r, c + 1, r); edge(b, e, c + 1, r, c + 1, r + 1); edge(d, e, c, r + 1, c + 1, r + 1); edge(a, d, c, r, c, r + 1);
      for (let q = 0; q + 3 < pts.length; q += 4) segs.push(pts[q] / (cols - 1), pts[q + 1] / (rows - 1), pts[q + 2] / (cols - 1), pts[q + 3] / (rows - 1));
    }
    out.push(segs);
  }
  return out;
}

// ── Hero ─────────────────────────────────────────────────────────────────────────────────
function Legend({ p, range, title, children, h1 = false }: { p: MotionValue<number>; range: [number, number, number, number]; title: string; children: ReactNode; h1?: boolean }) {
  const last = range[3] >= 1;
  const opacity = useRange(p, range, [0, 1, 1, last ? 1 : 0]);
  const y = useRange(p, [range[0], range[1]], [24, 0]);
  const [live, setLive] = useState(range[0] < 0);
  useMotionValueEvent(p, "change", v => setLive(v >= range[0] && (last || v <= range[3])));
  const H = h1 ? "h1" : "h2";
  return (
    <m.div style={{ opacity, y }} aria-hidden={!live} className={`m-legend absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8 lg:right-auto lg:w-[33rem] ${live ? "" : "pointer-events-none"}`}>
      <div className="m-legend-head flex items-center justify-between px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-m-muted">
        <span>Sheet · {g.role.title}</span><span className="m-figure">{g.nodes.length} skills</span>
      </div>
      <div className="p-5 sm:p-6">
        <H className={`${h1 ? "m-display uppercase" : "font-bold"} text-[clamp(1.9rem,4vw,3.4rem)] leading-[1.02] tracking-[-0.01em]`}>{title}</H>
        <div className="mt-3 text-[16px] leading-relaxed text-m-muted sm:text-[17px]">{children}</div>
      </div>
    </m.div>
  );
}

function Hero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1440, h: 900 });
  const { darkMode } = useTheme();
  const { scrollYProgress: p } = useScroll({ target: section, offset: ["start start", "end end"] });
  const levels = useMemo(() => contours(150, 95, 16), []);

  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(stage.current!);
    return () => ro.disconnect();
  }, []);

  // Map rect: "cover" a 1.6:1 sheet into the stage.
  const sheet = useMemo(() => {
    const aspect = 1.6, s = Math.max(size.w / aspect, size.h);
    const W = s * aspect, H = s;
    return { W, H, ox: (size.w - W) / 2, oy: (size.h - H) / 2 };
  }, [size]);

  const draw = (v: number) => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(size.w * dpr)) { c.width = Math.round(size.w * dpr); c.height = Math.round(size.h * dpr); }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    // Camera: close on basecamp, then the whole sheet.
    const zoom = piecewise(v, [0, 0.12, 0.4], [1.9, 1.9, 1]);
    const fx = piecewise(v, [0, 0.12, 0.4], [BASE[0], BASE[0], 0.5]), fy = piecewise(v, [0, 0.12, 0.4], [BASE[1], BASE[1], 0.5]);
    const toPx = (nx: number, ny: number) => [((nx - fx) * zoom + 0.5) * sheet.W + sheet.ox, ((ny - fy) * zoom + 0.5) * sheet.H + sheet.oy] as const;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Contours rise level by level as the map opens.
    const rise = piecewise(v, [0.02, 0.42], [0.55, 1]) * levels.length;
    const contour = css("--m-contour"), index = css("--m-index");
    levels.forEach((segs, k) => {
      const a = Math.max(0, Math.min(1, rise - k));
      if (a <= 0) return;
      ctx.globalAlpha = a * piecewise(v, [0.55, 0.7], [1, 0.75]);
      ctx.strokeStyle = (k + 1) % 4 === 0 ? index : contour;
      ctx.lineWidth = (k + 1) % 4 === 0 ? 1.6 : 0.9;
      ctx.beginPath();
      for (let q = 0; q < segs.length; q += 4) { const [x1, y1] = toPx(segs[q], segs[q + 1]); const [x2, y2] = toPx(segs[q + 2], segs[q + 3]); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Spot heights: every skill.
    ctx.fillStyle = css("--m-ink");
    ctx.globalAlpha = piecewise(v, [0.15, 0.35], [0, 0.55]);
    NORM.forEach(([nx, ny]) => { const [x, y] = toPx(nx, ny); ctx.fillRect(x - 1.5, y - 1.5, 3, 3); });
    ctx.globalAlpha = 1;

    // Basecamp markers (what you know)
    ctx.fillStyle = css("--m-water");
    [BASE, SQL].forEach(([nx, ny]) => { const [x, y] = toPx(nx, ny); ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y + 6); ctx.lineTo(x - 8, y + 6); ctx.closePath(); ctx.fill(); });

    // Trail, drawn as it is walked
    const walked = piecewise(v, [0.45, 0.78], [0, 1]);
    const n = Math.floor(walked * (TRAIL.length - 1));
    if (walked > 0) {
      ctx.strokeStyle = css("--m-trail"); ctx.lineWidth = 3.5; ctx.setLineDash([9, 6]); ctx.lineCap = "round";
      ctx.beginPath();
      TRAIL.slice(0, n + 1).forEach(([nx, ny], i) => { const [x, y] = toPx(nx, ny); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
      const [hx, hy] = toPx(...TRAIL[n]);
      ctx.fillStyle = css("--m-paper"); ctx.strokeStyle = css("--m-trail"); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx, hy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // Waypoint labels follow the map
    const el = labels.current;
    if (el) [...el.children].forEach((child, i) => {
      const [x, y] = toPx(...TRAIL_STOPS[i]);
      const at = i === 0 ? 0.08 : 0.45 + STOP_AT[i] * 0.33;
      const o = i === 0 ? piecewise(v, [0.06, 0.1], [0, 1]) : piecewise(v, [at - 0.01, at + 0.01], [0, 1]);
      const node = child as HTMLElement;
      node.style.opacity = String(o);
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  };

  useMotionValueEvent(p, "change", draw);
  useEffect(() => { draw(p.get()); }, [size, darkMode, sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.fonts?.ready.then(() => draw(p.get())); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={section} id="map" className="relative h-[330vh] md:h-[420vh]" aria-label={`The climb to ${g.role.title}`}>
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />
        <div ref={labels} className="pointer-events-none absolute inset-0" aria-hidden>
          {["Basecamp · Python, SQL", ...g.route.map(s => `${s.name} · ${hours(s.estCost)}`), `${g.role.title} · summit`].map((t, i) => (
            <div key={i} className="absolute left-0 top-0 opacity-0">
              <span className={`m-place block -translate-x-1/2 ${i === 0 ? "translate-y-3" : "-translate-y-[calc(100%+10px)]"} whitespace-nowrap rounded-sm bg-m-paper/85 px-1.5 text-[15px] ${i === TRAIL_STOPS.length - 1 ? "not-italic font-extrabold uppercase tracking-wide text-m-trail" : ""}`}>{t}</span>
            </div>
          ))}
        </div>
        <Profile p={p} />

        <Legend p={p} range={[-0.02, -0.01, 0.06, 0.1]} title="SKILLORA" h1>
          <p className="text-[clamp(1.15rem,1.8vw,1.5rem)] font-semibold text-m-ink">Map the climb to your next role.</p>
          <p className="mt-2">Mark what you already know. We plot the easiest way up, one skill at a time, in an order you can actually walk.</p>
          <div className="mt-5"><Cta>Plot my route</Cta></div>
        </Legend>
        <Legend p={p} range={[0.1, 0.14, 0.24, 0.28]} title="Basecamp is what you know.">
          Python at beginner level and SQL at intermediate: the two blue markers. Nobody starts from sea level.
        </Legend>
        <Legend p={p} range={[0.28, 0.32, 0.41, 0.45]} title={`${g.nodes.length} skills, mapped as ground.`}>
          The more skills that build on one, the higher it stands. {g.edges.length} links shape the slopes.
        </Legend>
        <Legend p={p} range={[0.45, 0.49, 0.74, 0.78]} title="The easiest way up.">
          {g.route.map(s => s.name).join(", ")}: {hours(routeTotal)} of climbing to {g.role.title}. The usual all-in-one roadmap climbs {hours(g.facts.evaluation.workedBaselineHours)}.
        </Legend>
        <Legend p={p} range={[0.78, 0.83, 1, 1]} title="Another trail exists.">
          <p>Through Excel and Power BI instead of Tableau: {hours(altHours)}. Both are marked on your sheet.</p>
          <div className="mt-5"><Cta>Plot my route</Cta></div>
        </Legend>
      </div>
    </section>
  );
}

/** Elevation profile of the trail, in cumulative learning hours. */
function Profile({ p }: { p: MotionValue<number> }) {
  const cum = g.route.reduce<number[]>((a, s) => [...a, (a[a.length - 1] ?? 0) + s.estCost], [0]);
  const W = 300, H = 120, max = g.facts.evaluation.workedBaselineHours;
  const pts = cum.map((h, i) => [10 + (i / (cum.length - 1)) * (W - 20), H - 12 - (h / max) * (H - 30)] as const);
  const opacity = useRange(p, [0.44, 0.48], [0, 1]);
  const clip = useRange(p, [0.45, 0.78], [0, W]);
  return (
    <m.div style={{ opacity }} className="m-legend absolute right-4 top-20 hidden w-[340px] p-4 sm:block lg:right-8 lg:top-24" aria-hidden>
      <p className="text-[13px] font-semibold">Climb, in learning hours</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
        <line x1="10" x2={W - 10} y1={H - 12 - (max / max) * (H - 30)} y2={H - 12 - (max / max) * (H - 30)} stroke="var(--m-muted)" strokeDasharray="4 4" />
        <text x={W - 10} y={H - 12 - (H - 30) - 4} textAnchor="end" fontSize="11" fill="var(--m-muted)">generic roadmap {max} h</text>
        <defs><clipPath id="profile-clip"><m.rect x="0" y="0" height={H} style={{ width: clip }} /></clipPath></defs>
        <g clipPath="url(#profile-clip)">
          <polygon points={`${pts.map(q => q.join(",")).join(" ")} ${pts[pts.length - 1][0]},${H - 12} ${pts[0][0]},${H - 12}`} fill="var(--m-trail)" opacity="0.14" />
          <polyline points={pts.map(q => q.join(",")).join(" ")} fill="none" stroke="var(--m-trail)" strokeWidth="2.5" />
          {pts.map(([x, y], i) => i > 0 && <circle key={i} cx={x} cy={y} r="3.5" fill="var(--m-trail)" />)}
          <text x={pts[pts.length - 1][0]} y={pts[pts.length - 1][1] - 8} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--m-ink)">{routeTotal} h</text>
        </g>
        <line x1="10" x2={W - 10} y1={H - 12} y2={H - 12} stroke="var(--m-ink)" />
      </svg>
    </m.div>
  );
}

function Cta({ children }: { children: ReactNode }) {
  return (
    <a href={`${APP}/register`} className="inline-flex min-h-11 items-center gap-2 bg-m-trail px-5 text-[15px] font-bold text-white transition-transform active:scale-[0.98] dark:text-[#0f1613]">
      {children}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 12 8 4l5 8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
    </a>
  );
}

// ── Basecamp picker ──────────────────────────────────────────────────────────────────────
function Basecamp() {
  const [known, setKnown] = useState<Set<string>>(new Set(["python", "sql"]));
  const next = useMemo(() => unlocks(known), [known]);
  const toggle = (slug: string) => setKnown(s => { const n = new Set(s); n.has(slug) ? n.delete(slug) : n.add(slug); return n; });
  return (
    <section id="basecamp" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
      <h2 className="m-display max-w-3xl text-[clamp(2rem,4.6vw,3.6rem)] uppercase leading-[1.02]">Set your basecamp</h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-m-muted">Mark the skills you already have. Every trail that opens from there is listed straight away, using the same rules as the planner.</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <fieldset>
          <legend className="mb-4 text-[14px] font-semibold uppercase tracking-[0.12em] text-m-muted">I already know</legend>
          <div className="flex flex-wrap gap-2.5">
            {STARTERS.map(s => {
              const on = known.has(s.slug);
              return (
                <label key={s.slug} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 border-[1.5px] px-4 text-[15px] font-semibold transition-colors ${on ? "border-m-water bg-m-water text-white dark:text-[#0f1613]" : "border-m-ink hover:bg-m-wash"}`}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(s.slug)} />
                  <svg width="12" height="11" viewBox="0 0 12 11" aria-hidden><path d="M6 1 11 10H1Z" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>{s.name}
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="m-legend" aria-live="polite">
          <div className="m-legend-head flex justify-between px-5 py-3 text-[14px] font-semibold"><span>Trails open from here</span><span className="m-figure">{next.length}</span></div>
          {next.length === 0 ? <p className="px-5 py-8 text-m-muted">Mark at least one skill to open a trail.</p> : (
            <ul className="grid gap-x-8 px-5 py-4 sm:grid-cols-2">
              {next.map(n => (
                <li key={n.slug} className="border-b border-m-line py-2.5">
                  <span className="m-place block text-[18px]">{n.name}</span>
                  <span className="text-[13px] text-m-muted">from {n.via.join(" + ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Trail report: the two profiles ───────────────────────────────────────────────────────
function TrailReport() {
  const e = g.facts.evaluation, s = g.facts.search;
  const yours = g.route.map(r => ({ name: r.name, hours: r.estCost }));
  const generic = g.facts.baseline;
  const max = e.workedBaselineHours, W = 900, H = 260, pad = 30;
  const steps = (list: { name: string; hours: number }[]) => {
    let t = 0; const pts: [number, number][] = [[pad, H - pad]];
    list.forEach((x, i) => { const x0 = pad + (i / list.length) * (W - 2 * pad), x1 = pad + ((i + 1) / list.length) * (W - 2 * pad); t += x.hours; const y = H - pad - (t / max) * (H - 2 * pad); pts.push([x0, y], [x1, y]); });
    return pts;
  };
  return (
    <section id="report" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
      <h2 className="m-display text-[clamp(2rem,4.6vw,3.6rem)] uppercase leading-[1.02]">Trail report</h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-m-muted">The same goal, {g.role.title}, from Python and SQL. Each step climbs by its learning hours.</p>
      <figure className="m-legend mt-10 p-5 sm:p-8">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Generic roadmap ${max} hours versus SKILLORA route ${routeTotal} hours`}>
          <polyline points={steps(generic).map(q => q.join(",")).join(" ")} fill="none" stroke="var(--m-muted)" strokeWidth="2.5" strokeDasharray="6 6" />
          <polyline points={steps(yours).map(q => q.join(",")).join(" ")} fill="none" stroke="var(--m-trail)" strokeWidth="4" />
          <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="var(--m-ink)" />
          <text x={W - pad} y={pad - 8} textAnchor="end" fontSize="16" fill="var(--m-muted)">Generic roadmap · {max} h · {generic.map(x => x.name).join(", ")}</text>
          <text x={W - pad} y={H - pad - (routeTotal / max) * (H - 2 * pad) - 10} textAnchor="end" fontSize="16" fontWeight="700" fill="var(--m-trail)">Your route · {routeTotal} h · {yours.map(x => x.name).join(", ")}</text>
        </svg>
        <figcaption className="mt-4 text-[14px] text-m-muted">You skip SQL (already yours) and the Excel detour: {e.workedSavedPct.toFixed(1)}% less climbing.</figcaption>
      </figure>
      <dl className="mt-10 grid gap-8 md:grid-cols-3">
        {[
          ["No step out of order", `Every waypoint comes after what it needs. A shuffled generic roadmap breaks that up to ${Math.round(e.worstShuffledViolations)} times.`],
          ["Planned, not guessed", `For a ${s.role}, the planner weighs ${s.astar.toLocaleString()} candidate plans to find the best one; trying them in plain order takes ${s.dijkstra.toLocaleString()}.`],
          ["Tested on six climbs", `Across ${e.profiles} test profiles, routes were ${e.meanSavedPct.toFixed(1)}% shorter on average than the generic roadmap.`],
        ].map(([t, d]) => (
          <div key={t} className="border-t-[1.5px] border-m-ink pt-4"><dt className="text-[18px] font-bold">{t}</dt><dd className="mt-2 text-[16px] leading-relaxed text-m-muted">{d}</dd></div>
        ))}
      </dl>
    </section>
  );
}

// ── Summits: the roles as a gazetteer ────────────────────────────────────────────────────
function Summits() {
  const cats: [string, string][] = [["data", "Data"], ["engineering", "Engineering"], ["design", "Design"]];
  return (
    <section id="summits" className="mx-auto max-w-6xl px-4 py-24 sm:px-8 md:py-32">
      <h2 className="m-display text-[clamp(2rem,4.6vw,3.6rem)] uppercase leading-[1.02]">{roleDetails.length} summits</h2>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-m-muted">Open a summit to see what the climb asks for. "or" marks a choice between tools. Demand is an expert estimate.</p>
      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        {cats.map(([c, label]) => (
          <div key={c}>
            <h3 className="border-b-[1.5px] border-m-ink pb-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-m-muted">{label}</h3>
            {roleDetails.filter(r => r.category === c).sort((a, b) => b.demandScore - a.demandScore).map(r => (
              <details key={r.slug} className="group border-b border-m-line">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3">
                  <span className="m-place text-[19px]">{r.title}</span>
                  <span className="text-[13px] text-m-muted">{demandWord(r.demandScore)}</span>
                </summary>
                <ul className="space-y-1 pb-4 text-[15px]">
                  {r.requirements.map((q, i) => <li key={i}>{q.options.join(" or ")} <span className="text-m-muted">· {q.level}</span></li>)}
                </ul>
              </details>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-[1.5px] border-m-ink bg-m-paper/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8">
        <a href="#map" aria-label="SKILLORA, back to top"><Logo variant="mark" wordmark size={24} wordmarkClassName="text-[16px] text-m-ink" /></a>
        <nav className="ml-6 hidden gap-5 text-[14px] font-semibold text-m-muted md:flex" aria-label="Sections">
          {[["Map", "#map"], ["Basecamp", "#basecamp"], ["Trail report", "#report"], ["Summits", "#summits"]].map(([l, h]) => <a key={h} href={h} className="hover:text-m-ink">{l}</a>)}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch className="flex h-11 w-11 items-center justify-center text-m-ink hover:bg-m-wash" />
          <a href={`${APP}/login`} className="hidden min-h-11 items-center px-3 text-[14px] font-semibold sm:inline-flex">Sign in</a>
          <a href={`${APP}/register`} className="inline-flex min-h-11 items-center bg-m-trail px-4 text-[14px] font-bold text-white dark:text-[#0f1613]">Plot my route</a>
        </div>
      </div>
    </header>
  );
}

function Close() {
  return (
    <section className="border-t-[1.5px] border-m-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-8 md:flex-row md:items-end md:justify-between">
        <h2 className="m-display max-w-2xl text-[clamp(2.2rem,5.4vw,4.4rem)] uppercase leading-[0.98]">Start from your own basecamp.</h2>
        <Cta>Plot my route</Cta>
      </div>
      <footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-m-line px-4 py-8 text-[14px] text-m-muted sm:flex-row sm:justify-between sm:px-8">
        <span>SKILLORA is a college team project. Contours are drawn from its skill graph; hours come from its dataset and planner.</span>
        <a className="underline underline-offset-4" href="https://github.com/Vedant-Bhosle06/skillora/blob/main/docs/D6_Evaluation_Report.md">Read the evaluation</a>
      </footer>
    </section>
  );
}

function StillHero() {
  return (
    <section id="map" className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
      <h1 className="m-display text-[clamp(2.4rem,7vw,5.5rem)] uppercase">SKILLORA</h1>
      <p className="mt-3 text-[clamp(1.2rem,2.2vw,1.7rem)] font-semibold">Map the climb to your next role.</p>
      <p className="mt-6 max-w-2xl text-[17px] text-m-muted">From Python and SQL, the easiest way up to {g.role.title} is {g.route.map(s => s.name).join(", ")}: {hours(routeTotal)}. Through Excel and Power BI it is {hours(altHours)}.</p>
      <div className="mt-6"><Cta>Plot my route</Cta></div>
    </section>
  );
}

export default function Terrain() {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        {reduced ? <StillHero /> : <Hero />}
        <Basecamp />
        <TrailReport />
        <Summits />
      </main>
      <Close />
    </div>
  );
}
