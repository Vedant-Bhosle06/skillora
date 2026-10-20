import React, { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { m, useMotionValueEvent, useScroll, type MotionValue } from "motion/react";
import { useRange } from "@/lib/scrollRange";
import { SignPanel } from "@/components/transit";
import PlanCta from "./PlanCta";
import {
  ALT_PATH, ALT_STOPS, LINE_PATH, STOPS, VB_H, VB_W, altHours, genericHours, g, heldSentence, hours, lineFor, routeTotal,
} from "./data";

// The scroll-scrubbed hero: the full skill network fades in, then your line is drawn through it
// with a train riding it and the journey clock adding up to the real route total.

/** The faint full network: every skill a station, links drawn along 45 and 90 degrees like a diagram. */
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
      return { d: `M${ax} ${ay}L${mx} ${my}L${bx} ${by}`, colour: lineFor(g.nodes[a].category) };
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
  return { scale, toScreen, transform: `translate(${cx - 16 * scale} ${cy - 18.5 * scale}) scale(${scale})` };
}

function Chapter({ p, range, title, children, h1 = false }: { p: MotionValue<number>; range: [number, number, number, number]; title: string; children: ReactNode; h1?: boolean }) {
  const last = range[3] >= 1;
  const opacity = useRange(p, range, [0, 1, 1, last ? 1 : 0]);
  const y = useRange(p, [range[0], range[1]], [28, 0]);
  const [live, setLive] = useState(range[0] <= 0);
  useMotionValueEvent(p, "change", v => setLive(v >= range[0] && (last || v <= range[3])));
  const H = h1 ? "h1" : "h2";
  return (
    <m.div
      style={{ opacity, y }}
      aria-hidden={!live}
      inert={!live}
      className={`absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-8 lg:right-auto lg:w-[34rem] ${live ? "" : "pointer-events-none"}`}
    >
      <SignPanel className="overflow-hidden">
        <div className="h-2 bg-primary" />
        <div className="p-5 sm:p-7">
          <H className="text-[clamp(1.9rem,4.2vw,3.6rem)] font-[850] leading-[1.02] tracking-[-0.02em]">{title}</H>
          <div className="mt-3 text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">{children}</div>
        </div>
      </SignPanel>
    </m.div>
  );
}

