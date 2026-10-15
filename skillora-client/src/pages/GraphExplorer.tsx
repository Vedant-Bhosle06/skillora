import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageLoader, ErrorState, EmptyState } from "@/components/ui";
import SkillDetailPanel from "@/components/SkillDetailPanel";
import { useActivePath, useGraph, type GraphScope } from "@/api/queries";
import { toApiError } from "@/api/client";
import { useCurrentUser } from "@/auth/AuthContext";
import { categoryColor, categoryLabel, formatHours, formatPercent } from "@/lib/format";
import { computeLayout, fitToView, type Point } from "@/lib/graphLayout";
import { completedForRole, remainingSteps, selectedRankedPath } from "@/lib/pathMetrics";
import { computeStepStatuses, graphNodeStatus, type GraphNodeStatus, type StepView } from "@/lib/pathStatus";
import { heldRankMap, refId } from "@/lib/requirements";
import type { GraphEdge, GraphNode } from "@/api/types";

type Node = GraphNode & { id: string };
type View = { zoom: number; pan: Point };
type Tooltip = { node: Node; x: number; y: number } | null;
type EdgeTooltip = { edge: GraphEdge; x: number; y: number } | null;

// Gap left at the target end so the arrow head is not hidden under the node.
const ARROW_GAP = 24;
const GROUP_COLOR = "#f59e0b";

const STATUS_STYLE: Record<GraphNodeStatus, { label: string; color: string; opacity: number }> = {
  known:         { label: "Known",            color: "#10b981", opacity: 1 },
  "in-progress": { label: "Up next",          color: "#6366f1", opacity: 1 },
  unlocked:      { label: "Available",        color: "#818cf8", opacity: 1 },
  locked:        { label: "Locked",           color: "#94a3b8", opacity: 1 },
  outside:       { label: "Not in your path", color: "#cbd5e1", opacity: 0.45 },
};

