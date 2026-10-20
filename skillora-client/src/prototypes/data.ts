// Real data for the landing-page prototypes, generated from data/v1 and the path service's A*
// engine (see the generator note in prototypes/README.md). Nothing here is invented.
import raw from "./data.json";

export interface Step {
  slug: string;
  name: string;
  category: string;
  fromRank: number;
  toRank: number;
  estCost: number;
  rationale: string;
}

export interface Path {
  rank: number;
  type: "primary" | "alternative";
  totalLearningCost: number;
  marketDemandAvg: number;
  compositeScore: number;
  steps: Step[];
}

export interface Scenario {
  id: string;
  role: { slug: string; title: string };
  held: { slug: string; name: string; rank: number }[];
  astar: { statesToPrimary: number; statesExpanded: number };
  dijkstra: { statesToPrimary: number; statesExpanded: number };
  paths: Path[];
}

export interface GraphNode {
  slug: string;
  name: string;
  category: string;
  x: number;
  y: number;
  held: boolean;
  inPrimary: boolean;
}

export interface ProtoData {
  stats: { skills: number; roles: number; prerequisiteEdges: number; orGroups: number };
  roles: { slug: string; title: string; category: string; demandScore: number; requirements: number }[];
  scenarios: Scenario[];
  graph: { nodes: GraphNode[]; edges: { s: string; t: string }[] };
  analystRequirements: { label: string; minProficiency: string; options: { slug: string; name: string; estHours: number }[] }[];
  evaluation: {
    meanTimeSavedPct: number;
    scenarios: { name: string; timeSavedPct: number; systemHours: number; baselineHours: number; systemOrderViolations: number; baselineOrderViolations: number }[];
  };
}

export const data = raw as ProtoData;
export const RANK_LABEL = ["", "Beginner", "Intermediate", "Advanced"] as const;

export function scenario(id: string): Scenario {
  const s = data.scenarios.find(x => x.id === id);
  if (!s) throw new Error(`Unknown scenario ${id}`);
  return s;
}

/** Hours formatted the way the app shows them (60 h, 218.5 h). */
export const hours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
