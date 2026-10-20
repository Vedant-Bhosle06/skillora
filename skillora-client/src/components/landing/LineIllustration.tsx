import React from "react";
import { ALT_PATH, ALT_STOPS, LINE_PATH, STOPS } from "./data";

/** The learning line drawn still: your route in signal red with its stations, and the alternative dotted. */
export default function LineIllustration({ className = "", showAlt = true }: { className?: string; showAlt?: boolean }) {
  return (
    <svg viewBox="0 3 32 31" className={className} role="img" aria-label="A metro line from your starting skills to your target role, with an alternative route dotted below">
      {showAlt && <path d={ALT_PATH} fill="none" stroke="var(--line-route)" strokeWidth={6} strokeDasharray="1 11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
      <path d={LINE_PATH} fill="none" stroke="var(--casing)" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={LINE_PATH} fill="none" stroke="var(--border)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={LINE_PATH} fill="none" stroke="var(--line-route)" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {STOPS.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.kind === "stop" ? 0.62 : 0.85} fill="var(--station)" stroke="var(--foreground)" strokeWidth={s.kind === "stop" ? 3 : 5} vectorEffect="non-scaling-stroke" />
      ))}
      {showAlt && ALT_STOPS.map(s => <circle key={s.name} cx={s.x} cy={s.y} r={0.55} fill="var(--station)" stroke="var(--foreground)" strokeWidth={3} vectorEffect="non-scaling-stroke" />)}
    </svg>
  );
}
