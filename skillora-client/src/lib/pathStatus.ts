// Lock status for the remaining steps of a path, from the prerequisite edges
// of the skill graph and the skills the user already holds.
import type { GraphEdge, PathStep } from '@/api/types';

export type StepStatus = 'in-progress' | 'unlocked' | 'locked';

export type StepView = PathStep & { status: StepStatus; blockedBy: string[] };

export function computeStepStatuses(
  steps: ReadonlyArray<PathStep>,
  edges: ReadonlyArray<Pick<GraphEdge, 'source' | 'target' | 'type' | 'group'>> | undefined,
  held: ReadonlyMap<string, number>,
): StepView[] {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const inPath = new Set(sorted.map((s) => s.skillId));
  const known = (id: string) => (held.get(id) ?? 0) >= 1;

  const views: StepView[] = sorted.map((step) => {
    // Upgrades build on a skill the user already has; without edges nothing can be checked.
    if (step.fromRank > 0 || !edges) return { ...step, status: 'unlocked', blockedBy: [] };

    const blockedBy: string[] = [];
    const groups = new Map<string, string[]>();
    for (const e of edges) {
      if (e.type !== 'prerequisite_of' || e.target !== step.skillId) continue;
      if (e.group == null) {
        if (!known(e.source) && inPath.has(e.source)) blockedBy.push(e.source);
      } else {
        groups.set(e.group, [...(groups.get(e.group) ?? []), e.source]);
      }
    }
    for (const sources of groups.values()) {
      if (sources.some(known)) continue;
      const pending = sources.filter((id) => inPath.has(id));
      blockedBy.push(...pending);
    }

    return { ...step, status: blockedBy.length > 0 ? 'locked' : 'unlocked', blockedBy };
  });

  const next = views.find((v) => v.status === 'unlocked');
  if (next) next.status = 'in-progress';
  return views;
}

/**
 * Prerequisites of a skill as AND-of-OR lists: each inner list is one requirement,
 * with a single id for a mandatory prerequisite or several ids for an OR-group.
 */
export function prerequisiteGroups(
  skillId: string,
  edges: ReadonlyArray<Pick<GraphEdge, 'source' | 'target' | 'type' | 'group'>> | undefined,
): string[][] {
  if (!edges) return [];
  const mandatory: string[][] = [];
  const groups = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type !== 'prerequisite_of' || e.target !== skillId) continue;
    if (e.group == null) mandatory.push([e.source]);
    else groups.set(e.group, [...(groups.get(e.group) ?? []), e.source]);
  }
  return [...mandatory, ...groups.values()];
}

/** Colour class of a skill in the graph explorer. */
export type GraphNodeStatus = 'known' | StepStatus | 'outside';

/** Held skills win; otherwise a step of the selected path keeps its step status; anything else is outside the path. */
export function graphNodeStatus(
  skillId: string,
  held: ReadonlyMap<string, number>,
  stepById: ReadonlyMap<string, Pick<StepView, 'status'>>,
): GraphNodeStatus {
  if ((held.get(skillId) ?? 0) >= 1) return 'known';
  return stepById.get(skillId)?.status ?? 'outside';
}
