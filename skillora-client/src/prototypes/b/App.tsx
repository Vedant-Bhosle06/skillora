import React, { ReactNode, useState } from "react";
import { AnimatePresence, m, type Variants } from "motion/react";
import Logo from "@/components/Logo";
import { data, hours, RANK_LABEL, scenario, type Step } from "../data";

// Prototype B — "Daylight Editorial"
// Taste skill: minimalist-ui (warm monochrome, editorial serif, flat asymmetric bento, pastel
// accents, quiet motion). Deviation by brief: panels are frosted glass rather than flat white.

const EASE = [0.16, 1, 0.3, 1] as const;
const fade: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
const cascade: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

function In({ children, className = "", as = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "li" }) {
  const C = m[as];
  return <C className={className} variants={fade} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>{children}</C>;
}

type Tone = "blue" | "green" | "yellow" | "red" | "plain";
function Tag({ tone = "plain", children }: { tone?: Tone; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    blue: "bg-b-blue-bg text-b-blue", green: "bg-b-green-bg text-b-green", yellow: "bg-b-yellow-bg text-b-yellow",
    red: "bg-b-red-bg text-b-red", plain: "bg-black/[0.04] text-b-muted",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.05em] ${tones[tone]}`}>{children}</span>;
}

/** What kind of step this is, read from the engine's own rationale. */
function stepKind(st: Step): { tone: Tone; label: string } {
  if (st.fromRank > 0) return { tone: "red", label: "Upgrade" };
  if (st.rationale.startsWith("Chosen for")) return { tone: "green", label: "Your choice" };
  if (st.rationale.startsWith("Required")) return { tone: "blue", label: "Required" };
  return { tone: "yellow", label: "Prerequisite" };
}

function Button({ children, href = "#", quiet = false }: { children: ReactNode; href?: string; quiet?: boolean }) {
  return (
    <a href={href} className={`inline-flex items-center gap-2 rounded-[6px] px-4 py-2.5 text-[14px] font-medium transition-[background-color,transform] duration-200 ease-b active:scale-[0.98] ${
      quiet ? "text-b-ink hover:bg-black/[0.04]" : "bg-b-ink text-white hover:bg-[#333]"}`}>
      {children}
    </a>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-b-bone/75 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Logo variant="tile" wordmark size={26} wordmarkClassName="text-[15px] text-b-ink" />
        <div className="hidden items-center gap-7 text-[14px] text-b-muted md:flex">
          <a href="#plan" className="hover:text-b-ink">The plan</a>
          <a href="#evidence" className="hover:text-b-ink">Evidence</a>
          <a href="#faq" className="hover:text-b-ink">Questions</a>
        </div>
        <div className="flex items-center gap-1">
          <Button quiet>Sign in</Button>
          <span className="hidden sm:inline-flex"><Button>Get started</Button></span>
        </div>
      </nav>
    </header>
  );
}

// ── Hero with a faux-OS window holding the real roadmap ───────────────────────────────

function RoadmapWindow() {
  const s = scenario("analyst");
  const [primary] = s.paths;
  const [done, setDone] = useState<string[]>([]);
  const left = primary.steps.filter(x => !done.includes(x.slug)).reduce((t, x) => t + x.estCost, 0);
  return (
    <div className="b-glass overflow-hidden">
      <div className="flex items-center gap-2 border-b border-b-line bg-white/70 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#e5e4e0]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e5e4e0]" /><span className="h-2.5 w-2.5 rounded-full bg-[#e5e4e0]" />
        <span className="ml-3 text-[12px] text-b-muted">skillora — roadmap</span>
      </div>
      <div className="grid gap-0 md:grid-cols-[1fr_15rem]">
        <ol className="divide-y divide-b-line">
          {primary.steps.map((st, i) => {
            const k = stepKind(st);
            const isDone = done.includes(st.slug);
            return (
              <li key={st.slug} className="flex items-start gap-4 px-5 py-4">
                <button
                  onClick={() => setDone(d => isDone ? d.filter(x => x !== st.slug) : [...d, st.slug])}
                  aria-label={`${isDone ? "Unmark" : "Mark"} ${st.name} as done`}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${isDone ? "border-b-ink bg-b-ink text-white" : "border-[#d4d3cf] bg-white hover:border-b-ink"}`}
                >
                  {isDone && <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden><path d="M2.5 6.5 5 9l4.5-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[15px] font-medium ${isDone ? "text-b-muted line-through" : "text-b-ink"}`}>{i + 1}. {st.name}</span>
                    <Tag tone={k.tone}>{k.label}</Tag>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-b-muted">{st.rationale}</p>
                </div>
                <span className="shrink-0 font-[family-name:var(--font-b-mono)] text-[12px] text-b-muted">{hours(st.estCost)}</span>
              </li>
            );
          })}
        </ol>
        <aside className="border-t border-b-line bg-white/40 p-5 md:border-l md:border-t-0">
          <p className="text-[12px] text-b-muted">Target role</p>
          <p className="font-[family-name:var(--font-b-serif)] text-[28px] leading-tight text-b-ink">{s.role.title}</p>
          <p className="mt-5 text-[12px] text-b-muted">Time left</p>
          <p className="font-[family-name:var(--font-b-serif)] text-[44px] leading-none text-b-ink">{hours(left)}</p>
          <p className="mt-5 text-[12px] leading-relaxed text-b-muted">You already have {s.held.map(h => `${h.name} (${RANK_LABEL[h.rank].toLowerCase()})`).join(" and ")}.</p>
          <p className="mt-5 flex items-center gap-1.5 text-[12px] text-b-muted">Tick a step <span className="b-kbd">Space</span></p>
        </aside>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 pt-20 md:pb-32 md:pt-28">
      <m.div variants={cascade} initial="hidden" animate="visible" className="max-w-3xl">
        <m.h1 variants={fade} className="font-[family-name:var(--font-b-serif)] text-[clamp(2.75rem,6.4vw,5.25rem)] leading-[1.02] tracking-[-0.02em] text-b-ink">
          Know the shortest way to the job you want.
        </m.h1>
        <m.p variants={fade} className="mt-6 max-w-xl text-[18px] leading-relaxed text-b-text">
          Tell SKILLORA what you can already do and which role you are aiming for. It works out what is left to learn, in an order that always makes sense, and how many hours it will take.
        </m.p>
        <m.div variants={fade} className="mt-8 flex flex-wrap gap-2">
          <Button>Map my skills</Button>
          <Button quiet href="#plan">See an example plan</Button>
        </m.div>
      </m.div>
      <In className="mt-16 md:mt-20"><RoadmapWindow /></In>
    </section>
  );
}

