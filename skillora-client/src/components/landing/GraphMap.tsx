import React, { useId, useMemo } from "react";
import { landingGraph } from "@/content/landingGraph";

// A flat SVG drawing of the same skill graph snapshot. Used as the hero's still fallback
// (reduced motion / no WebGL), in the bento, and as the two layers of the cursor reveal.
// Colours come from CSS variables, so it follows the light/dark theme.

type Highlight = "route" | "ready" | "none";

interface Props {
  highlight?: Highlight;
  /** "dim" draws every node in the quiet colour; "lit" adds glow and labels for the highlight. */
  tone?: "dim" | "lit";
  labels?: boolean;
  className?: string;
  title?: string;
}

const W = 1000;
const H = 620;

function useProjected() {
  return useMemo(() => {
    const pts = landingGraph.nodes.map(n => [n.p[0] + n.p[2] * 0.35, -n.p[1] + n.p[2] * 0.12] as const);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const pad = 46;
    const s = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY));
    const ox = (W - (maxX - minX) * s) / 2, oy = (H - (maxY - minY) * s) / 2;
    return pts.map(([x, y]) => [ox + (x - minX) * s, oy + (y - minY) * s] as const);
  }, []);
}

export default function GraphMap({ highlight = "route", tone = "lit", labels = true, className = "", title }: Props) {
  const pts = useProjected();
  const gid = useId().replace(/:/g, "");
  const g = landingGraph;
  const index = useMemo(() => new Map(g.nodes.map((n, i) => [n.slug, i])), [g]);
  const held = useMemo(() => new Set(g.held.map(h => index.get(h.slug)!)), [g, index]);
  const route = useMemo(() => g.route.map(s => index.get(s.slug)!), [g, index]);
  const ready = useMemo(() => new Set(g.readyNow.map(s => index.get(s)!)), [g, index]);
  const lit = tone === "lit";
  const isHi = (i: number) => (highlight === "route" ? route.includes(i) : highlight === "ready" ? ready.has(i) : false);

  const routePath = route.map((i, k) => `${k ? "L" : "M"}${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`route-${gid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: "var(--graph-route-a)" }} />
          <stop offset="1" style={{ stopColor: "var(--graph-route-b)" }} />
        </linearGradient>
      </defs>
      {g.edges.map(([a, b, prereq], i) => {
        const hot = lit && ((highlight === "ready" && ((held.has(a) && ready.has(b)) || (held.has(b) && ready.has(a)))));
        return (
          <line key={i} x1={pts[a][0]} y1={pts[a][1]} x2={pts[b][0]} y2={pts[b][1]}
            style={{ stroke: hot ? "var(--graph-ready)" : "var(--graph-edge)" }}
            strokeWidth={hot ? 1.6 : 0.8} strokeOpacity={hot ? 0.9 : prereq ? (lit ? 0.5 : 0.32) : 0.22} />
        );
      })}
      {lit && highlight === "route" && (
        <path d={routePath} fill="none" stroke={`url(#route-${gid})`} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {g.nodes.map((n, i) => {
        const hi = lit && isHi(i);
        const h = held.has(i);
        const fill = h && lit ? "var(--graph-held)" : hi ? (highlight === "ready" ? "var(--graph-ready)" : "var(--graph-route-a)") : "var(--graph-node)";
        return (
          <g key={n.slug}>
            {(hi || (h && lit)) && <circle cx={pts[i][0]} cy={pts[i][1]} r={13} style={{ fill }} opacity={0.18} />}
            <circle cx={pts[i][0]} cy={pts[i][1]} r={hi || (h && lit) ? 5.5 : 3.2 + Math.min(n.degree, 6) * 0.25} style={{ fill }} opacity={hi || (h && lit) ? 1 : lit ? 0.55 : 0.4} />
            {labels && lit && (hi || h) && (
              <text x={pts[i][0]} y={pts[i][1] - 16} textAnchor="middle" className="graph-map-label">{n.name}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
