// Node positions for the graph explorer. d3-force only computes coordinates;
// the page draws the SVG itself. The simulation is run synchronously, so the
// same data always gives the same layout.
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';

export type Point = { x: number; y: number };

interface LayoutOptions {
  width?: number;
  height?: number;
  ticks?: number;
}

type SimNode = SimulationNodeDatum & { id: string };

export function computeLayout(
  nodes: ReadonlyArray<{ id: string }>,
  edges: ReadonlyArray<{ source: string; target: string }>,
  { width = 1000, height = 800, ticks = 300 }: LayoutOptions = {},
): Map<string, Point> {
  // d3 mutates its inputs, so it only ever sees copies.
  const simNodes: SimNode[] = nodes.map((n) => ({ id: n.id }));
  const ids = new Set(simNodes.map((n) => n.id));
  const links: SimulationLinkDatum<SimNode>[] = edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({ source: e.source, target: e.target }));

  const sim = forceSimulation<SimNode>(simNodes)
    .force('link', forceLink<SimNode, SimulationLinkDatum<SimNode>>(links).id((d) => d.id).distance(80).strength(0.4))
    .force('charge', forceManyBody().strength(-260))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide(34))
    .force('x', forceX(width / 2).strength(0.04))
    .force('y', forceY(height / 2).strength(0.04))
    .stop();

  for (let i = 0; i < ticks; i++) sim.tick();

  return new Map(simNodes.map((n) => [n.id, { x: n.x ?? width / 2, y: n.y ?? height / 2 }]));
}

/** Zoom (0.3–1.5) and pan that centre the positions' bounding box in a viewW × viewH view. */
export function fitToView(
  positions: ReadonlyMap<string, Point>,
  viewW: number,
  viewH: number,
  pad = 60,
): { zoom: number; pan: Point } {
  if (positions.size === 0) return { zoom: 1, pan: { x: 0, y: 0 } };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const { x, y } of positions.values()) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const boxW = Math.max(maxX - minX, 1);
  const boxH = Math.max(maxY - minY, 1);
  const fit = Math.min((viewW - 2 * pad) / boxW, (viewH - 2 * pad) / boxH);
  const zoom = Math.min(1.5, Math.max(0.3, fit));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { zoom, pan: { x: viewW / 2 - cx * zoom, y: viewH / 2 - cy * zoom } };
}
