import React, { useMemo } from "react";
import type { RankedPath } from "@/api/types";
import { formatHours } from "@/lib/format";
import { pathLabel } from "@/lib/pathMetrics";

const ROW = 60;
const GAP = 28;
const PAD = 20;
/** Primary is the signal red; alternatives take the alternative line colours. */
const LANE_COLORS = ["var(--line-route)", "var(--line-alt)", "var(--line-data)", "var(--line-web)", "var(--line-cloud)"];

/**
 * All routes on one diagram: one vertical line per route, one row per skill. A skill that several
 * routes share sits on the same row with its stations joined by a bar.
 */
export default function RouteMap({ paths, skillName, currentRank }: {
  paths: RankedPath[]; skillName: (id: string) => string; currentRank: number;
}) {
  const rows = useMemo(() => {
    const info = new Map<string, { id: string; orders: number[]; lanes: number[]; hours: number }>();
    paths.forEach((p, lane) => {
      for (const s of p.steps) {
        const e = info.get(s.skillId) ?? { id: s.skillId, orders: [], lanes: [], hours: s.estCost };
        e.orders.push(s.order);
        e.lanes.push(lane);
        info.set(s.skillId, e);
      }
    });
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    return [...info.values()].sort((a, b) => mean(a.orders) - mean(b.orders) || Math.min(...a.orders) - Math.min(...b.orders));
  }, [paths]);

  const width = PAD * 2 + GAP * (paths.length - 1);
  const height = rows.length * ROW;
  const laneX = (lane: number) => PAD + lane * GAP;
  const rowY = (row: number) => row * ROW + ROW / 2;
  const laneName = (lane: number) => (paths[lane].rank === 1 ? "Primary" : pathLabel(paths[lane].rank));

  const where = (lanes: number[]) =>
    lanes.length === paths.length ? "On every route" : lanes.length === 1 ? `${laneName(lanes[0])} only` : lanes.map(laneName).join(" and ");

  return (
    <div>
      <ul className="mb-5 flex flex-wrap gap-x-6 gap-y-2">
        {paths.map((p, lane) => (
          <li key={p.rank} className="flex items-center gap-2 text-base text-foreground">
            <span className="h-1.5 w-8 rounded-full" style={{ background: LANE_COLORS[lane % LANE_COLORS.length] }} aria-hidden="true" />
            <span className="font-bold">{laneName(lane)}{p.rank === currentRank ? " (yours)" : ""}</span>
            <span className="font-mono text-sm text-muted-foreground">{formatHours(p.totalLearningCost)}</span>
          </li>
        ))}
      </ul>

      <div className="flex">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" aria-hidden="true">
          {paths.map((p, lane) => {
            const idx = rows.map((r, i) => (r.lanes.includes(lane) ? i : -1)).filter(i => i >= 0);
            if (idx.length === 0) return null;
            return <line key={p.rank} x1={laneX(lane)} x2={laneX(lane)} y1={rowY(idx[0])} y2={rowY(idx[idx.length - 1])} stroke={LANE_COLORS[lane % LANE_COLORS.length]} strokeWidth="6" strokeLinecap="round" />;
          })}
          {rows.map((r, i) => r.lanes.length > 1 && (
            <line key={`j${r.id}`} x1={laneX(Math.min(...r.lanes))} x2={laneX(Math.max(...r.lanes))} y1={rowY(i)} y2={rowY(i)} stroke="var(--foreground)" strokeWidth="4" strokeLinecap="round" />
          ))}
          {rows.map((r, i) => r.lanes.map(lane => (
            <circle key={`${r.id}-${lane}`} cx={laneX(lane)} cy={rowY(i)} r="9" fill="var(--station)" stroke={r.lanes.length > 1 ? "var(--foreground)" : LANE_COLORS[lane % LANE_COLORS.length]} strokeWidth="4" />
          )))}
        </svg>
        <ol className="min-w-0 flex-1" aria-label="Stops on each route">
          {rows.map(r => (
            <li key={r.id} className="flex items-center justify-between gap-4 pl-3" style={{ height: ROW }}>
              <span className="min-w-0">
                <span className="block text-base font-bold leading-tight text-foreground">{skillName(r.id)}</span>
                <span className="block text-sm text-muted-foreground">{where(r.lanes)}</span>
              </span>
              <span className="shrink-0 font-mono text-sm text-muted-foreground">{formatHours(r.hours)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
