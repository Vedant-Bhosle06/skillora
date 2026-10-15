// Pure helpers over a computed path document. Path steps hold only skill ids;
// names come from the skills catalog.
import type { CompletedSkill, ComputedPathDoc, Me, PathStep, RankedPath } from '@/api/types';

/** Completions recorded for the user's current target role, oldest first. */
export function completedForRole(me: Pick<Me, 'completedSkills' | 'targetRoleId'>): CompletedSkill[] {
  const roleId = me.targetRoleId?._id;
  if (!roleId) return [];
  return me.completedSkills
    .filter((c) => c.targetRoleId === roleId)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

/** The ranked path the user selected, falling back to the primary one. */
export function selectedRankedPath(doc: Pick<ComputedPathDoc, 'paths'> | null | undefined, rank: number): RankedPath | null {
  return doc?.paths.find((p) => p.rank === rank) ?? doc?.paths[0] ?? null;
}

/** Steps whose skill is not completed yet, by order. A stale path can still list a completed step. */
export function remainingSteps(path: Pick<RankedPath, 'steps'> | null | undefined, completedIds: ReadonlySet<string>): PathStep[] {
  if (!path) return [];
  return path.steps.filter((s) => !completedIds.has(s.skillId)).sort((a, b) => a.order - b.order);
}

/** Share of the route done (0..1); a route with nothing left is complete. */
export function progressFraction(done: number, remaining: number): number {
  return remaining === 0 ? 1 : done / (done + remaining);
}

export function totalHours(steps: ReadonlyArray<Pick<PathStep, 'estCost'>>): number {
  return steps.reduce((sum, s) => sum + s.estCost, 0);
}

/** Whole weeks needed at `perWeek` hours per week. */
export function estWeeks(hours: number, perWeek = 10): number {
  return hours <= 0 ? 0 : Math.ceil(hours / perWeek);
}

/** Rank 1 is the primary route; rank 2 is "Alternative 1", and so on. */
export function pathLabel(rank: number): string {
  return rank <= 1 ? 'Primary' : `Alternative ${rank - 1}`;
}

/** Skills a path adds and drops compared with a reference path (OR-choices). */
export function orChoiceDiff(
  path: Pick<RankedPath, 'steps'>,
  reference: Pick<RankedPath, 'steps'>,
): { added: string[]; removed: string[] } {
  const mine = new Set(path.steps.map((s) => s.skillId));
  const theirs = new Set(reference.steps.map((s) => s.skillId));
  return {
    added: [...mine].filter((id) => !theirs.has(id)),
    removed: [...theirs].filter((id) => !mine.has(id)),
  };
}