function StopSign({ p, at, pos, label, cost, stageW, terminus = false, origin = false, below = false, glow }: {
  p: MotionValue<number>; at: number; pos: readonly [number, number]; label: string; cost: number; stageW: number;
  terminus?: boolean; origin?: boolean; below?: boolean; glow?: MotionValue<number>;
}) {
  const opacity = useRange(p, [at - 0.015, at + 0.01], [0, 1]);
  // Signs near an edge hang inward so they never leave the screen.
  const align = pos[0] < stageW * 0.22 ? "-translate-x-6" : pos[0] > stageW * 0.78 ? "-translate-x-[calc(100%-24px)]" : "-translate-x-1/2";
  return (
    <m.div
      style={{ opacity: glow ?? opacity, left: pos[0], top: pos[1] }}
      className={`pointer-events-none absolute ${below ? "translate-y-5" : "-translate-y-[calc(100%+18px)]"} ${align}`}
      aria-hidden="true"
    >
      <div className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-[13px] font-bold sm:text-[14px] ${terminus ? "border-foreground bg-foreground text-background" : "border-border bg-card text-card-foreground"}`}>
        {label}{cost > 0 && <span className="ml-2 font-mono font-normal text-muted-foreground">+{hours(cost)}</span>}
      </div>
    </m.div>
  );
}

export default function Hero() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const linePath = useRef<SVGPathElement>(null);
  const train = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState({ w: 1440, h: 844 });
  // The 56px header stays above the sticky stage, so progress starts when the section meets it.
  const { scrollYProgress: p } = useScroll({ target: section, offset: ["start 56px", "end end"] });
  const net = useNetwork();
  const frame = lineFrame(size.w, size.h);

  const netOpacity = useRange(p, [0.1, 0.32, 0.45, 0.6], [0.08, 0.7, 0.7, 0.22]);
  const drawn = useRange(p, [0.45, 0.76], [0, 1]);
  const dashOffset = useRange(p, [0.45, 0.76], [1, 0]);
  const drawnVisible = useRange(p, [0.449, 0.452], [0, 1]);
  const altShow = useRange(p, [0.78, 0.88], [0, 1]);
  const originGlow = useRange(p, [0.08, 0.16], [0, 1]);
  const clockShow = useRange(p, [0.44, 0.48], [0, 1]);

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
  useMotionValueEvent(drawn, "change", move);
  useEffect(() => move(drawn.get()), [size.w, size.h]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section ref={section} id="line" className="relative h-[330vh] scroll-mt-14 md:h-[420vh]" aria-label={`Your line to ${g.role.title}`}>
      <div ref={stage} className="sticky top-14 h-[calc(100svh-3.5rem)] overflow-hidden">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <m.g style={{ opacity: netOpacity }}>
            {net.paths.map((e, i) => <path key={i} d={e.d} fill="none" stroke={e.colour} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />)}
            {net.pos.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5} fill="var(--station)" stroke="var(--foreground)" strokeWidth={2} opacity={0.6} />)}
          </m.g>
          <g transform={frame.transform}>
            <m.path d={ALT_PATH} fill="none" stroke="var(--line-route)" strokeWidth={9} strokeDasharray="2 14" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ opacity: altShow }} />
            <path d={LINE_PATH} fill="none" stroke="var(--casing)" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={LINE_PATH} fill="none" stroke="var(--border)" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <m.path ref={linePath} d={LINE_PATH} pathLength={1} fill="none" stroke="var(--line-route)" strokeWidth={12 / frame.scale} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" style={{ strokeDashoffset: dashOffset, opacity: drawnVisible }} />
            {STOPS.map((st, i) => (
              <circle key={i} cx={st.x} cy={st.y} r={st.kind === "stop" ? 0.62 : 0.85} fill="var(--station)" stroke="var(--foreground)" strokeWidth={st.kind === "stop" ? 4 : 6} vectorEffect="non-scaling-stroke" />
            ))}
            {ALT_STOPS.map(st => <m.circle key={st.name} cx={st.x} cy={st.y} r={0.55} fill="var(--station)" stroke="var(--foreground)" strokeWidth={3} vectorEffect="non-scaling-stroke" style={{ opacity: altShow }} />)}
          </g>
        </svg>

        {/* Station signs */}
        {STOPS.map((st, i) => (
          <StopSign key={i} stageW={size.w} p={p} at={i === 0 ? 0.08 : 0.45 + stopAt[i] * 0.31} pos={frame.toScreen(st.x, st.y)}
            label={st.name} cost={st.cost} terminus={st.kind === "terminus"} origin={st.kind === "origin"} below={st.kind !== "stop"} glow={i === 0 ? originGlow : undefined} />
        ))}
        {ALT_STOPS.map(st => <StopSign key={st.name} stageW={size.w} p={p} at={0.8} pos={frame.toScreen(st.x, st.y)} label={st.name} cost={0} below />)}

        <div ref={train} className="pointer-events-none absolute left-0 top-0 flex h-7 w-11 items-center justify-center rounded-md bg-foreground opacity-0" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>

        <m.div style={{ opacity: clockShow }} className="absolute left-4 top-4 rounded-md border border-border bg-card px-4 py-2 font-mono text-[14px] lg:bottom-8 lg:left-auto lg:right-8 lg:top-auto" aria-hidden="true">
          Journey <span ref={clock}>00.0 h</span> / {hours(routeTotal)}
        </m.div>

        <Chapter p={p} range={[-0.02, -0.01, 0.06, 0.1]} title="SKILLORA" h1>
          <p className="text-[clamp(1.2rem,2vw,1.6rem)] font-bold leading-snug text-foreground">Your line to your next role.</p>
          <p className="mt-2">Tell us the skills you have and the job you want. We plan the stops in between, in an order that always works.</p>
          <div className="mt-5 flex flex-wrap gap-3"><PlanCta /></div>
        </Chapter>
        <Chapter p={p} range={[0.1, 0.14, 0.24, 0.28]} title="You are here.">
          {heldSentence}. Two stations already on your map.
        </Chapter>
        <Chapter p={p} range={[0.28, 0.32, 0.41, 0.45]} title={`${g.nodes.length} stations, ${g.edges.length} connections.`}>
          Every skill is a station. A prerequisite is the track you take to reach it.
        </Chapter>
        <Chapter p={p} range={[0.45, 0.49, 0.74, 0.78]} title={`Your line to ${g.role.title}.`}>
          {g.route.map(s => s.name).join(", then ")}. {hours(routeTotal)} door to door; a generic roadmap for the same job takes {hours(genericHours)}.
        </Chapter>
        <Chapter p={p} range={[0.78, 0.83, 1, 1]} title="Or change at Excel.">
          <p>Excel then Power BI also gets you there, in {hours(altHours)}. Both lines are on the board; you choose.</p>
          <div className="mt-5"><PlanCta /></div>
        </Chapter>
      </div>
    </section>
  );
}