function edgeTypeLabel(edge: GraphEdge): string {
  if (edge.type === "corequisite_with") return "Co-requisite (informational, not used in path search)";
  if (edge.group) return `Prerequisite — OR-group '${edge.group}': any one is enough`;
  return "Prerequisite (mandatory)";
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
// Below this zoom, labels of skills outside the user's path are hidden so they don't pile up.
const LABEL_ZOOM = 0.6;

export default function GraphExplorer() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [scope, setScope] = useState<GraphScope>("full");
  // scope=path silently returns the full graph when there is no path yet (Gotcha 4), so don't ask for it.
  const needsPath = scope === "path" && !user.activePathId;
  const graph = useGraph(scope, !needsPath);
  // Step statuses need every prerequisite edge, which the path-scoped graph may leave out.
  const fullGraph = useGraph("full");
  const activePath = useActivePath();

  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [edgeTooltip, setEdgeTooltip] = useState<EdgeTooltip>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closePanel = useCallback(() => setSelectedId(null), []);

  const changeScope = (next: GraphScope) => {
    if (next === scope) return;
    setScope(next);
    setSelectedId(null);
    setHoveredNode(null);
    setHoveredEdge(null);
    setTooltip(null);
    setEdgeTooltip(null);
  };
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [view, setView] = useState<View>({ zoom: 0.85, pan: { x: 0, y: 0 } });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // `/api/graph` nodes use `_id`; the layout and the SVG work with `id`.
  const nodes = useMemo<Node[]>(() => (graph.data?.nodes ?? []).map(n => ({ ...n, id: n._id })), [graph.data]);
  const edges = useMemo(() => graph.data?.edges ?? [], [graph.data]);
  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  // Names for the detail panel's edge lists, which can point outside the path-scoped graph.
  const nameById = useMemo(
    () => new Map((fullGraph.data?.nodes ?? graph.data?.nodes ?? []).map(n => [n._id, n.name])),
    [fullGraph.data, graph.data]
  );
  const nameOf = useCallback((id: string) => nameById.get(id) ?? "Unknown skill", [nameById]);
  const positions = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);

  // The user's selected route: only a document for the current role, minus steps already completed for it.
  const held = useMemo(() => heldRankMap(user), [user]);
  const stepById = useMemo(() => {
    const doc = activePath.data && activePath.data.targetRoleId === user.targetRoleId?._id ? activePath.data : null;
    const completedIds = new Set(
      completedForRole(user).map(c => refId(c.skillId)).filter((id): id is string => !!id)
    );
    const remaining = remainingSteps(selectedRankedPath(doc, user.selectedPathRank), completedIds);
    const steps = computeStepStatuses(remaining, fullGraph.data?.edges, held);
    return new Map<string, StepView>(steps.map(s => [s.skillId, s]));
  }, [activePath.data, user, fullGraph.data, held]);

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

  // Tooltips open to the left/top of the cursor near the right/bottom edge so they stay on screen.
  function tipPosition(x: number, y: number): React.CSSProperties {
    const rect = svgRef.current?.getBoundingClientRect();
    const w = rect?.width ?? Infinity;
    const h = rect?.height ?? Infinity;
    return {
      ...(x > w - 300 ? { right: w - x + 16 } : { left: x + 16 }),
      ...(y > h - 200 ? { bottom: h - y + 12 } : { top: y - 20 }),
    };
  }

  function getPrereqs(nodeId: string) {
    return edges
      .filter(e => e.type === "prerequisite_of" && e.target === nodeId)
      .map(e => nodeById.get(e.source)?.name)
      .filter(Boolean) as string[];
  }

  const categories = useMemo(() => [...new Set(nodes.map(n => n.category))].sort(), [nodes]);

  function renderCanvas() {
    if (needsPath) {
      return (
        <EmptyState
          icon="◎"
          title="Compute a path first"
          description="Pick a target role and compute your learning path on the Dashboard, then come back to see it here."
          action={<Button onClick={() => navigate("/dashboard")}>Go to Dashboard →</Button>}
        />
      );
    }
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
              const status = graphNodeStatus(node.id, held, stepById);
              const style = STATUS_STYLE[status];

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
                  onClick={() => { setSelectedId(node.id); setTooltip(null); }}
                  role="button"
                  aria-label={node.name}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer ring for category, inner circle for status */}
                  <circle r={isHovered ? 26 : 22} fill={catColor} opacity={0.15} />
                  {selectedId === node.id && (
                    <circle r={isHovered ? 26 : 22} fill="none" stroke="var(--primary)" strokeWidth={2.5} />
                  )}
                  <circle r={isHovered ? 20 : 16} fill={style.color} opacity={isHovered ? 1 : style.opacity} />
                  {status === "known" && (
                    <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">✓</text>
                  )}
                  {(isHovered || status !== "outside" || view.zoom >= LABEL_ZOOM) && (
                    <text
                      y={isHovered ? 34 : 28}
                      textAnchor="middle"
                      fill="var(--foreground)"
                      fillOpacity={status === "outside" && !isHovered ? 0.7 : 1}
                      fontSize="11"
                      fontFamily="'DM Sans', sans-serif"
                      fontWeight="600"
                    >
                      {node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-card border border-border rounded-xl shadow-xl p-3 min-w-44 max-w-72"
            style={tipPosition(tooltip.x, tooltip.y)}
          >
            <p className="font-display font-700 text-sm text-foreground mb-1">{tooltip.node.name}</p>
            <p className="text-xs font-mono text-muted-foreground mb-2">
              {categoryLabel(tooltip.node.category)} · {formatHours(tooltip.node.estHours)} · {formatPercent(tooltip.node.marketDemand)} demand
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
            {(() => {
              const style = STATUS_STYLE[graphNodeStatus(tooltip.node.id, held, stepById)];
              const step = stepById.get(tooltip.node.id);
              return (
                <>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-mono text-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: style.color }} />
                    {style.label}
                  </div>
                  {step && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-600 text-foreground">Step #{step.order}</span> — {step.rationale}
                    </p>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Edge tooltip */}
        {edgeTooltip && !tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-card border border-border rounded-xl shadow-xl p-3 max-w-72"
            style={tipPosition(edgeTooltip.x, edgeTooltip.y)}
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
          {Object.values(STATUS_STYLE).map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: l.color, opacity: l.opacity }} />
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
              onClick={() => changeScope(s)}
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
      <div className="flex-1 flex relative overflow-hidden" style={{ minHeight: 420 }}>
        <div className="flex-1 relative overflow-hidden">
          {renderCanvas()}
        </div>
        {selectedId && (
          <SkillDetailPanel
            key={selectedId}
            skillId={selectedId}
            status={STATUS_STYLE[graphNodeStatus(selectedId, held, stepById)]}
            step={stepById.get(selectedId)}
            nameOf={nameOf}
            onSelect={setSelectedId}
            onClose={closePanel}
          />
        )}
      </div>
    </div>
  );
}
