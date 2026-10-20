import React from "react";
import type { RankedPath } from "@/api/types";
import { formatHours } from "@/lib/format";
import { pathLabel } from "@/lib/pathMetrics";

const W = 380;
const H = 250;
const PAD = { left: 50, right: 24, top: 24, bottom: 54 };

/** Hours vs. market demand for each ranked path: the primary in the route colour, the others in the alternative colour; the selected one is ringed. */
export default function TradeoffChart({ paths, selectedRank }: { paths: RankedPath[]; selectedRank: number }) {
  const hours = paths.map(p => p.totalLearningCost);
  const lo = Math.min(...hours);
  const hi = Math.max(...hours);
  const pad = Math.max((hi - lo) * 0.25, lo * 0.1, 1);
  const xMin = Math.max(0, lo - pad);
  const xMax = hi + pad;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (h: number) => PAD.left + ((h - xMin) / (xMax - xMin)) * plotW;
  const y = (demand01: number) => PAD.top + (1 - Math.min(1, Math.max(0, demand01))) * plotH;

  const short = (rank: number) => (rank === 1 ? "Primary" : `Alt ${rank - 1}`);
  const colorOf = (rank: number) => (rank === 1 ? "var(--line-route)" : "var(--line-alt)");
  const ticks = [xMin, (xMin + xMax) / 2, xMax];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Learning hours versus market demand for each route">
      {/* Grid: a rule per demand level, a tick per hours value */}
      {[0, 0.5, 1].map(v => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 ? undefined : "3 4"} />
          <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="12" fontFamily="var(--font-mono)">{Math.round(v * 100)}%</text>
        </g>
      ))}
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--border)" strokeWidth="1" />
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={x(t)} x2={x(t)} y1={H - PAD.bottom} y2={H - PAD.bottom + 5} stroke="var(--muted-foreground)" strokeWidth="1" />
          <text x={x(t)} y={H - PAD.bottom + 20} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} fill="var(--muted-foreground)" fontSize="12" fontFamily="var(--font-mono)">{formatHours(Math.round(t))}</text>
        </g>
      ))}
      <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill="var(--foreground)" fontSize="12" fontWeight="700">Learning hours (fewer is faster)</text>
      <text
        x={12} y={PAD.top + plotH / 2} textAnchor="middle" fill="var(--foreground)" fontSize="12" fontWeight="700"
        transform={`rotate(-90 12 ${PAD.top + plotH / 2})`}
      >
        Market demand
      </text>

      {/* One station per route */}
      {paths.map(p => {
        const cx = x(p.totalLearningCost);
        const cy = y(p.marketDemandAvg);
        const selected = p.rank === selectedRank;
        const c = colorOf(p.rank);
        return (
          <g key={p.rank}>
            <title>{`${pathLabel(p.rank)}: ${formatHours(p.totalLearningCost)}, ${Math.round(p.marketDemandAvg * 100)}% demand`}</title>
            {selected && <circle cx={cx} cy={cy} r="13" fill="none" stroke="var(--foreground)" strokeWidth="2" />}
            <circle cx={cx} cy={cy} r="7" fill="var(--station)" stroke={c} strokeWidth="4" />
            <text x={cx} y={cy - 19} textAnchor="middle" fill="var(--foreground)" fontSize="12" fontWeight="700">{short(p.rank)}{selected ? " (yours)" : ""}</text>
          </g>
        );
      })}
    </svg>
  );
}
