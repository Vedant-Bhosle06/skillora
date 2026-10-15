import { describe, expect, it } from 'vitest';
import type { CompletedSkill, CurrentSkill, Me, Proficiency, Role, RoleRequirement } from '@/api/types';
import { RANK, heldRankMap, refId, requirementStatus, roleMatch } from '@/lib/requirements';

const ref = (id: string) => ({ _id: id, slug: id, name: id, category: 'programming' });

function current(id: string, proficiency: Proficiency): CurrentSkill {
  return { _id: `cs-${id}`, skillId: ref(id), proficiency, addedAt: '2026-10-15T00:00:00.000Z' };
}

function completed(id: string, proficiency: Proficiency): CompletedSkill {
  return {
    _id: `cp-${id}`, skillId: ref(id), proficiency, targetRoleId: 'role1',
    completedAt: '2026-10-15T00:00:00.000Z', fromPathId: 'path1',
  };
}

function me(currentSkills: CurrentSkill[], completedSkills: CompletedSkill[] = []): Pick<Me, 'currentSkills' | 'completedSkills'> {
  return { currentSkills, completedSkills };
}

function req(anyOf: string[], minProficiency: Proficiency, label = ''): RoleRequirement {
  return { anyOf, minProficiency, label };
}

describe('RANK', () => {
  it('orders proficiencies', () => {
    expect(RANK.beginner).toBe(1);
    expect(RANK.intermediate).toBe(2);
    expect(RANK.advanced).toBe(3);
  });
});

describe('refId', () => {
  it('reads populated refs and plain id strings', () => {
    expect(refId({ _id: 'abc' })).toBe('abc');
    expect(refId('abc')).toBe('abc');
  });
  it('returns null for missing refs', () => {
    expect(refId(null)).toBeNull();
    expect(refId(undefined)).toBeNull();
    expect(refId('')).toBeNull();
  });
});

describe('heldRankMap', () => {
  it('takes the max rank across current and completed skills', () => {
    const held = heldRankMap(me([current('py', 'beginner')], [completed('py', 'advanced'), completed('sql', 'intermediate')]));
    expect(held.get('py')).toBe(3);
    expect(held.get('sql')).toBe(2);
  });
  it('keeps the higher rank when the current one is above the completed one', () => {
    const held = heldRankMap(me([current('py', 'advanced')], [completed('py', 'beginner')]));
    expect(held.get('py')).toBe(3);
  });
  it('accepts plain string ids and skips null refs', () => {
    const plain = { ...current('x', 'intermediate'), skillId: 'x' as unknown as CurrentSkill['skillId'] };
    const deleted = { ...current('gone', 'advanced'), skillId: null };
    const held = heldRankMap(me([plain, deleted]));
    expect(held.get('x')).toBe(2);
    expect(held.size).toBe(1);
  });
  it('returns an empty map for no user', () => {
    expect(heldRankMap(null).size).toBe(0);
  });
});

describe('requirementStatus', () => {
  it('meets a single requirement at the minimum', () => {
    const held = new Map([['sql', 2]]);
    expect(requirementStatus(req(['sql'], 'intermediate'), held)).toEqual({ met: true, bestOptionId: 'sql', bestRank: 2 });
  });
  it('does not meet a requirement when the held rank is below the minimum', () => {
    const held = new Map([['py', 1]]);
    expect(requirementStatus(req(['py'], 'intermediate'), held)).toEqual({ met: false, bestOptionId: 'py', bestRank: 1 });
  });
  it('reports nothing held', () => {
    expect(requirementStatus(req(['stats'], 'beginner'), new Map())).toEqual({ met: false, bestOptionId: null, bestRank: 0 });
  });
  it('meets an OR-group through any option and names it', () => {
    const held = new Map([['tableau', 1]]);
    const status = requirementStatus(req(['powerbi', 'tableau'], 'beginner', 'BI tool'), held);
    expect(status).toEqual({ met: true, bestOptionId: 'tableau', bestRank: 1 });
  });
  it('picks the best option of an OR-group', () => {
    const held = new Map([['powerbi', 1], ['tableau', 3]]);
    expect(requirementStatus(req(['powerbi', 'tableau'], 'advanced'), held).bestOptionId).toBe('tableau');
  });
});

describe('roleMatch', () => {
  // The worked example: Data Analyst with Python:beginner + SQL:intermediate.
  const dataAnalyst: Pick<Role, 'requiredSkills'> = {
    requiredSkills: [
      req(['py'], 'intermediate'),
      req(['sql'], 'intermediate'),
      req(['stats'], 'beginner'),
      req(['pandas'], 'beginner'),
      req(['powerbi', 'tableau'], 'beginner', 'BI tool'),
    ],
  };

  it('counts met requirements for the worked example', () => {
    const held = heldRankMap(me([current('py', 'beginner'), current('sql', 'intermediate')]));
    expect(roleMatch(dataAnalyst, held)).toEqual({ met: 1, total: 5 });
  });
  it('counts an OR-group once', () => {
    const held = heldRankMap(me([current('powerbi', 'beginner'), current('tableau', 'advanced')]));
    expect(roleMatch(dataAnalyst, held)).toEqual({ met: 1, total: 5 });
  });
  it('handles a role with no requirements', () => {
    expect(roleMatch({ requiredSkills: [] }, new Map())).toEqual({ met: 0, total: 0 });
  });
});
