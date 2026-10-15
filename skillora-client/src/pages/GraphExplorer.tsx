import React, { useState, useRef, useCallback } from "react";
import { Button, Badge, Card } from "@/components/ui";
import { graphNodes, graphEdges, paths, skills } from "@/data/mock";
import type { GraphNode, NodeStatus } from "@/data/mock";

const categoryColors: Record<string, string> = {
  Programming: "#6366f1",
  Data:        "#0ea5e9",
  Math:        "#f59e0b",
  "AI/ML":     "#8b5cf6",
  Engineering: "#10b981",
  Frontend:    "#f97316",
  Backend:     "#ec4899",
};

const statusFill: Record<string, string> = {
  completed:    "#10b981",
  "in-progress":"#6366f1",
  unlocked:     "#6366f1",
  locked:       "#94a3b8",
};

type Tooltip = { node: GraphNode; x: number; y: number } | null;

export default function GraphExplorer() {
  const [scope, setScope] = useState<"full" | "path">("full");
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(0.85);
  const [dragging, setDragging] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const pathNodeIds = new Set(paths[0].nodes.map(n => n.skillId));
  const displayNodes = scope === "path" ? graphNodes.filter(n => pathNodeIds.has(n.id)) : graphNodes;
  const displayEdges = scope === "path"
    ? graphEdges.filter(e => pathNodeIds.has(e.source) && pathNodeIds.has(e.target))
    : graphEdges;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest("circle, text")) return;
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)));
  }, []);

  function getPrereqs(nodeId: string) {
    return graphEdges
      .filter(e => e.target === nodeId)
      .map(e => skills.find(s => s.id === e.source)?.name)
      .filter(Boolean) as string[];
  }

  function getNode(id: string) { return graphNodes.find(n => n.id === id); }

  const categories = [...new Set(graphNodes.map(n => n.category))];

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="w-7 h-7 rounded border border-border bg-card text-foreground text-sm hover:bg-muted flex items-center justify-center">+</button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="w-7 h-7 rounded border border-border bg-card text-foreground text-sm hover:bg-muted flex items-center justify-center">−</button>
          <button onClick={() => { setPan({ x: 0, y: 0 }); setZoom(0.85); }} className="px-2 h-7 rounded border border-border bg-card text-xs text-muted-foreground hover:bg-muted">Reset</button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: categoryColors[cat] ?? "#888" }} />
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 480 }}>
        <svg
          ref={svgRef}
          className="w-full h-full graph-canvas select-none"
          style={{ minHeight: 480 }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {displayEdges.map((edge, i) => {
              const src = getNode(edge.source);
              const tgt = getNode(edge.target);
              if (!src || !tgt) return null;
              const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={isHighlighted ? "var(--primary)" : "var(--border)"}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeOpacity={isHighlighted ? 0.8 : 0.5}
                  markerEnd="none"
                />
              );
            })}

            {/* Nodes */}
            {displayNodes.map(node => {
              const isHovered = hoveredNode === node.id;
              const fill = statusFill[node.status ?? "locked"] ?? "#888";
              const catColor = categoryColors[node.category] ?? "#888";

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
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
                  <circle r={isHovered ? 20 : 16} fill={fill} opacity={node.status === "locked" ? 0.5 : 1} />
                  {node.status === "completed" && (
                    <text textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">✓</text>
                  )}
                  <text
                    y={isHovered ? 34 : 28}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize="11"
                    fontFamily="'DM Sans', sans-serif"
                    fontWeight="600"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 bg-card border border-border rounded-xl shadow-xl p-3 min-w-44"
            style={{ left: tooltip.x + 16, top: tooltip.y - 20 }}
          >
            <p className="font-display font-700 text-sm text-foreground mb-1">{tooltip.node.label}</p>
            <p className="text-xs font-mono text-muted-foreground mb-2">{tooltip.node.estimatedHours}h · {tooltip.node.category}</p>
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
            <div className={`mt-2 text-xs font-mono px-2 py-0.5 rounded-full inline-block ${
              tooltip.node.status === "completed"    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
              tooltip.node.status === "in-progress"  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
              tooltip.node.status === "unlocked"     ? "bg-secondary text-secondary-foreground" :
              "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}>
              {tooltip.node.status ?? "locked"}
            </div>
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
        </div>
      </div>
    </div>
  );
}
