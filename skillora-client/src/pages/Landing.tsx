import React, { useMemo, useState } from "react";
import { m, type Variants } from "motion/react";
import Logo from "@/components/Logo";
import { usePublicStats, useRoles } from "@/api/queries";
import { landingGraph } from "@/content/landingGraph";
import LandingNav from "@/components/landing/LandingNav";
import HeroScroll from "@/components/landing/HeroScroll";
import Bento from "@/components/landing/Bento";
import CursorReveal from "@/components/landing/CursorReveal";
import { Bezel, Label, PillLink } from "@/components/landing/Glass";
import { useAuth } from "@/auth/AuthContext";

// Homepage — "Nocturne Glass": a scroll-scrubbed WebGL hero drawn from the real skill graph,
// glass bento, a cursor-lit map, live roles. Works in light and dark mode.

const EXPO = [0.16, 1, 0.3, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(10px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EXPO } },
};
const group: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } };

const CATEGORIES = [["data", "Data"], ["engineering", "Engineering"], ["design", "Design"]] as const;

function Roles() {
  const roles = useRoles();
  const [cat, setCat] = useState<string>("data");
  const shown = useMemo(
    () => (roles.data ?? []).filter(r => r.category === cat).sort((a, b) => b.demandScore - a.demandScore),
    [roles.data, cat],
  );
  return (
    <section id="roles" className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 md:py-32">
      <div className="grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <m.div variants={rise} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Label>{roles.data ? `${roles.data.length} roles` : "Roles"}</Label>
          <h2 className="font-statement mt-5 text-[clamp(2.4rem,4.6vw,4rem)] leading-[1.02]">Pick where <span className="italic">you are headed.</span></h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">Each role lists what it needs, including the places where more than one tool will do.</p>
          <div className="mt-8 inline-flex rounded-full bg-foreground/[0.04] p-1 ring-1 ring-foreground/10" role="tablist" aria-label="Role category">
            {CATEGORIES.map(([value, label]) => (
              <button key={value} role="tab" aria-selected={cat === value} onClick={() => setCat(value)}
                className={`rounded-full px-4 py-2 text-[13px] ${cat === value ? "bg-foreground/[0.1] text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
        </m.div>
        {roles.isError ? (
          <p className="self-center text-[15px] text-muted-foreground">Roles could not be loaded right now.</p>
        ) : (
          <m.ul key={cat} className="grid content-start gap-3 sm:grid-cols-2" variants={group} initial="hidden" animate="visible">
            {(roles.isPending ? Array.from({ length: 4 }, () => null) : shown).map((r, i) => (
              <m.li key={r?._id ?? i} variants={rise}>
                <Bezel core="px-5 py-4">
                  {r ? (
                    <>
                      <p className="font-semibold tracking-tight text-foreground">{r.title}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="h-1 flex-1 rounded-full bg-foreground/[0.08]"><div className="h-full rounded-full bg-primary" style={{ width: `${r.demandScore * 100}%` }} /></div>
                        <span className="text-[11px] tabular-nums text-muted-foreground">demand {r.demandScore.toFixed(2)}</span>
                      </div>
                      <p className="mt-2 text-[12px] text-muted-foreground">{r.requiredSkills.length} requirements</p>
                    </>
                  ) : (
                    <div className="h-[76px] animate-pulse rounded-xl bg-foreground/[0.05]" />
                  )}
                </Bezel>
              </m.li>
            ))}
          </m.ul>
        )}
      </div>
    </section>
  );
}

function Close() {
  const { status } = useAuth();
  const e = landingGraph.facts.evaluation;
  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-16 sm:px-8">
      <m.div variants={rise} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <Bezel core="px-6 py-16 text-center sm:px-16 sm:py-24">
          <h2 className="font-statement mx-auto max-w-2xl text-[clamp(2.4rem,5vw,4.25rem)] leading-[1.02]">Start with <span className="italic">what you already know.</span></h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Across {e.profiles} test profiles, plans were {e.meanSavedPct.toFixed(1)}% shorter on average than a generic roadmap, with no step out of order.
          </p>
          <div className="mt-10 flex justify-center">
            {status === "authenticated" ? <PillLink to="/dashboard">Open my dashboard</PillLink> : <PillLink to="/register">Map my skills</PillLink>}
          </div>
        </Bezel>
      </m.div>
      <footer className="mt-16 flex flex-col items-center justify-between gap-4 text-[13px] text-muted-foreground sm:flex-row">
        <Logo variant="mark" wordmark size={22} wordmarkClassName="text-[14px]" />
        <p>{landingGraph.nodes.length} skills · {landingGraph.edges.length} links · built on an A* search</p>
      </footer>
    </section>
  );
}

export default function Landing() {
  const publicStats = usePublicStats();
  const stats = {
    skills: publicStats.data?.skillCount ?? landingGraph.nodes.length,
    roles: publicStats.data?.roleCount ?? 18,
  };
  return (
    <div className="landing relative min-h-screen bg-background text-foreground">
      <div className="ambient" aria-hidden><i /><i /><i /></div>
      <LandingNav />
      <main className="relative z-10">
        <HeroScroll stats={stats} />
        <Bento />
        <CursorReveal />
        <Roles />
        <Close />
      </main>
    </div>
  );
}
