import React from "react";
import { TrainIcon } from "@/components/transit";

/**
 * The journey clock: the whole trip as one horizontal line with a train at the current stop.
 * `value` is the share of the route done (0..1). It replaces the progress ring.
 */
export default function JourneyClock({ value, start = "Start", end, caption, label = "Journey progress" }: {
  value: number; start?: string; end: string; caption?: React.ReactNode; label?: string;
}) {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const pct = Math.round(v * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-display text-xl font-extrabold text-foreground">{pct}% of the way there</p>
        {caption && <p className="font-mono text-sm text-muted-foreground">{caption}</p>}
      </div>
      {/* The track has 16px of inset on each side so the train never leaves the card. */}
      <div
        role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        className="relative mx-4 mt-5 h-8"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-border" />
        <div className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
        <span className="absolute left-0 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary bg-station" />
        <span className={`absolute right-0 top-1/2 h-4 w-4 translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] ${pct >= 100 ? "border-primary bg-primary" : "border-foreground bg-station"}`} />
        <span
          className="absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-card transition-[left] duration-500 motion-reduce:transition-none"
          style={{ left: `${pct}%` }}
        >
          <TrainIcon size={16} />
        </span>
      </div>
      <div className="mt-3 flex justify-between gap-4 text-sm font-bold text-foreground">
        <span>{start}</span>
        <span className="text-right">{end}</span>
      </div>
    </div>
  );
}
