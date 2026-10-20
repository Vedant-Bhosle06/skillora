import React, { ReactNode } from "react";

/** A toggle chip. Pressed state is exposed with aria-pressed and is never colour-only (ink fill + check). */
export default function StationChip({ pressed, onToggle, children, color, className = "", disabled }: {
  pressed: boolean; onToggle: () => void; children: ReactNode; color?: string; className?: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onToggle}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-bold transition-colors disabled:opacity-50 ${
        pressed ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground"
      } ${className}`}
    >
      {color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
      {children}
    </button>
  );
}
