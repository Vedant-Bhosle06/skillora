import { describe, expect, it } from 'vitest';
import { landingGraph } from '@/content/landingGraph';
import { STARTERS, unlocks } from '@/lib/unlocks';

describe('unlocks', () => {
  it('opens nothing for an empty set', () => {
    expect(unlocks(new Set())).toEqual([]);
  });

  it('matches the snapshot\'s ready-now list for the held skills', () => {
    const held = new Set(landingGraph.held.map(h => h.slug));
    expect(unlocks(held).map(u => u.slug).sort()).toEqual([...landingGraph.readyNow].sort());
  });

  it('never lists a skill that is already known, and names what opens each one', () => {
    const known = new Set(['python', 'sql']);
    const out = unlocks(known);
    expect(out.length).toBeGreaterThan(0);
    for (const u of out) {
      expect(known.has(u.slug)).toBe(false);
      expect(u.via.length).toBeGreaterThan(0);
    }
  });

  it('is sorted by name', () => {
    const names = unlocks(new Set(['python', 'sql'])).map(u => u.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('offers starters that exist in the graph', () => {
    expect(STARTERS.map(s => s.slug)).toContain('python');
    for (const s of STARTERS) expect(s.name.length).toBeGreaterThan(0);
  });
});
