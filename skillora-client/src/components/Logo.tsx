import React, { useId } from "react";

// SKILLORA mark: an ascending learning path that links four skill nodes. Read top-down it
// forms an "S"; read bottom-up it climbs from a starting skill to the target role (the haloed
// node). Geometry is on a 32×32 grid. public/favicon.svg uses the same geometry; keep in sync.
export const LOGO_PATH = "M8,26.5 C16.7,24.4 22.05,27.95 22.5,23 C22.95,18.05 9.05,15.1 9.5,10 C9.95,4.9 15.3,8.4 24,6";
const STEP_NODES = [
  { cx: 8, cy: 26.5, r: 3 },     // starting skill
  { cx: 22.5, cy: 23, r: 2.9 },
  { cx: 9.5, cy: 10, r: 2.9 },
];
const GOAL = { cx: 24, cy: 6, r: 3.3, halo: 4.8 };

type LogoProps = {
  /** "mark": gradient strokes, adapts to the theme. "tile": white mark on a gradient square (any background). */
  variant?: "mark" | "tile";
  /** Show the SKILLORA wordmark next to the mark. */
  wordmark?: boolean;
  /** Mark size in px. Below 20px the goal halo is dropped to keep the mark crisp. */
  size?: number;
  className?: string;
  wordmarkClassName?: string;
  /** Hide from assistive tech when visible text already names the brand (e.g. an <h1>). */
  decorative?: boolean;
};

export default function Logo({
  variant = "mark",
  wordmark = false,
  size = 28,
  className = "",
  wordmarkClassName = "text-base",
  decorative = false,
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 shrink-0 ${className}`}>
      <LogoMark variant={variant} size={size} labelled={!wordmark && !decorative} />
      {wordmark && (
        <span className={`font-display font-extrabold tracking-tight text-foreground leading-none ${wordmarkClassName}`}>
          SKILLORA
        </span>
      )}
    </span>
  );
}

function LogoMark({ variant, size, labelled }: { variant: "mark" | "tile"; size: number; labelled: boolean }) {
  // Unique per instance: several logos can be on screen, and a hidden duplicate id would break the gradient.
  const id = useId().replace(/:/g, "");
  const gradientId = `skillora-logo-${id}`;
  const detailed = size >= 20;
  const a11y = labelled ? { role: "img", "aria-label": "SKILLORA" } : { "aria-hidden": true };

  if (variant === "tile") {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...a11y}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" style={{ stopColor: "var(--logo-tile-from)" }} />
            <stop offset="1" style={{ stopColor: "var(--logo-tile-to)" }} />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
        {/* Scaled in a little so the mark has breathing room inside the tile. */}
        <g transform="translate(16 16) scale(0.78) translate(-16 -16)" fill="#FFFFFF">
          <path d={LOGO_PATH} stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" fill="none" />
          {STEP_NODES.map(n => <circle key={n.cx} cx={n.cx} cy={n.cy} r={n.r} />)}
          {detailed && <circle cx={GOAL.cx} cy={GOAL.cy} r={GOAL.halo} stroke="#FFFFFF" strokeWidth={1.3} strokeOpacity={0.55} fill="none" />}
          <circle cx={GOAL.cx} cy={GOAL.cy} r={GOAL.r} />
        </g>
      </svg>
    );
  }

  const paint = `url(#${gradientId})`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" {...a11y}>
      <defs>
        <linearGradient id={gradientId} x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: "var(--logo-from)" }} />
          <stop offset="1" style={{ stopColor: "var(--logo-to)" }} />
        </linearGradient>
      </defs>
      <path d={LOGO_PATH} stroke={paint} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      {STEP_NODES.map(n => <circle key={n.cx} cx={n.cx} cy={n.cy} r={n.r} fill={paint} />)}
      {detailed && <circle cx={GOAL.cx} cy={GOAL.cy} r={GOAL.halo} stroke={paint} strokeWidth={1.3} strokeOpacity={0.5} fill="none" />}
      <circle cx={GOAL.cx} cy={GOAL.cy} r={GOAL.r} fill={paint} />
    </svg>
  );
}
