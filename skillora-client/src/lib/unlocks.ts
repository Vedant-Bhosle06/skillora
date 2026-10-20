import { landingGraph as g } from "@/content/landingGraph";

// The unlock rule behind the "pick what you know" board. It mirrors the A* search in the path
// service: a skill opens when every mandatory prerequisite is known and, for each either-or group,
// at least one member is known. It runs on the homepage snapshot (src/content/landing-graph.json).

const nameOf = new Map(g.nodes.map(n => [n.slug, n.name]));

const prereq = new Map<number, { mandatory: number[]; groups: Map<string, number[]> }>();
for (const [a, b, isPrereq, group] of g.edges) {
  if (!isPrereq) continue;
  const entry = prereq.get(b) ?? { mandatory: [] as number[], groups: new Map<string, number[]>() };
  if (group) entry.groups.set(group, [...(entry.groups.get(group) ?? []), a]);
  else entry.mandatory.push(a);
  prereq.set(b, entry);
}

export interface Unlock { slug: string; name: string; via: string[] }

/** Skills a set of known skills unlocks right now, each with the known skills that open it. */
export function unlocks(known: Set<string>): Unlock[] {
  const has = (i: number) => known.has(g.nodes[i].slug);
  const out: Unlock[] = [];
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

/** Common starting points offered in the "pick what you know" picker. */
export const STARTERS = ["python", "sql", "excel", "statistics", "html", "css", "javascript", "java", "git", "linux", "networking-basics"]
  .filter(slug => nameOf.has(slug))
  .map(slug => ({ slug, name: nameOf.get(slug)! }));
