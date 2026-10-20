import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, PageLoader, ErrorState, EmptyState, activateOnKey } from "@/components/ui";
import SkillDetailPanel from "@/components/SkillDetailPanel";
import { useActivePath, useGraph, type GraphScope } from "@/api/queries";
import { toApiError } from "@/api/client";
import { useCurrentUser } from "@/auth/AuthContext";
import { categoryColor, categoryLabel, demandWord, formatHours } from "@/lib/format";
import { computeLayout, fitToView, type Point } from "@/lib/graphLayout";
import { completedForRole, remainingSteps, selectedRankedPath } from "@/lib/pathMetrics";
import { computeStepStatuses, graphNodeStatus, prerequisiteGroups, type GraphNodeStatus, type StepView } from "@/lib/pathStatus";
import { heldRankMap, refId } from "@/lib/requirements";
import { ArrowIcon, CheckIcon, FitIcon, LockIcon, MinusIcon, PlusIcon } from "@/components/transit";
import type { GraphEdge, GraphNode } from "@/api/types";

type Node = GraphNode & { id: string };
type View = { zoom: number; pan: Point };
type Tip = { id: string; x: number; y: number } | null;
type EdgeTip = { edge: GraphEdge; x: number; y: number } | null;

// Gap left at the target end so the arrow head is not hidden under the node.
const ARROW_GAP = 24;
const NODE_R = 16;
const RING_R = 20;

// Colours are theme variables so the graph reads in light and dark.
const STATUS_STYLE: Record<GraphNodeStatus, { label: string; color: string; opacity: number }> = {
  known:         { label: "Known",            color: "var(--foreground)", opacity: 1 },
  "in-progress": { label: "Up next",          color: "var(--primary)",    opacity: 1 },
  unlocked:      { label: "Available",        color: "var(--primary)",    opacity: 1 },
  locked:        { label: "Locked",           color: "var(--line-grey)",  opacity: 1 },
  outside:       { label: "Not in your path", color: "var(--line-grey)",  opacity: 0.4 },
};

