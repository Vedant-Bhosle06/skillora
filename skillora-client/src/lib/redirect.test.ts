import { describe, expect, it } from 'vitest';
import type { Me } from '@/api/types';
import { nextRouteFor, safeRedirect } from '@/lib/redirect';

function makeUser(overrides: Partial<Me> = {}): Me {
  return {
    _id: 'u1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'learner',
    currentSkills: [],
    completedSkills: [],
    targetRoleId: null,
    activePathId: null,
    selectedPathRank: 1,
    ...overrides,
  };
}

const withSkill = {
  currentSkills: [
    { _id: 'cs1', skillId: { _id: 's1', slug: 'python', name: 'Python', category: 'programming' }, proficiency: 'beginner' as const, addedAt: '2026-10-15T00:00:00.000Z' },
  ],
};
const withRole = { targetRoleId: { _id: 'r1', slug: 'data-analyst', title: 'Data Analyst' } };

describe('safeRedirect', () => {
  it('rejects protocol-relative URLs', () => {
    expect(safeRedirect('//evil.com', '/x')).toBe('/x');
  });

  it('rejects absolute URLs', () => {
    expect(safeRedirect('https://evil.com', '/x')).toBe('/x');
  });

  it('rejects paths outside the allowed sections', () => {
    expect(safeRedirect('/login', '/x')).toBe('/x');
    expect(safeRedirect('/', '/x')).toBe('/x');
  });

  it('rejects non-strings', () => {
    expect(safeRedirect(undefined, '/x')).toBe('/x');
    expect(safeRedirect(null, '/x')).toBe('/x');
    expect(safeRedirect({ pathname: '/settings' }, '/x')).toBe('/x');
  });

  it('rejects backslashes and embedded double slashes', () => {
    expect(safeRedirect('/dashboard\\evil.com', '/x')).toBe('/x');
    expect(safeRedirect('/settings//evil.com', '/x')).toBe('/x');
  });

  it('rejects look-alike prefixes', () => {
    expect(safeRedirect('/dashboardevil', '/x')).toBe('/x');
  });

  it('accepts valid in-app paths', () => {
    expect(safeRedirect('/settings', '/x')).toBe('/settings');
    expect(safeRedirect('/dashboard/alternatives', '/x')).toBe('/dashboard/alternatives');
    expect(safeRedirect('/onboarding/role', '/x')).toBe('/onboarding/role');
  });
});

describe('nextRouteFor', () => {
  it('sends a new user without skills to skill onboarding', () => {
    expect(nextRouteFor(makeUser())).toBe('/onboarding/skills');
  });

  it('sends a user with skills but no role to role onboarding', () => {
    expect(nextRouteFor(makeUser(withSkill))).toBe('/onboarding/role');
  });

  it('keeps a safe non-dashboard target for a user without a role', () => {
    expect(nextRouteFor(makeUser(), '/settings')).toBe('/settings');
  });

  it('does not send a user without a role to dashboard or progress', () => {
    expect(nextRouteFor(makeUser(), '/dashboard')).toBe('/onboarding/skills');
    expect(nextRouteFor(makeUser(withSkill), '/progress')).toBe('/onboarding/role');
  });

  it('sends a user with a role to the dashboard by default', () => {
    expect(nextRouteFor(makeUser({ ...withSkill, ...withRole }))).toBe('/dashboard');
  });

  it('returns a user with a role to a safe from path', () => {
    expect(nextRouteFor(makeUser(withRole), '/settings')).toBe('/settings');
    expect(nextRouteFor(makeUser(withRole), '/progress')).toBe('/progress');
  });

  it('ignores an unsafe from path', () => {
    expect(nextRouteFor(makeUser(withRole), '//evil.com')).toBe('/dashboard');
    expect(nextRouteFor(makeUser(withRole), 'https://evil.com')).toBe('/dashboard');
    expect(nextRouteFor(makeUser(withRole), '/login')).toBe('/dashboard');
  });
});
