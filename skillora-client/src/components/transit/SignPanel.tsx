import React, { ReactNode } from "react";

/** A flat sign panel. `inverse` is the dark terminus sign; `rule` adds a top rule in a line colour. */
export default function SignPanel({ children, className = "", inverse = false, rule, as: Tag = "div" }: {
  children: ReactNode; className?: string; inverse?: boolean; rule?: string; as?: "div" | "section" | "li" | "article";
}) {
  return (
    <Tag
      className={`rounded-md border ${inverse ? "border-foreground bg-foreground text-background" : "border-border bg-card text-card-foreground"} ${className}`}
      style={rule ? { borderTopColor: rule, borderTopWidth: 4 } : undefined}
    >
      {children}
    </Tag>
  );
}
