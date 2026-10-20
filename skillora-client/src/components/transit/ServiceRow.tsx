import React, { ReactNode } from "react";
import Roundel from "./Roundel";

/** A service-status row: a coloured tag and one plain sentence. Rows stack inside a <ul>. */
export default function ServiceRow({ tag, color = "var(--line-route)", children }: { tag: string; color?: string; children: ReactNode }) {
  return (
    <li className="grid gap-2 py-4 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-4">
      <Roundel color={color} className="w-max">{tag}</Roundel>
      <p className="max-w-3xl text-base leading-relaxed text-foreground">{children}</p>
    </li>
  );
}

/** Wraps ServiceRow items with the ruled list look. */
export function ServiceList({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <ul className={`divide-y-2 divide-border border-y-2 border-border ${className}`}>{children}</ul>;
}
