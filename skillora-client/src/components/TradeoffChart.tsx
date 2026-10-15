import React from "react";
import type { RankedPath } from "@/api/types";
import { formatHours } from "@/lib/format";
import { pathLabel } from "@/lib/pathMetrics";

const W = 480;
const H = 220;
const PAD = { left: 48, right: 20, top: 16, bottom: 40 };

/** Hours vs. market demand for each ranked path; the selected one is ringed. */
export default function TradeoffChart({ paths, selectedRank }: { paths: RankedPath[]; selectedRank: number }) {
  const hours = paths.map(p => p.totalLearningCost);
  const lo = Math.min(...hours);
  const hi = Math.max(...hours);
  const pad = Math.max((hi - lo) * 0.1, lo * 0.1, 1);
  const xMin = Math.max(0, lo - pad);
  const xMax = hi + pad;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (h: number) => PAD.left + ((h - xMin) / (xMax - xMin)) * plotW;
  const y = (demand01: number) => PAD.top + (1 - Math.min(1, Math.max(0, demand01))) * plotH;

  const short = (rank: number) => (rank === 1 ? "P" : `A${rank - 1}`);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Learning hours versus market demand for each route">
      {/* Grid and axes */}
      {[0, 0.5, 1].map(v => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" strokeDasharray={v === 0 ? undefined : "3 3"} />
          <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fill="var(--muted-foreground)" fontSize="10">{Math.round(v * 100)}%</text>
        </g>
      ))}
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--border)" strokeWidth="1" />
      <text x={PAD.left} y={H - PAD.bottom + 14} textAnchor="start" fill="var(--muted-foreground)" fontSize="10">{formatHours(xMin)}</text>
      <text x={W - PAD.right} y={H - PAD.bottom + 14} textAnchor="end" fill="var(--muted-foreground)" fontSize="10">{formatHours(xMax)}</text>
      <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill="var(--muted-foreground)" fontSize="10">Learning hours (fewer is faster) →</text>
      <text
        x={12} y={PAD.top + plotH / 2} textAnchor="middle" fill="var(--muted-foreground)" fontSize="10"
        transform={`rotate(-90 12 ${PAD.top + plotH / 2})`}
      >
        Market demand
      </text>

      {/* One dot per route */}
      {paths.map(p => {
        const cx = x(p.totalLearningCost);
        const cy = y(p.marketDemandAvg);
        const selected = p.rank === selectedRank;
        return (
          <g key={p.rank}>
            <title>{`${pathLabel(p.rank)}: ${formatHours(p.totalLearningCost)}, ${Math.round(p.marketDemandAvg * 100)}% demand`}</title>
            {selected && <circle cx={cx} cy={cy} r="11" fill="none" stroke="var(--primary)" strokeWidth="2" />}
            <circle cx={cx} cy={cy} r="6" fill={p.rank === 1 ? "var(--primary)" : "var(--accent)"} opacity="0.9" />
            <text x={cx} y={cy - 15} textAnchor="middle" fill="var(--foreground)" fontSize="10" fontWeight="bold">{short(p.rank)}</text>
          </g>
        );
      })}
    </svg>
  );
}
