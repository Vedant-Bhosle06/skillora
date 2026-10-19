import React, { ReactNode, useEffect, useRef, useState } from "react";
import { m, useMotionTemplate, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { landingGraph, formatHours } from "@/content/landingGraph";
import { useRange } from "@/lib/scrollRange";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/auth/AuthContext";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import GraphMap from "./GraphMap";
import { Label, PillLink } from "./Glass";
import type { GraphScene as GraphSceneType } from "./GraphScene";

// Scroll-scrubbed hero. Scrolling down plays the story forward, scrolling up rewinds it:
// one skill you know → everything it opens → the whole map → the cheapest route → the mark.

type Stats = { skills: number; roles: number };



/** "Your path, *in order.*" → words, with *…* set in italics. */
function words(statement: string) {
  const out: { text: string; italic: boolean }[] = [];
  let italic = false;
  for (const raw of statement.split(" ")) {
    let w = raw;
    const opens = w.startsWith("*");
    if (opens) { italic = true; w = w.slice(1); }
    const closes = w.endsWith("*");
    if (closes) w = w.slice(0, -1);
    out.push({ text: w, italic });
    if (closes) italic = false;
  }
  return out;
}

function Word({ progress, range, keep, italic, children }: { progress: MotionValue<number>; range: [number, number, number, number]; keep: boolean; italic: boolean; children: ReactNode }) {
  const opacity = useRange(progress, range, [0, 1, 1, keep ? 1 : 0]);
  const y = useRange(progress, [range[0], range[1]], [22, 0]);
  const blur = useRange(progress, [range[0], range[1]], [10, 0]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  return (
    <m.span style={{ opacity, y, filter }} className={`inline-block will-change-transform ${italic ? "italic" : ""}`}>
      {children}
    </m.span>
  );
}

interface ChapterProps {
  progress: MotionValue<number>;
  from: number;
  to: number;
  label: string;
  statement: string;
  note: ReactNode;
  last?: boolean;
  children?: ReactNode;
}

/** One chapter: words write in across the first part of its range and fade at its end. */
function Chapter({ progress, from, to, label, statement, note, last = false, children }: ChapterProps) {
  const list = words(statement);
  const span = (to - from) * 0.42;
  const outA = last ? 0.999 : to - (to - from) * 0.16;
  const outB = last ? 1 : to;
  const fade = useRange(progress, [from, from + span * 0.4, outA, outB], [0, 1, 1, last ? 1 : 0]);
  const [live, setLive] = useState(false);
  useMotionValueEvent(progress, "change", v => setLive(v >= from + span * 0.5 && v <= outB));
  return (
    <div className="absolute inset-x-0 bottom-0 px-5 pb-[12svh] sm:px-10 md:pb-[14svh]" aria-hidden={!live} style={{ pointerEvents: live ? "auto" : "none" }}>
      <m.div style={{ opacity: fade }}><Label className="mb-5">{label}</Label></m.div>
      <p className="font-statement max-w-[14ch] text-[clamp(2.75rem,7.2vw,6.5rem)] leading-[0.98] text-foreground">
        {list.map((w, i) => {
          const a = from + (span * i) / list.length;
          return (
            <React.Fragment key={i}>
              <Word progress={progress} range={[a, a + span * 0.55, outA, outB]} keep={last} italic={w.italic}>{w.text}</Word>{" "}
            </React.Fragment>
          );
        })}
      </p>
      <m.div style={{ opacity: fade }} className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">{note}</m.div>
      {children && <m.div style={{ opacity: fade }} className="mt-8">{children}</m.div>}
    </div>
  );
}

function useStageSize(ref: React.RefObject<HTMLElement | null>, onSize: (w: number, h: number) => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => onSize(e.contentRect.width, e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, onSize]);
}

function Ctas() {
  const { status } = useAuth();
  return status === "authenticated" ? (
    <div className="flex flex-wrap gap-3"><PillLink to="/dashboard">Open my dashboard</PillLink></div>
  ) : (
    <div className="flex flex-wrap gap-3">
      <PillLink to="/register">Map my skills</PillLink>
      <PillLink to="/login" ghost>Sign in</PillLink>
    </div>
  );
}

export default function HeroScroll({ stats }: { stats: Stats }) {
  const reduced = usePrefersReducedMotion();
  return reduced ? <HeroStill stats={stats} /> : <HeroScrub stats={stats} />;
}

function HeroScrub({ stats }: { stats: Stats }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const scene = useRef<GraphSceneType | null>(null);
  const [mode, setMode] = useState<"loading" | "webgl" | "flat">("loading");
  const { darkMode } = useTheme();
  const darkRef = useRef(darkMode);
  darkRef.current = darkMode;

  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const g = landingGraph;

  // Load three.js only here, build the scene, and drive it from scroll.
  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let onScreen = false;
    let unsubscribe = () => {};
    import("./GraphScene").then(({ GraphScene, webglAvailable }) => {
      if (cancelled || !canvas.current || !labels.current) return;
      if (!webglAvailable()) { setMode("flat"); return; }
      try {
        const s = new GraphScene(canvas.current, labels.current, g, { dark: darkRef.current });
        scene.current = s;
        const box = stage.current!.getBoundingClientRect();
        s.resize(box.width, box.height);
        s.setProgress(scrollYProgress.get());
        unsubscribe = scrollYProgress.on("change", v => s.setProgress(v));
        observer = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
          if (onScreen && !document.hidden) s.start(); else s.stop();
        });
        observer.observe(section.current!);
        setMode("webgl");
      } catch {
        setMode("flat");
      }
    }).catch(() => !cancelled && setMode("flat"));
    // Pause in hidden tabs; resume when the tab comes back and the hero is on screen.
    const onVisibility = () => { if (document.hidden) scene.current?.stop(); else if (onScreen) scene.current?.start(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      unsubscribe();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      scene.current?.dispose();
      scene.current = null;
    };
  }, [g, scrollYProgress]);

  useEffect(() => { scene.current?.setTheme(darkMode); }, [darkMode]);
  useStageSize(stage, React.useCallback((w: number, h: number) => scene.current?.resize(w, h), []));

  const titleOut = useRange(scrollYProgress, [0.04, 0.1], [1, 0]);
  const titleY = useRange(scrollYProgress, [0, 0.1], [0, -40]);
  const cue = useRange(scrollYProgress, [0, 0.04], [1, 0]);
  const rail = useTransform(scrollYProgress, (v: number) => `${Math.min(100, Math.max(0, v * 100))}%`);
  const neighbours = ["NumPy", "Pandas", "Jupyter", "PySpark"];
  const [r1, r2, r3, r4] = g.route;

  return (
    <section ref={section} className="relative h-[520vh]" aria-label="How SKILLORA finds your path">
      <div ref={stage} className="sticky top-0 h-[100svh] overflow-hidden">
        <canvas ref={canvas} className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${mode === "webgl" ? "opacity-100" : "opacity-0"}`} />
        <div ref={labels} className="pointer-events-none absolute inset-0" aria-hidden />
        {mode === "flat" && <GraphMap className="absolute inset-0 m-auto h-[70%] w-[92%] opacity-70" highlight="route" />}

        {/* Opening title, like a film card: the name, wide, bottom-left. */}
        <m.div style={{ opacity: titleOut, y: titleY }} className="absolute inset-x-0 bottom-0 px-5 pb-[12svh] sm:px-10 md:pb-[14svh]">
          <m.h1 initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>
            <span className="font-wide block text-[clamp(2.4rem,9vw,8.5rem)] font-bold leading-none text-foreground">Skillora</span>
            <span className="font-statement mt-5 block text-[clamp(1.6rem,3.2vw,2.75rem)] italic leading-tight text-foreground">The shortest path to your next role.</span>
          </m.h1>
          <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Tell us what you know and where you want to go. We work out what to learn next, in an order that always makes sense.
          </m.p>
        </m.div>

        <Chapter progress={scrollYProgress} from={0.1} to={0.27} label="Where you start" statement="You already know *one thing.*"
          note="Python, at beginner level. On SKILLORA, that is already a place on the map." />
        <Chapter progress={scrollYProgress} from={0.27} to={0.45} label="What it opens" statement="Every skill leads *somewhere.*"
          note={`${neighbours.join(", ")} and more build on it.`} />
        <Chapter progress={scrollYProgress} from={0.45} to={0.58} label="The map" statement={`${stats.skills} skills. *${g.edges.length} links.*`}
          note={`${stats.roles} roles, from Data Analyst to DevOps Engineer, each with what it needs first.`} />
        <Chapter progress={scrollYProgress} from={0.58} to={0.79} label={`Your route to ${g.role.title}`} statement="The cheapest way *through.*"
          note={<>{[r1, r2, r3, r4].map(s => s.name).join(" → ")} · <span className="text-foreground">{formatHours(g.totalHours)}</span>, instead of {formatHours(g.facts.evaluation.workedBaselineHours)} for a generic roadmap.</>} />
        <Chapter progress={scrollYProgress} from={0.8} to={1} last label="Your path" statement="Your path, *in order.*"
          note="Four steps, four nodes: the route you just watched is the mark we sign with.">
          <Ctas />
        </Chapter>

        {/* Scroll cue + progress rail */}
        <m.div style={{ opacity: cue }} className="font-wide pointer-events-none absolute bottom-6 right-5 text-[10px] font-bold text-muted-foreground sm:right-10">Scroll</m.div>
        <div className="absolute right-3 top-1/2 hidden h-40 w-px -translate-y-1/2 bg-foreground/10 sm:block" aria-hidden>
          <m.div className="w-px bg-gradient-brand" style={{ height: rail }} />
        </div>
      </div>
    </section>
  );
}

/** Reduced motion: the same story as a still page. */
function HeroStill({ stats }: { stats: Stats }) {
  const g = landingGraph;
  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-32 sm:px-10">
      <h1>
        <span className="font-wide block text-[clamp(2.4rem,9vw,8.5rem)] font-bold leading-none">Skillora</span>
        <span className="font-statement mt-5 block text-[clamp(1.6rem,3.2vw,2.75rem)] italic leading-tight">The shortest path to your next role.</span>
      </h1>
      <GraphMap className="mt-12 w-full" highlight="route" title={`The skill graph with the route to ${g.role.title}`} />
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <p className="text-lg leading-relaxed text-muted-foreground">
          {stats.skills} skills and {g.edges.length} links across {stats.roles} roles. From Python and SQL, the cheapest way to {g.role.title} is{" "}
          {g.route.map(s => s.name).join(" → ")}: <span className="text-foreground">{formatHours(g.totalHours)}</span>.
        </p>
        <div className="md:justify-self-end"><Ctas /></div>
      </div>
    </section>
  );
}
