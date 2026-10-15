import { describe, expect, it } from 'vitest';
import type { CompletedSkill, PathStep, RankedPath } from '@/api/types';
import {
  completedForRole, estWeeks, orChoiceDiff, pathLabel, progressFraction, remainingSteps, selectedRankedPath, totalHours,
} from '@/lib/pathMetrics';

function step(skillId: string, order: number, estCost = 10): PathStep {
  return { skillId, order, fromRank: 0, toRank: 1, estCost, rationale: '' };
}

function ranked(rank: number, steps: PathStep[]): RankedPath {
  return {
    rank, type: rank === 1 ? 'primary' : 'alternative', totalLearningCost: totalHours(steps),
    marketDemandAvg: 0.7, compositeScore: 0.3, steps,
  };
}

function completion(skillId: string, targetRoleId: string, completedAt: string): CompletedSkill {
  return {
    _id: `c-${skillId}`, skillId: { _id: skillId, slug: skillId, name: skillId, category: 'tool' },
    proficiency: 'beginner', targetRoleId, completedAt, fromPathId: 'p1',
  };
}

const planA = ranked(1, [step('tableau', 1, 20), step('stats', 2, 30), step('python', 3, 20), step('pandas', 4, 25)]);
const planB = ranked(2, [step('excel', 1, 15), step('powerbi', 2, 20), step('stats', 3, 30), step('python', 4, 20), step('pandas', 5, 25)]);

describe('completedForRole', () => {
  it('keeps completions for the current role, oldest first', () => {
    const me = {
      targetRoleId: { _id: 'da', slug: 'data-analyst', title: 'Data Analyst' },
      completedSkills: [
        completion('stats', 'da', '2026-10-15T12:00:00.000Z'),
        completion('react', 'fe', '2026-10-14T12:00:00.000Z'),
        completion('tableau', 'da', '2026-10-14T12:00:00.000Z'),
      ],
    };
    expect(completedForRole(me).map((c) => c.skillId?._id)).toEqual(['tableau', 'stats']);
  });
  it('is empty without a target role', () => {
    expect(completedForRole({ targetRoleId: null, completedSkills: [completion('x', 'da', '2026-10-15')] })).toEqual([]);
  });
});

describe('selectedRankedPath', () => {
  const doc = { paths: [planA, planB] };
  it('finds the selected rank', () => expect(selectedRankedPath(doc, 2)).toBe(planB));
  it('falls back to the first path', () => expect(selectedRankedPath(doc, 3)).toBe(planA));
  it('returns null without a document', () => expect(selectedRankedPath(null, 1)).toBeNull());
});

describe('remainingSteps', () => {
  it('drops completed skills and sorts by order', () => {
    const shuffled = { steps: [planA.steps[2], planA.steps[0], planA.steps[3], planA.steps[1]] };
    expect(remainingSteps(shuffled, new Set(['tableau'])).map((s) => s.skillId)).toEqual(['stats', 'python', 'pandas']);
  });
  it('returns an empty list without a path', () => expect(remainingSteps(null, new Set())).toEqual([]));
});

describe('progressFraction', () => {
  it('is a quarter after one completion out of four', () => {
    const remaining = remainingSteps(planA, new Set(['tableau']));
    expect(progressFraction(1, remaining.length)).toBe(0.25);
  });
  it('is 0 before any completion', () => expect(progressFraction(0, 4)).toBe(0));
  it('is complete when nothing remains', () => expect(progressFraction(0, 0)).toBe(1));
});

describe('totalHours and estWeeks', () => {
  it('sums step costs', () => expect(totalHours(planA.steps)).toBe(95));
  it('rounds weeks up', () => {
    expect(estWeeks(95)).toBe(10);
    expect(estWeeks(100)).toBe(10);
    expect(estWeeks(30, 15)).toBe(2);
  });
  it('is 0 weeks for 0 hours', () => expect(estWeeks(0)).toBe(0));
});

describe('pathLabel', () => {
  it('labels primary and alternatives', () => {
    expect(pathLabel(1)).toBe('Primary');
    expect(pathLabel(2)).toBe('Alternative 1');
    expect(pathLabel(3)).toBe('Alternative 2');
  });
});

describe('orChoiceDiff', () => {
  it('Plan B vs Plan A adds Excel and Power BI and drops Tableau', () => {
    expect(orChoiceDiff(planB, planA)).toEqual({ added: ['excel', 'powerbi'], removed: ['tableau'] });
  });
  it('Plan A vs Plan B adds Tableau and drops Excel and Power BI', () => {
    expect(orChoiceDiff(planA, planB)).toEqual({ added: ['tableau'], removed: ['excel', 'powerbi'] });
  });
  it('is empty for the same path', () => expect(orChoiceDiff(planA, planA)).toEqual({ added: [], removed: [] }));
});
