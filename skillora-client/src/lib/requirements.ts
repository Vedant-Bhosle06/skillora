// Has/needs matching between a user's skills and a role's requirements.
// A requirement is met when the user holds any one of its `anyOf` options at
// or above its minimum proficiency.
import type { Me, Proficiency, Role, RoleRequirement } from '@/api/types';

export const RANK: Record<Proficiency, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Id of a populated ref or a plain id string; null for a missing ref. */
export function refId(v: string | { _id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v._id ?? null;
}

/** skillId -> highest rank held across current and completed skills. */
export function heldRankMap(me: Pick<Me, 'currentSkills' | 'completedSkills'> | null | undefined): Map<string, number> {
  const held = new Map<string, number>();
  if (!me) return held;
  for (const s of [...me.currentSkills, ...me.completedSkills]) {
    const id = refId(s.skillId);
    if (!id) continue;
    const rank = RANK[s.proficiency] ?? 0;
    if (rank > (held.get(id) ?? 0)) held.set(id, rank);
  }
  return held;
}

export interface RequirementStatus {
  met: boolean;
  /** The option the user ranks highest in (the one that meets it, when met); null if none held. */
  bestOptionId: string | null;
  /** The user's rank in that option (0 when none held). */
  bestRank: number;
}

export function requirementStatus(
  req: Pick<RoleRequirement, 'anyOf' | 'minProficiency'>,
  held: Map<string, number>,
): RequirementStatus {
  const min = RANK[req.minProficiency] ?? 1;
  let bestOptionId: string | null = null;
  let bestRank = 0;
  for (const raw of req.anyOf) {
    const id = refId(raw);
    if (!id) continue;
    const rank = held.get(id) ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      bestOptionId = id;
    }
  }
  return { met: bestRank >= min, bestOptionId, bestRank };
}

export function roleMatch(role: Pick<Role, 'requiredSkills'>, held: Map<string, number>): { met: number; total: number } {
  const total = role.requiredSkills.length;
  const met = role.requiredSkills.filter((req) => requirementStatus(req, held).met).length;
  return { met, total };
}
