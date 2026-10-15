import { describe, expect, it } from 'vitest';
import { computeLayout, fitToView } from '@/lib/graphLayout';

const nodes = ['python', 'pandas', 'sql', 'excel', 'powerbi', 'tableau', 'stats'].map((id) => ({ id }));
const edges = [
  { source: 'python', target: 'pandas' },
  { source: 'excel', target: 'powerbi' },
  { source: 'stats', target: 'pandas' },
  { source: 'ghost', target: 'sql' }, // endpoint missing from the node list
];

describe('computeLayout', () => {
  it('gives every node finite coordinates', () => {
    const pos = computeLayout(nodes, edges);
    expect(pos.size).toBe(nodes.length);
    for (const { x, y } of pos.values()) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it('is deterministic for the same input', () => {
    const a = computeLayout(nodes, edges);
    const b = computeLayout(nodes, edges);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it('does not mutate its inputs', () => {
    const copy = JSON.parse(JSON.stringify(edges));
    computeLayout(nodes, edges);
    expect(edges).toEqual(copy);
  });

  it('handles an empty graph', () => {
    expect(computeLayout([], []).size).toBe(0);
  });
});

describe('fitToView', () => {
  it('centres the bounding box', () => {
    const pos = new Map([['a', { x: 0, y: 0 }], ['b', { x: 200, y: 100 }]]);
    const { zoom, pan } = fitToView(pos, 800, 600);
    expect(pan.x + 100 * zoom).toBeCloseTo(400);
    expect(pan.y + 50 * zoom).toBeCloseTo(300);
  });

  it('clamps zoom between 0.3 and 1.5', () => {
    const tiny = new Map([['a', { x: 0, y: 0 }], ['b', { x: 1, y: 1 }]]);
    expect(fitToView(tiny, 800, 600).zoom).toBe(1.5);
    const huge = new Map([['a', { x: 0, y: 0 }], ['b', { x: 100000, y: 100000 }]]);
    expect(fitToView(huge, 800, 600).zoom).toBe(0.3);
  });

  it('returns identity for no nodes', () => {
    expect(fitToView(new Map(), 800, 600)).toEqual({ zoom: 1, pan: { x: 0, y: 0 } });
  });
});