// ── The plan, as an asymmetric bento ──────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <In className={`b-glass b-glass-hover p-7 md:p-8 ${className}`}>{children}</In>;
}

function PanelHead({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h3 className="font-[family-name:var(--font-b-serif)] text-[28px] leading-tight text-b-ink">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-b-muted">{body}</p>
    </>
  );
}

function PlanBento() {
  const reqs = data.analystRequirements;
  const held: Record<string, number> = { python: 1, sql: 2 };
  const RANK: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const s = scenario("analyst");
  const [p1, p2] = s.paths;
  const bi = (p: typeof p1) => p.steps.filter(x => ["tableau", "excel", "power-bi"].includes(x.slug));
  return (
    <section id="plan" className="mx-auto max-w-5xl px-5 py-24 md:py-32">
      <In className="max-w-2xl">
        <h2 className="font-[family-name:var(--font-b-serif)] text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-b-ink">How a plan is put together</h2>
      </In>
      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-12">
        <Panel className="md:col-span-7">
          <PanelHead title="It starts from what you have" body="Each requirement of the role is checked against your profile. Skills you hold at the right level drop out." />
          <ul className="mt-6 divide-y divide-b-line rounded-[10px] border border-b-line bg-white/60">
            {reqs.map(r => {
              const best = Math.max(...r.options.map(o => held[o.slug] ?? 0));
              const need = RANK[r.minProficiency];
              const state: { tone: Tone; label: string } = best >= need ? { tone: "green", label: "Have it" } : best > 0 ? { tone: "red", label: "Level up" } : { tone: "plain", label: "To learn" };
              return (
                <li key={r.options.map(o => o.slug).join()} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-[14px] text-b-ink">{r.label ? `${r.label}: ` : ""}{r.options.map(o => o.name).join(" or ")} <span className="text-b-muted">· {r.minProficiency}</span></span>
                  <Tag tone={state.tone}>{state.label}</Tag>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel className="md:col-span-5">
          <PanelHead title="Either tool will do" body="The role asks for one BI tool. Both routes are priced, and you see both." />
          <div className="mt-6 space-y-3">
            {[p1, p2].map(p => (
              <div key={p.rank} className="rounded-[10px] border border-b-line bg-white/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] text-b-ink">{bi(p).map(x => x.name).join(" → ")}</span>
                  <Tag tone={p.rank === 1 ? "green" : "plain"}>{p.rank === 1 ? "Suggested" : "Option"}</Tag>
                </div>
                <p className="mt-1.5 font-[family-name:var(--font-b-mono)] text-[12px] text-b-muted">{hours(bi(p).reduce((t, x) => t + x.estCost, 0))} for this part · whole plan {hours(p.totalLearningCost)}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="md:col-span-5">
          <PanelHead title="Things come in order" body="Pandas waits for Python. Power BI waits for Excel. A step never appears before what it needs." />
          <svg viewBox="0 0 320 120" className="mt-6 w-full" role="img" aria-label="Python leads to Pandas; Excel leads to Power BI">
            <rect x="196" y="16" width="96" height="36" rx="8" fill="#e1f3fe" transform="rotate(-4 244 34)" />
            {[["Python", 20, 34, "Pandas", 200, 34], ["Excel", 20, 88, "Power BI", 200, 88]].map(([a, ax, ay, b, bx, by]) => (
              <g key={String(a)}>
                <text x={Number(ax)} y={Number(ay) + 5} fontSize="15" fill="#111" fontFamily="Geist Variable">{a}</text>
                <path d={`M${Number(ax) + 62} ${ay} C ${Number(ax) + 110} ${Number(ay) - 14}, ${Number(bx) - 50} ${Number(by) + 14}, ${Number(bx) - 8} ${by}`} stroke="#111" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                <path d={`M${Number(bx) - 14} ${Number(by) - 5} L${Number(bx) - 7} ${by} L${Number(bx) - 14} ${Number(by) + 5}`} stroke="#111" strokeWidth="1.3" fill="none" strokeLinecap="round" />
                <text x={Number(bx)} y={Number(by) + 5} fontSize="15" fill="#111" fontFamily="Geist Variable">{b}</text>
              </g>
            ))}
          </svg>
        </Panel>

        <Panel className="md:col-span-7">
          <PanelHead title="The numbers behind it" body="A curated graph, kept small enough to check by hand." />
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            {[
              [data.stats.skills, "skills"],
              [data.stats.prerequisiteEdges, "prerequisite links"],
              [data.stats.roles, "roles"],
              [data.stats.orGroups, "either-or choices"],
            ].map(([n, label]) => (
              <div key={String(label)}>
                <dt className="sr-only">{label}</dt>
                <dd className="font-[family-name:var(--font-b-serif)] text-[44px] leading-none text-b-ink">{n}</dd>
                <p className="mt-1 text-[13px] text-b-muted">{label}</p>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </section>
  );
}

// ── Evidence table + FAQ + close ─────────────────────────────────────────────────────

function Evidence() {
  const rows = data.evaluation.scenarios;
  return (
    <section id="evidence" className="mx-auto max-w-5xl px-5 py-24 md:py-32">
      <div className="grid gap-12 md:grid-cols-[1fr_1.5fr]">
        <In>
          <h2 className="font-[family-name:var(--font-b-serif)] text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-b-ink">Shorter than a generic roadmap</h2>
          <p className="mt-5 text-[16px] leading-relaxed text-b-text">We compared each plan with the usual advice: learn everything the role lists, plus its prerequisites, from scratch. Across six profiles the plans were {data.evaluation.meanTimeSavedPct.toFixed(1)}% shorter on average, and never out of order.</p>
        </In>
        <In className="b-glass overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead className="bg-white/60 text-[12px] text-b-muted">
              <tr><th className="px-5 py-3 font-medium">Profile</th><th className="px-3 py-3 font-medium">Plan</th><th className="px-3 py-3 font-medium">Generic</th><th className="px-5 py-3 text-right font-medium">Saved</th></tr>
            </thead>
            <tbody className="divide-y divide-b-line">
              {rows.map(r => (
                <tr key={r.name}>
                  <td className="px-5 py-3 text-b-ink">{r.name.replace(/^S\d /, "")}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-[family-name:var(--font-b-mono)] text-[12.5px]">{hours(r.systemHours)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-[family-name:var(--font-b-mono)] text-[12.5px] text-b-muted">{hours(r.baselineHours)}</td>
                  <td className="px-5 py-3 text-right"><Tag tone={r.timeSavedPct > 20 ? "green" : "plain"}>{r.timeSavedPct.toFixed(1)}%</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </In>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  ["Where do the hours come from?", "Each skill carries an estimate of the hours from zero to a working level, curated from course syllabi and roadmap.sh. Moving up one level costs half of it. They are estimates, and the plan says so."],
  ["What if I already know part of it?", "Add it with your level. A requirement you already meet drops out, and a skill you know at a lower level shows up as a shorter upgrade."],
  ["What happens when I finish a skill?", "Tick it off. The plan is worked out again from your new profile, and the old one is kept in your history."],
  ["Can I take a different route?", "Yes. When a role accepts more than one tool you get up to three routes, ranked by hours and by how often employers ask for those skills."],
];

function Questions() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24 md:py-32">
      <In><h2 className="font-[family-name:var(--font-b-serif)] text-[clamp(2.25rem,4.4vw,3.5rem)] leading-[1.05] tracking-[-0.02em] text-b-ink">Questions people ask</h2></In>
      <m.ul className="mt-10" variants={cascade} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        {FAQ.map(([q, a], i) => (
          <m.li key={q} variants={fade} className="border-b border-b-line">
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] text-b-ink">
              {q}<span className="font-[family-name:var(--font-b-mono)] text-[18px] text-b-muted">{open === i ? "−" : "+"}</span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <m.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden pb-5 text-[15px] leading-relaxed text-b-muted">
                  {a}
                </m.p>
              )}
            </AnimatePresence>
          </m.li>
        ))}
      </m.ul>
    </section>
  );
}

function Close() {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-16">
      <In className="b-glass flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center md:p-12">
        <h2 className="font-[family-name:var(--font-b-serif)] text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-b-ink">Start with the skills you have.</h2>
        <Button>Map my skills</Button>
      </In>
      <footer className="mt-16 flex flex-col justify-between gap-3 border-t border-b-line pt-8 text-[13px] text-b-muted sm:flex-row">
        <Logo variant="mark" wordmark size={20} wordmarkClassName="text-[14px] text-b-ink" />
        <p>Built on a curated graph of {data.stats.skills} skills and {data.stats.roles} roles.</p>
      </footer>
    </section>
  );
}

export default function App() {
  return (
    <>
      <div className="b-light" aria-hidden />
      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <PlanBento />
          <Evidence />
          <Questions />
          <Close />
        </main>
      </div>
    </>
  );
}
