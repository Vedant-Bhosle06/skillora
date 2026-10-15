import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { PageLoader, ErrorState, EmptyState } from "@/components/ui";
import { useGraph, type GraphScope } from "@/api/queries";
import { toApiError } from "@/api/client";
import { categoryColor, categoryLabel, formatHours } from "@/lib/format";
import { computeLayout, fitToView, type Point } from "@/lib/graphLayout";
import type { GraphEdge, GraphNode } from "@/api/types";

type Node = GraphNode & { id: string };
type View = { zoom: number; pan: Point };
type Tooltip = { node: Node; x: number; y: number } | null;
type EdgeTooltip = { edge: GraphEdge; x: number; y: number } | null;

// Gap left at the target end so the arrow head is not hidden under the node.
const ARROW_GAP = 24;
const GROUP_COLOR = "#f59e0b";

function edgeTypeLabel(edge: GraphEdge): string {
  if (edge.type === "corequisite_with") return "Co-requisite (informational, not used in path search)";
  if (edge.group) return `Prerequisite — OR-group '${edge.group}': any one is enough`;
  return "Prerequisite (mandatory)";
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export default function GraphExplorer() {
  const [scope, setScope] = useState<GraphScope>("full");
  const graph = useGraph(scope);

  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<EdgeTooltip>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [view, setView] = useState<View>({ zoom: 0.85, pan: { x: 0, y: 0 } });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // `/api/graph` nodes use `_id`; the layout and the SVG work with `id`.
  const nodes = useMemo<Node[]>(() => (graph.data?.nodes ?? []).map(n => ({ ...n, id: n._id })), [graph.data]);
  const edges = useMemo(() => graph.data?.edges ?? [], [graph.data]);
  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const positions = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);

  const resetView = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setView(fitToView(positions, rect.width, rect.height));
  }, [positions]);

  // Fit the whole graph on load and whenever the data (and so the layout) changes.
  useLayoutEffect(() => { resetView(); }, [resetView]);

  // React's wheel listeners are passive, so preventDefault only works on a native listener.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // The graph moves under the cursor, so any open tooltip would point at the wrong thing.
      setTooltip(null);
      setEdgeTooltip(null);
      const rect = svg.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      // Zoom towards the cursor: the graph point under it stays in place.
      setView(v => {
        const zoom = clampZoom(v.zoom * Math.exp(-e.deltaY * 0.001));
        const k = zoom / v.zoom;
        return { zoom, pan: { x: cx - (cx - v.pan.x) * k, y: cy - (cy - v.pan.y) * k } };
      });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [graph.data]);

  const zoomBy = (factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    const cx = (rect?.width ?? 0) / 2;
    const cy = (rect?.height ?? 0) / 2;
    setView(v => {
      const zoom = clampZoom(v.zoom * factor);
      const k = zoom / v.zoom;
      return { zoom, pan: { x: cx - (cx - v.pan.x) * k, y: cy - (cy - v.pan.y) * k } };
    });
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest("circle, text")) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setView(v => ({ ...v, pan: { x: v.pan.x + dx, y: v.pan.y + dy } }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  function getPrereqs(nodeId: string) {
    return edges
      .filter(e => e.type === "prerequisite_of" && e.target === nodeId)
      .map(e => nodeById.get(e.source)?.name)
      .filter(Boolean) as string[];
  }

  const categories = useMemo(() => [...new Set(nodes.map(n => n.category))].sort(), [nodes]);

  function renderCanvas() {
    if (graph.isPending) return <PageLoader label="Loading the skill graph…" />;
    if (graph.isError) {
      return (
        <ErrorState
          title="Couldn't load the skill graph"
          message={toApiError(graph.error).message}
          onRetry={() => graph.refetch()}
        />
      );
    }
    if (nodes.length === 0) {
      return <EmptyState icon="◎" title="No skills yet" description="The skill graph is empty." />;
    }

    return (
      <>
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full graph-canvas select-none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <g transform={`translate(${view.pan.x},${view.pan.y}) scale(${view.zoom})`}>
            <defs>
              <marker id="graph-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" />
              </marker>
              <marker id="graph-arrow-active" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" />
              </marker>
            </defs>

            {/* Edges: source → target, the prerequisite points at the skill it unlocks */}
            {edges.map((edge, i) => {
              const src = positions.get(edge.source);
              const tgt = positions.get(edge.target);
              if (!src || !tgt) return null;
              const dx = tgt.x - src.x;
              const dy = tgt.y - src.y;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
              const isCoreq = edge.type === "corequisite_with";
              const isGrouped = !isCoreq && !!edge.group;
              const isHighlighted = hoveredEdge === i || hoveredNode === edge.source || hoveredNode === edge.target;
              const stroke = isHighlighted ? "var(--primary)" : isGrouped ? GROUP_COLOR : "var(--muted-foreground)";
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y}
                  x2={isCoreq ? tgt.x : tgt.x - ux * ARROW_GAP}
                  y2={isCoreq ? tgt.y : tgt.y - uy * ARROW_GAP}
                  stroke={stroke}
                  strokeWidth={isHighlighted ? 2 : 1.2}
                  strokeOpacity={isHighlighted ? 0.9 : isGrouped ? 0.7 : 0.4}
                  strokeDasharray={isCoreq ? "1 4" : isGrouped ? "4 3" : undefined}
                  strokeLinecap={isCoreq ? "round" : undefined}
                  markerEnd={isCoreq ? undefined : `url(#${isHighlighted ? "graph-arrow-active" : "graph-arrow"})`}
                />
              );
            })}

            {/* Invisible, wider hit lines so thin edges are easy to hover */}
            {edges.map((edge, i) => {
              const src = positions.get(edge.source);
              const tgt = positions.get(edge.target);
              if (!src || !tgt) return null;
              return (
                <line
                  key={`hit-${i}`}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke="transparent"
                  strokeWidth={12 / view.zoom}
                  pointerEvents="stroke"
                  onMouseMove={(e) => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) setEdgeTooltip({ edge, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseEnter={() => setHoveredEdge(i)}
                  onMouseLeave={() => { setHoveredEdge(null); setEdgeTooltip(null); }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const isHovered = hoveredNode === node.id;
              const catColor = categoryColor(node.category);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  onMouseEnter={(e) => {
                    setHoveredNode(node.id);
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) setTooltip({ node, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseLeave={() => { setHoveredNode(null); setTooltip(null); }}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer ring for category */}
                  <circle r={isHovered ? 26 : 22} fill={catColor} opacity={0.15} />
                  <circle r={isHovered ? 20 : 16} fill={catColor} />
                  <text
                    y={isHovered ? 34 : 28}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize="11"
                    fontFamily="'DM Sans', sans-serif"
                    fontWeight="600"
                  >
                    {node.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-card border border-border rounded-xl shadow-xl p-3 min-w-44 max-w-64"
            style={{ left: tooltip.x + 16, top: tooltip.y - 20 }}
          >
            <p className="font-display font-700 text-sm text-foreground mb-1">{tooltip.node.name}</p>
            <p className="text-xs font-mono text-muted-foreground mb-2">
              {formatHours(tooltip.node.estHours)} · {categoryLabel(tooltip.node.category)}
            </p>
            {getPrereqs(tooltip.node.id).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prerequisites:</p>
                <div className="flex flex-wrap gap-1">
                  {getPrereqs(tooltip.node.id).map(p => (
                    <span key={p} className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edge tooltip */}
        {edgeTooltip && !tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-card border border-border rounded-xl shadow-xl p-3 max-w-72"
            style={{ left: edgeTooltip.x + 16, top: edgeTooltip.y - 20 }}
          >
            <p className="font-display font-700 text-sm text-foreground mb-1">
              {nodeById.get(edgeTooltip.edge.source)?.name ?? "?"}
              {edgeTooltip.edge.type === "corequisite_with" ? " ↔ " : " → "}
              {nodeById.get(edgeTooltip.edge.target)?.name ?? "?"}
            </p>
            <p className="text-xs text-muted-foreground">{edgeTypeLabel(edgeTooltip.edge)}</p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur border border-border rounded-xl p-3 flex flex-col gap-1.5">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
          {[
            { label: "Completed",   color: "#10b981" },
            { label: "In Progress", color: "#6366f1" },
            { label: "Unlocked",    color: "#6366f1", opacity: 0.5 },
            { label: "Locked",      color: "#94a3b8" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: l.color, opacity: l.opacity ?? 1 }} />
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mt-2 mb-1">Edges</p>
          {[
            { label: "Prerequisite", color: "var(--muted-foreground)", dash: undefined },
            { label: "Any one of (OR-group)", color: GROUP_COLOR, dash: "4 3" },
            { label: "Co-requisite", color: "var(--muted-foreground)", dash: "1 4" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <svg width="18" height="6" aria-hidden="true">
                <line x1="1" y1="3" x2="17" y2="3" stroke={l.color} strokeWidth="1.5" strokeDasharray={l.dash} strokeLinecap="round" />
              </svg>
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] bg-background flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-6 py-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display font-700 text-base text-foreground mr-2">Graph Explorer</h1>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["full", "path"] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 text-xs font-mono transition-colors ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {s === "full" ? "Full graph" : "My path"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button onClick={() => zoomBy(1.2)} aria-label="Zoom in" className="w-7 h-7 rounded border border-border bg-card text-foreground text-sm hover:bg-muted flex items-center justify-center">+</button>
          <button onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out" className="w-7 h-7 rounded border border-border bg-card text-foreground text-sm hover:bg-muted flex items-center justify-center">−</button>
          <button onClick={resetView} className="px-2 h-7 rounded border border-border bg-card text-xs text-muted-foreground hover:bg-muted">Reset</button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: categoryColor(cat) }} />
              {categoryLabel(cat)}
            </div>
          ))}
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 420 }}>
        {renderCanvas()}
      </div>
    </div>
  );
}
