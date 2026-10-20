import React from "react";
import { categoryLabel } from "@/lib/format";
import { lineFor } from "@/components/landing/data";

/** A category tag: a dot in the line colour for that kind of skill, then the name in ink. */
export default function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-bold text-foreground">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: lineFor(category) }} aria-hidden="true" />
      {categoryLabel(category)}
    </span>
  );
}
