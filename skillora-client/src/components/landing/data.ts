import { LOGO_PATH } from "@/components/Logo";
import { landingGraph as g, formatHours } from "@/content/landingGraph";

// Derived facts and geometry shared by the landing sections. Everything comes from the real
// snapshot in src/content/landing-graph.json (regenerate with scripts/build-landing-graph.py).

export { g };
export const hours = formatHours;
export const routeTotal = g.totalHours;
export const altHours = g.alternativeHours ?? 0;
export const genericHours = g.facts.evaluation.workedBaselineHours;

/** Line colour per skill category (a colour code for what kind of skill a station is). */
export const LINE: Record<string, string> = {
  programming: "var(--line-data)", framework: "var(--line-web)", tool: "var(--line-design)", database: "var(--line-alt)",
  cloud: "var(--line-cloud)", math: "var(--line-web)", domain: "var(--line-alt)", concept: "var(--line-grey)", "soft-skill": "var(--line-grey)",
};
export const lineFor = (category: string | undefined) => (category && LINE[category]) || "var(--line-grey)";

const nodeBySlug = new Map(g.nodes.map(n => [n.slug, n]));
export const categoryOf = (slug: string) => nodeBySlug.get(slug)?.category;

const RANK_WORD = ["", "beginner", "intermediate", "advanced"];
/** "Python, at beginner level, and SQL, at intermediate." */
export const heldSentence = g.held
  .map((h, i) => `${nodeBySlug.get(h.slug)?.name ?? h.slug}, at ${RANK_WORD[h.rank]}${i === 0 ? " level" : ""}`)
  .join(", and ");
export const heldNames = g.held.map(h => nodeBySlug.get(h.slug)?.name ?? h.slug).join(", ");

// Your line, on the logo's 32-grid: "You are here", the four route stops (the mark's nodes), terminus.
export const VB_W = 1600;
export const VB_H = 1000;
export const LINE_PATH = `M2,26.5 L8,26.5 ${LOGO_PATH.replace(/^M[\d.,]+\s*/, "")} L30,6`;
export const ALT_PATH = "M2,26.5 Q4,31 9,31 L16,31 Q21.5,31 22.5,23";

export interface Stop { x: number; y: number; name: string; cost: number; kind: "origin" | "stop" | "terminus" }
const ROUTE_X = [8, 22.5, 9.5, 24];
const ROUTE_Y = [26.5, 23, 10, 6];
export const STOPS: Stop[] = [
  { x: 2, y: 26.5, name: `You are here · ${heldNames}`, cost: 0, kind: "origin" },
  ...g.route.map((s, i) => ({ x: ROUTE_X[i], y: ROUTE_Y[i], name: `${s.name}${s.fromRank ? " · level up" : ""}`, cost: s.estCost, kind: "stop" as const })),
  { x: 30, y: 6, name: g.role.title, cost: 0, kind: "terminus" },
];
export const ALT_STOPS = [{ x: 9, y: 31, name: "Excel" }, { x: 16, y: 31, name: "Power BI" }];

/** Shared classes for the landing's pill links. */
export const PILL = "inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[15px] font-800 transition-[scale,background-color,opacity] duration-200 active:scale-[0.98] motion-reduce:active:scale-100";
export const PILL_PRIMARY = `${PILL} bg-primary text-primary-foreground hover:opacity-90`;
export const PILL_OUTLINE = `${PILL} border-2 border-foreground text-foreground hover:bg-foreground hover:text-background`;
export const H2 = "text-[clamp(2.2rem,5vw,4rem)] font-[850] leading-[1.02] tracking-[-0.02em]";
