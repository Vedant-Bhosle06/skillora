import React, { useEffect, useRef } from "react";
import { landingGraph } from "@/content/landingGraph";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import GraphMap from "./GraphMap";
import { Bezel, Label } from "./Glass";

// The same map twice: a quiet layer, and a lit layer that shows only inside a soft circle
// following the pointer. What lights up is real: the skills Python + SQL unlock right now.
// On touch screens the light wanders on its own; with reduced motion the lit layer is shown whole.

export default function CursorReveal() {
  const stage = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const g = landingGraph;
  const names = new Map(g.nodes.map(n => [n.slug, n.name]));
  const ready = g.readyNow.map(s => names.get(s)!);

  useEffect(() => {
    const el = stage.current;
    if (!el || reduced) return;
    const set = (x: number, y: number) => { el.style.setProperty("--mx", `${x}px`); el.style.setProperty("--my", `${y}px`); };
    const box = () => el.getBoundingClientRect();
    set(box().width * 0.42, box().height * 0.5);

    const touch = window.matchMedia("(hover: none)").matches;
    if (!touch) {
      const move = (e: PointerEvent) => { const b = box(); set(e.clientX - b.left, e.clientY - b.top); };
      el.addEventListener("pointermove", move);
      return () => el.removeEventListener("pointermove", move);
    }
    // Touch: wander slowly along a looping path while the section is on screen.
    let raf = 0, on = false;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000, b = box();
      set(b.width * (0.5 + 0.34 * Math.sin(t * 0.42)), b.height * (0.5 + 0.3 * Math.sin(t * 0.67 + 1)));
      if (on) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (on) raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { on = false; cancelAnimationFrame(raf); io.disconnect(); };
  }, [reduced]);

  return (
    <section id="reach" className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 md:py-36">
      <div className="grid gap-10 md:grid-cols-[1fr_1.6fr] md:items-end">
        <div>
          <Label>Within reach</Label>
          <h2 className="font-statement mt-5 text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02]">What you know <span className="italic">lights the way.</span></h2>
        </div>
        <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground md:justify-self-end">
          Move across the map. With just Python and SQL, {ready.length} skills are ready to start today: {ready.slice(0, -1).join(", ")} and {ready[ready.length - 1]}.
        </p>
      </div>
      <Bezel className="mt-12" core="p-2 sm:p-4">
        <div ref={stage} className="relative aspect-[1000/620] w-full cursor-crosshair touch-pan-y select-none">
          <GraphMap tone="dim" highlight="none" labels={false} className="absolute inset-0 h-full w-full" />
          <GraphMap tone="lit" highlight="ready" className="reveal-lit absolute inset-0 h-full w-full" title={`Skill map: ${ready.length} skills unlocked by Python and SQL`} />
          <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 text-[12px]">
            <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5"><i className="h-2 w-2 rounded-full" style={{ background: "var(--graph-held)" }} />You know</span>
            <span className="glass-pill inline-flex items-center gap-2 rounded-full px-3 py-1.5"><i className="h-2 w-2 rounded-full" style={{ background: "var(--graph-ready)" }} />Ready to start</span>
          </div>
        </div>
      </Bezel>
    </section>
  );
}
