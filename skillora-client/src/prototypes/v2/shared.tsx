import React, { ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { landingGraph, formatHours } from "@/content/landingGraph";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import MotionProvider from "@/components/MotionProvider";
import protoData from "../data.json";

// Shared by the three v2 landing prototypes (Transit, Terrain, Poster). All content is real:
// the homepage graph snapshot (src/content/landing-graph.json) and the roles snapshot.

export const g = landingGraph;
export const hours = formatHours;
export const nameOf = new Map(g.nodes.map(n => [n.slug, n.name]));
export const indexOf = new Map(g.nodes.map((n, i) => [n.slug, i]));
export const heldSlugs = g.held.map(h => h.slug);
export const routeTotal = g.totalHours;
export const altHours = g.alternativeHours ?? 0;
export const genericHours = g.facts.evaluation.workedBaselineHours;

/** The skills Python + SQL unlock now, with the held skill(s) that open each one. */
export const readyNow = g.readyNow.map(slug => {
  const i = indexOf.get(slug)!;
  const via = g.edges
    .filter(([a, b, prereq]) => prereq && b === i && heldSlugs.includes(g.nodes[a].slug))
    .map(([a]) => g.nodes[a].name);
  return { slug, name: nameOf.get(slug)!, via: [...new Set(via)] };
});

export interface RoleRow { slug: string; title: string; category: string; demandScore: number; requirements: number }
export const roles: RoleRow[] = (protoData as { roles: RoleRow[] }).roles;
/** Roles with their full requirements (either-or options and minimum level). */
export const roleDetails = g.roles;
/** Demand is an expert estimate, so it is shown in words, never as a decimal. */
export const demandWord = (d: number) => (d >= 0.75 ? "High demand" : d >= 0.55 ? "Steady demand" : "Niche");

// Prerequisite structure per skill, for the "pick what you know" demo (same rule as the A* search:
// every mandatory prerequisite known, and at least one member of each either-or group known).
const prereq = new Map<number, { mandatory: number[]; groups: Map<string, number[]> }>();
for (const [a, b, isPrereq, group] of g.edges) {
  if (!isPrereq) continue;
  const entry = prereq.get(b) ?? { mandatory: [] as number[], groups: new Map<string, number[]>() };
  if (group) entry.groups.set(group, [...(entry.groups.get(group) ?? []), a]);
  else entry.mandatory.push(a);
  prereq.set(b, entry);
}

/** Skills a set of known skills unlocks right now, each with the known skills that open it. */
export function unlocks(known: Set<string>): { slug: string; name: string; via: string[] }[] {
  const has = (i: number) => known.has(g.nodes[i].slug);
  const out: { slug: string; name: string; via: string[] }[] = [];
  g.nodes.forEach((n, i) => {
    const p = prereq.get(i);
    if (known.has(n.slug) || !p) return;
    if (!p.mandatory.every(has)) return;
    if (![...p.groups.values()].every(members => members.some(has))) return;
    const via = [...p.mandatory, ...[...p.groups.values()].flat()].filter(has).map(j => g.nodes[j].name);
    out.push({ slug: n.slug, name: n.name, via: [...new Set(via)] });
  });
  return out.sort((x, y) => x.name.localeCompare(y.name));
}

/** Common starting points offered in the "pick what you know" demo. */
export const STARTERS = ["python", "sql", "excel", "statistics", "html", "css", "javascript", "java", "git", "linux", "networking-basics"]
  .map(slug => ({ slug, name: nameOf.get(slug)! }));

export const RANK = ["", "beginner", "intermediate", "advanced"] as const;

/** Theme switch used by all three prototypes (same storage and class as the app). */
export function ThemeSwitch({ className = "" }: { className?: string }) {
  const { darkMode, toggleDark } = useTheme();
  return (
    <button onClick={toggleDark} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} className={className}>
      {darkMode ? (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.4" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
      )}
    </button>
  );
}

/** Mounts a prototype page with the app's theme and motion providers. */
export function mount(page: ReactNode) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ThemeProvider>
        <MotionProvider>{page}</MotionProvider>
      </ThemeProvider>
    </React.StrictMode>,
  );
}
