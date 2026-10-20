import React, { ReactNode } from "react";

/** A line-colour tag: the pill that names a line or a status. */
export default function Roundel({ children, color = "var(--line-route)", className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={`inline-flex h-6 min-w-8 items-center justify-center rounded-full px-2.5 text-xs font-extrabold text-white dark:text-[#0e1013] ${className}`}
      style={{ background: color }}
    >
      {children}
    </span>
  );
}
