import React, { ReactNode } from "react";

export interface BoardRow { key: string; color?: string; label: ReactNode; detail?: ReactNode }

/** A departure board: an inverse header row (title + count) over a ruled list. */
export default function DepartureBoard({ title, count, rows, empty, className = "", maxHeightClass = "max-h-[26rem]" }: {
  title: string; count?: ReactNode; rows: BoardRow[]; empty?: ReactNode; className?: string; maxHeightClass?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-md border border-border bg-card ${className}`} aria-live="polite">
      <div className="flex items-center justify-between bg-foreground px-5 py-3 text-background">
        <span className="text-[15px] font-extrabold">{title}</span>
        {count !== undefined && <span className="font-mono text-[13px]">{count}</span>}
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-base text-muted-foreground">{empty}</p>
      ) : (
        <ul className={`${maxHeightClass} divide-y divide-border overflow-auto`}>
          {rows.map(r => (
            <li key={r.key} className="flex items-center gap-4 px-5 py-3">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: r.color ?? "var(--line-grey)" }} aria-hidden="true" />
              <span className="flex-1 text-base font-bold">{r.label}</span>
              {r.detail && <span className="text-[13px] text-muted-foreground">{r.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
