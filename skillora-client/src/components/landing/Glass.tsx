import React, { ReactNode } from "react";
import { Link } from "react-router-dom";

// Homepage building blocks (Nocturne Glass). Colours come from the theme tokens in index.css.

/** Double-bezel glass: an outer tray holding an inner glass plate. */
export function Bezel({ children, className = "", core = "" }: { children: ReactNode; className?: string; core?: string }) {
  return (
    <div className={`glass-shell ${className}`}>
      <div className={`glass-core ${core}`}>{children}</div>
    </div>
  );
}

/** Wide, letter-spaced section label. */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`font-wide text-[10px] font-bold text-muted-foreground ${className}`}>{children}</p>;
}

const ARROW = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path d="M4 10 10 4M5 4h5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Pill button with its arrow nested in its own circle. `to` is an in-app route. */
export function PillLink({ to, children, ghost = false, className = "" }: { to: string; children: ReactNode; ghost?: boolean; className?: string }) {
  const isHash = to.startsWith("#");
  const cls = `group inline-flex items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-sm font-semibold transition-[translate,scale,background-color,box-shadow] duration-500 ease-out-expo active:scale-[0.98] motion-reduce:scale-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    ghost
      ? "bg-foreground/[0.05] text-foreground ring-1 ring-foreground/15 hover:bg-foreground/[0.09]"
      : "bg-foreground text-background hover:shadow-glow"
  } ${className}`;
  const inner = (
    <>
      {children}
      <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-[translate,scale] duration-500 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105 motion-reduce:translate-none ${ghost ? "bg-foreground/10" : "bg-background/15"}`}>
        {ARROW}
      </span>
    </>
  );
  return isHash ? <a href={to} className={cls}>{inner}</a> : <Link to={to} className={cls}>{inner}</Link>;
}
