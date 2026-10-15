import { describe, expect, it } from 'vitest';
import type { GraphEdge, PathStep } from '@/api/types';
import { computeStepStatuses, prerequisiteGroups } from '@/lib/pathStatus';

function step(skillId: string, order: number, fromRank = 0, toRank = 1): PathStep {
  return { skillId, order, fromRank, toRank, estCost: 10, rationale: '' };
}

function prereq(source: string, target: string, group: string | null = null): GraphEdge {
  return { source, target, type: 'prerequisite_of', group };
}

// The worked example: Python:beginner + SQL:intermediate targeting Data Analyst.
const edges: GraphEdge[] = [
  prereq('python', 'pandas'),
  prereq('excel', 'powerbi'),
  prereq('sql', 'warehouse'),
  { source: 'stats', target: 'pandas', type: 'corequisite_with', group: null },
];
const held = new Map([['python', 1], ['sql', 2]]);

describe('computeStepStatuses', () => {
  it('Plan A: every step is unlocked and the first is up next', () => {
    const planA = [step('tableau', 1), step('stats', 2), step('python', 3, 1, 2), step('pandas', 4)];
    const views = computeStepStatuses(planA, edges, held);
    expect(views.map((v) => v.status)).toEqual(['in-progress', 'unlocked', 'unlocked', 'unlocked']);
    expect(views.every((v) => v.blockedBy.length === 0)).toBe(true);
  });

  it('Plan B: Power BI is locked by Excel until Excel is completed', () => {
    const planB = [step('excel', 1), step('powerbi', 2), step('stats', 3)];
    const before = computeStepStatuses(planB, edges, held);
    expect(before.find((v) => v.skillId === 'powerbi')).toMatchObject({ status: 'locked', blockedBy: ['excel'] });
    expect(before[0].status).toBe('in-progress');

    // Excel completed: it leaves the remaining steps and counts as held.
    const after = computeStepStatuses(planB.slice(1), edges, new Map([...held, ['excel', 1]]));
    expect(after.map((v) => v.status)).toEqual(['in-progress', 'unlocked']);
  });

  it('a grouped prerequisite is satisfied by any one source', () => {
    const groupEdges = [prereq('tableau', 'dashboards', 'bi'), prereq('powerbi', 'dashboards', 'bi')];
    const steps = [step('powerbi', 1), step('dashboards', 2)];

    const locked = computeStepStatuses(steps, groupEdges, new Map());
    expect(locked[1]).toMatchObject({ status: 'locked', blockedBy: ['powerbi'] });

    const unlocked = computeStepStatuses(steps, groupEdges, new Map([['tableau', 1]]));
    expect(unlocked[1]).toMatchObject({ status: 'unlocked', blockedBy: [] });
  });

  it('ignores a prerequisite that is neither held nor in the path', () => {
    const views = computeStepStatuses([step('powerbi', 1)], edges, new Map());
    expect(views[0].status).toBe('in-progress');
  });

  it('an upgrade step is always unlocked', () => {
    const views = computeStepStatuses([step('excel', 1), step('powerbi', 2, 1, 2)], edges, new Map([['powerbi', 1]]));
    expect(views[1].status).toBe('unlocked');
  });

  it('unlocks everything when edges are not loaded', () => {
    const views = computeStepStatuses([step('excel', 1), step('powerbi', 2)], undefined, new Map());
    expect(views.map((v) => v.status)).toEqual(['in-progress', 'unlocked']);
  });

  it('sorts by order', () => {
    const views = computeStepStatuses([step('b', 2), step('a', 1)], [], new Map());
    expect(views.map((v) => v.skillId)).toEqual(['a', 'b']);
  });
});

describe('prerequisiteGroups', () => {
  it('lists mandatory prerequisites first, then one entry per OR-group', () => {
    const graph: GraphEdge[] = [
      prereq('bi-a', 'dashboarding', 'bi'),
      prereq('stats', 'dashboarding'),
      prereq('bi-b', 'dashboarding', 'bi'),
      { source: 'sql', target: 'dashboarding', type: 'corequisite_with', group: null },
      prereq('python', 'pandas'),
    ];
    expect(prerequisiteGroups('dashboarding', graph)).toEqual([['stats'], ['bi-a', 'bi-b']]);
  });

  it('returns nothing without edges or prerequisites', () => {
    expect(prerequisiteGroups('pandas', undefined)).toEqual([]);
    expect(prerequisiteGroups('python', edges)).toEqual([]);
  });
});