function edgeTypeLabel(edge: GraphEdge): string {
  if (edge.type === "corequisite_with") return "Co-requisite: informational, not used in path search.";
  if (edge.group) return `Prerequisite, OR-group '${edge.group}': any one is enough.`;
  return "Prerequisite: mandatory.";
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
// Below this zoom, labels of skills outside the user's path are hidden so they don't pile up.
const LABEL_ZOOM = 0.75;
// Labels keep at least this on-screen size (px) when zoomed out.
const MIN_LABEL_PX = 10;

/** The station disc for one status, centred on the origin. Used by the nodes, the tooltip and the legend. */
function StatusDisc({ status, r }: { status: GraphNodeStatus; r: number }) {
  const glyph = Math.max(8, r * 0.9);
  const glyphStyle = { color: "var(--background)" };
  switch (status) {
    case "known":
      return (
        <>
          <circle r={r} fill="var(--foreground)" />
          <CheckIcon size={glyph} x={-glyph / 2} y={-glyph / 2} style={glyphStyle} strokeWidth={2.2} />
        </>
      );
    case "in-progress":
      return <circle r={r} fill="var(--primary)" />;
    case "unlocked":
      return <circle r={r - 1} fill="var(--background)" stroke="var(--primary)" strokeWidth={2.5} />;
    case "locked":
      return (
        <>
          <circle r={r} fill="var(--line-grey)" />
          <LockIcon size={glyph} x={-glyph / 2} y={-glyph / 2} style={glyphStyle} strokeWidth={2} />
        </>
      );
    default:
      return <circle r={r} fill="var(--line-grey)" />;
  }
}

function PrereqMark({ held }: { held: boolean }) {
  return held ? (
    <CheckIcon size={14} className="mt-0.5 shrink-0 text-foreground" />
  ) : (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground">
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const segBtn = (on: boolean) =>
  `min-h-11 px-4 text-[15px] font-bold transition-colors ${on ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`;
const ctlBtn =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border-2 border-border bg-card text-foreground transition-colors hover:border-foreground";

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

  const [tip, setTip] = useState<Tip>(null);
  const [edgeTip, setEdgeTip] = useState<EdgeTip>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const closePanel = useCallback(() => setSelectedId(null), []);

  const changeScope = (next: GraphScope) => {
    if (next === scope) return;
    setScope(next);
    setSelectedId(null);
    setHoveredNode(null);
    setFocusedNode(null);
    setHoveredEdge(null);
    setTip(null);
    setEdgeTip(null);
  };
  const [view, setView] = useState<View>({ zoom: 0.85, pan: { x: 0, y: 0 } });
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // `/api/graph` nodes use `_id`; the layout and the SVG work with `id`.
  const nodes = useMemo<Node[]>(() => (graph.data?.nodes ?? []).map(n => ({ ...n, id: n._id })), [graph.data]);
  const edges = useMemo(() => graph.data?.edges ?? [], [graph.data]);
  const nodeById = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  // Names for the detail panel and tooltips, which can point outside the path-scoped graph.
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

  // Hovering or focusing a node highlights it and its neighbours; everything else dims.
  const activeNode = hoveredNode ?? focusedNode;
  const neighbours = useMemo(() => {
    if (!activeNode) return null;
    const set = new Set<string>([activeNode]);
    for (const e of edges) {
      if (e.source === activeNode) set.add(e.target);
      else if (e.target === activeNode) set.add(e.source);
    }
    return set;
  }, [activeNode, edges]);

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
      setTip(null);
      setEdgeTip(null);
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
    setTip(null);
    setView(v => {
      const zoom = clampZoom(v.zoom * factor);
      const k = zoom / v.zoom;
      return { zoom, pan: { x: cx - (cx - v.pan.x) * k, y: cy - (cy - v.pan.y) * k } };
    });
  };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest("[role='button']")) return;
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

  // Tooltips open to the left/top of the anchor near the right/bottom edge so they stay on screen.
  function tipPosition(x: number, y: number): React.CSSProperties {
    const rect = svgRef.current?.getBoundingClientRect();
    const w = rect?.width ?? Infinity;
    const h = rect?.height ?? Infinity;
    return {
      ...(x > w - 320 ? { right: w - x + 16 } : { left: x + 16 }),
      ...(y > h - 260 ? { bottom: h - y + 12 } : { top: Math.max(8, y - 20) }),
    };
  }

  const openNode = (id: string) => { setSelectedId(id); setTip(null); };

  const labelSize = Math.max(11, MIN_LABEL_PX / view.zoom);

  const categories = useMemo(() => [...new Set(nodes.map(n => n.category))].sort(), [nodes]);

  /** Prerequisites as requirements: one entry per mandatory skill or OR-group, with whether it is met. */
  function requirementsOf(id: string) {
    return prerequisiteGroups(id, fullGraph.data?.edges ?? edges).map(ids => ({
      names: ids.map(nameOf),
      met: ids.some(p => (held.get(p) ?? 0) >= 1),
    }));
  }

  function renderTip() {
    if (!tip) return null;
    const node = nodeById.get(tip.id);
    if (!node) return null;
    const status = graphNodeStatus(node.id, held, stepById);
    const style = STATUS_STYLE[status];
    const step = stepById.get(node.id);
    const reqs = requirementsOf(node.id);
    const missing = reqs.filter(r => !r.met).map(r => (r.names.length > 1 ? `one of ${r.names.join(" / ")}` : r.names[0]));
    return (
      <div
        role="tooltip"
        className="absolute pointer-events-none z-20 bg-card border border-border rounded-lg p-3 max-w-72"
        style={tipPosition(tip.x, tip.y)}
      >
        <p className="font-display font-700 text-sm text-foreground">{node.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {categoryLabel(node.category)} · <span className="font-mono">{formatHours(node.estHours)}</span> · {demandWord(node.marketDemand)}
        </p>
        {reqs.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-bold text-foreground mb-1">Prerequisites</p>
            <ul className="flex flex-col gap-1">
              {reqs.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                  <PrereqMark held={r.met} />
                  <span>
                    {r.names.length > 1 ? `One of ${r.names.join(" / ")}` : r.names[0]}
                    <span className="sr-only">{r.met ? ", held" : ", missing"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {status === "locked" && missing.length > 0 && (
          <p className="mt-2 text-xs text-foreground">
            <span className="font-bold">Locked:</span> still needs {missing.join(", ")}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-foreground">
          <svg width="14" height="14" viewBox="-8 -8 16 16" aria-hidden="true"><StatusDisc status={status} r={6} /></svg>
          {style.label}
        </div>
        {step && (
          <p className="mt-2 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">Step {step.order}.</span> {step.rationale}
          </p>
        )}
      </div>
    );
  }

  function renderCanvas() {
    if (needsPath) {
      return (
        <EmptyState
          title="Compute a path first"
          description="Pick a target role and compute your learning path on the Dashboard, then come back to see it here."
          action={<Button onClick={() => navigate("/dashboard")}>Go to Dashboard <ArrowIcon size={16} /></Button>}
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
      return <EmptyState title="No skills yet" description="The skill graph is empty." />;
    }

    const fade = "opacity 200ms ease";

    return (
      <>
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full graph-canvas select-none"
          role="group"
          aria-label="Skill graph"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            {[
              ["graph-arrow", "var(--muted-foreground)"],
              ["graph-arrow-or", "var(--line-alt)"],
              ["graph-arrow-active", "var(--primary)"],
            ].map(([id, fill]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={fill} />
              </marker>
            ))}
          </defs>
          <g transform={`translate(${view.pan.x},${view.pan.y}) scale(${view.zoom})`}>
            {/* Edges: source to target, the prerequisite points at the skill it unlocks */}
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
              const touches = !!activeNode && (edge.source === activeNode || edge.target === activeNode);
              const isHighlighted = hoveredEdge === i || touches;
              const dimmed = !!activeNode && !touches && hoveredEdge !== i;
              const stroke = isHighlighted ? "var(--primary)" : isGrouped ? "var(--line-alt)" : "var(--muted-foreground)";
              const marker = isHighlighted ? "graph-arrow-active" : isGrouped ? "graph-arrow-or" : "graph-arrow";
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y}
                  x2={isCoreq ? tgt.x : tgt.x - ux * ARROW_GAP}
                  y2={isCoreq ? tgt.y : tgt.y - uy * ARROW_GAP}
                  stroke={stroke}
                  strokeWidth={isHighlighted ? 2 : 1.2}
                  strokeDasharray={isCoreq ? "1 4" : isGrouped ? "5 4" : undefined}
                  strokeLinecap={isCoreq ? "round" : undefined}
                  markerEnd={isCoreq ? undefined : `url(#${marker})`}
                  style={{ opacity: dimmed ? 0.12 : isHighlighted ? 1 : isGrouped ? 0.85 : 0.5, transition: fade }}
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
                    if (rect) setEdgeTip({ edge, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseEnter={() => setHoveredEdge(i)}
                  onMouseLeave={() => { setHoveredEdge(null); setEdgeTip(null); }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const isActive = activeNode === node.id;
              const status = graphNodeStatus(node.id, held, stepById);
              const style = STATUS_STYLE[status];
              const dimmed = !!neighbours && !neighbours.has(node.id);
              const showLabel = isActive || status !== "outside" || view.zoom >= LABEL_ZOOM;
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "touch") return;
                    setHoveredNode(node.id);
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) setTip({ id: node.id, x: e.clientX - rect.left + 18, y: e.clientY - rect.top });
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "touch") return;
                    setHoveredNode(null);
                    setTip(null);
                  }}
                  onFocus={() => {
                    setFocusedNode(node.id);
                    setTip({ id: node.id, x: pos.x * view.zoom + view.pan.x + (RING_R + 8) * view.zoom, y: pos.y * view.zoom + view.pan.y });
                  }}
                  onBlur={() => { setFocusedNode(null); setTip(null); }}
                  onClick={() => openNode(node.id)}
                  onKeyDown={activateOnKey(() => openNode(node.id))}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.name}, ${style.label}`}
                  className="outline-none"
                  style={{ cursor: "pointer", opacity: dimmed ? 0.15 : style.opacity, transition: fade }}
                >
                  {/* Category ring */}
                  <circle r={RING_R} fill="none" stroke={categoryColor(node.category)} strokeWidth={2} />
                  <StatusDisc status={status} r={NODE_R} />
                  {(selectedId === node.id || focusedNode === node.id) && (
                    <circle r={RING_R + 5} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeDasharray={focusedNode === node.id ? undefined : "3 3"} />
                  )}
                  {showLabel && (
                    <text
                      y={RING_R + 4 + labelSize}
                      textAnchor="middle"
                      fill="var(--foreground)"
                      fontSize={labelSize}
                      fontFamily="'Overpass Variable', sans-serif"
                      fontWeight="700"
                      stroke="var(--background)"
                      strokeWidth={3}
                      paintOrder="stroke"
                    >
                      {node.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {renderTip()}

        {/* Edge tooltip */}
        {edgeTip && !tip && (
          <div
            role="tooltip"
            className="absolute pointer-events-none z-20 bg-card border border-border rounded-lg p-3 max-w-72"
            style={tipPosition(edgeTip.x, edgeTip.y)}
          >
            <p className="font-display font-700 text-sm text-foreground mb-1 flex flex-wrap items-center gap-1.5">
              {nodeById.get(edgeTip.edge.source)?.name ?? "?"}
              {edgeTip.edge.type === "corequisite_with" ? (
                <span className="text-muted-foreground font-500">with</span>
              ) : (
                <ArrowIcon size={14} />
              )}
              {nodeById.get(edgeTip.edge.target)?.name ?? "?"}
            </p>
            <p className="text-xs text-muted-foreground">{edgeTypeLabel(edgeTip.edge)}</p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-card border border-border rounded-lg p-3 flex flex-col gap-1.5">
          <p className="text-sm font-bold text-foreground">Status</p>
          {(["known", "in-progress", "unlocked", "locked", "outside"] as GraphNodeStatus[]).map(s => (
            <div key={s} className="flex items-center gap-2" style={{ opacity: s === "outside" ? 0.6 : 1 }}>
              <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true"><StatusDisc status={s} r={6.5} /></svg>
              <span className="text-xs text-foreground">{STATUS_STYLE[s].label}</span>
            </div>
          ))}
          <p className="text-sm font-bold text-foreground mt-2">Links</p>
          {[
            { label: "Prerequisite", color: "var(--muted-foreground)", dash: undefined },
            { label: "Any one of (OR-group)", color: "var(--line-alt)", dash: "5 4" },
            { label: "Co-requisite", color: "var(--muted-foreground)", dash: "1 4" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <svg width="18" height="6" aria-hidden="true">
                <line x1="1" y1="3" x2="17" y2="3" stroke={l.color} strokeWidth="1.6" strokeDasharray={l.dash} strokeLinecap="round" />
              </svg>
              <span className="text-xs text-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="h-[calc(100dvh-3.5rem)] bg-background flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display font-800 text-lg text-foreground mr-2">Skill graph</h1>
        <div className="flex overflow-hidden rounded-full border-2 border-border" role="group" aria-label="Graph scope">
          {(["full", "path"] as const).map(s => (
            <button key={s} onClick={() => changeScope(s)} aria-pressed={scope === s} className={segBtn(scope === s)}>
              {s === "full" ? "Full graph" : "My path"}
            </button>
          ))}
        </div>
        <div className="flex gap-2" role="group" aria-label="Zoom">
          <button onClick={() => zoomBy(1.2)} aria-label="Zoom in" className={ctlBtn}><PlusIcon size={18} /></button>
          <button onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out" className={ctlBtn}><MinusIcon size={18} /></button>
          <button onClick={resetView} className={`${ctlBtn} px-4 text-[15px] font-bold`}><FitIcon size={16} /> Reset</button>
        </div>
        <ul className="ml-auto flex flex-wrap gap-x-4 gap-y-1">
          {categories.map(cat => (
            <li key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: categoryColor(cat) }} aria-hidden="true" />
              {categoryLabel(cat)}
            </li>
          ))}
        </ul>
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
