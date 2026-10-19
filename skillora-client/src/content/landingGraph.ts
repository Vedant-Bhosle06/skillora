// Snapshot of the real skill graph for the public homepage (the live /api/graph needs a session).
// Regenerate with: skillora-path-service/.venv/bin/python scripts/build-landing-graph.py
import raw from "./landing-graph.json";

export interface LandingNode {
  slug: string;
  name: string;
  category: string;
  /** 3D position from a seeded force layout, centred on Python. */
  p: [number, number, number];
  degree: number;
}

export interface RouteStep {
  slug: string;
  name: string;
  estCost: number;
  fromRank: number;
  toRank: number;
  rationale: string;
}

export interface LandingGraph {
  nodes: LandingNode[];
  /** [sourceIndex, targetIndex, 1 = prerequisite / 0 = corequisite, either-or group or ""] */
  edges: [number, number, number, string][];
  held: { slug: string; rank: number }[];
  role: { slug: string; title: string };
  route: RouteStep[];
  totalHours: number;
  alternativeHours: number | null;
  statesToPrimary: number;
  roles: { slug: string; title: string; category: string; demandScore: number;
    requirements: { label: string; level: string; options: string[] }[] }[];
  /** Slugs the held skills unlock right now (same unlock rule as the search). */
  readyNow: string[];
  facts: {
    /** The generic roadmap from the D6 worked example, each step costed from zero. */
    baseline: { name: string; hours: number }[];
    routes: { hours: number; score: number; demand: number; via: string[] }[];
    search: { role: string; astar: number; dijkstra: number };
    evaluation: { workedSavedPct: number; workedBaselineHours: number; meanSavedPct: number; worstShuffledViolations: number; profiles: number };
  };
}

export const landingGraph = raw as unknown as LandingGraph;

export const formatHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;
