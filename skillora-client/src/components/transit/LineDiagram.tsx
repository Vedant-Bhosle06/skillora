import React, { ReactNode } from "react";
import { CheckIcon, LockIcon } from "./icons";

export type StopState = "done" | "current" | "next" | "locked";

export interface LineStop {
  key: string;
  label: ReactNode;
  /** Right-hand time, e.g. "4h". Shown in mono. */
  hours?: ReactNode;
  state: StopState;
  /** Optional second line (level change, rationale). */
  detail?: ReactNode;
  /** Optional trailing controls (e.g. a "Mark complete" button). */
  action?: ReactNode;
  onSelect?: () => void;
}

const STATE_TEXT: Record<StopState, string> = { done: "Done", current: "Up next", next: "Later", locked: "Locked" };

/** A vertical line of stops: station dot, line segment, label and hours. The core of the path views. */
export default function LineDiagram({ stops, color = "var(--line-route)", className = "", label = "Learning path" }: {
  stops: LineStop[]; color?: string; className?: string; label?: string;
}) {
  return (
    <ol className={className} aria-label={label}>
      {stops.map((s, i) => {
        const last = i === stops.length - 1;
        const filled = s.state === "done";
        const dim = s.state === "locked";
        const inner = (
          <>
            <span className="flex-1 min-w-0">
              <span className={`block text-base font-bold ${dim ? "text-muted-foreground" : "text-foreground"}`}>
                {s.label}
                <span className="sr-only"> ({STATE_TEXT[s.state]})</span>
              </span>
              {s.detail && <span className="mt-0.5 block text-sm text-muted-foreground">{s.detail}</span>}
            </span>
            {s.hours !== undefined && <span className="font-mono text-sm text-muted-foreground">{s.hours}</span>}
          </>
        );
        return (
          <li key={s.key} className="relative flex gap-4">
            {/* Rail: the segment to the next stop, then the station dot on top. */}
            <div className="relative flex w-6 shrink-0 justify-center" aria-hidden="true">
              {!last && <span className="absolute top-4 w-1.5 rounded-full" style={{ background: s.state === "done" ? color : "var(--border)", bottom: 0 }} />}
              <span
                className={`relative z-10 mt-1.5 flex h-5 w-5 items-center justify-center rounded-full border-[3px] ${s.state === "current" ? "ring-4 ring-foreground/15" : ""}`}
                style={{ borderColor: dim ? "var(--line-grey)" : s.state === "next" ? "var(--foreground)" : color, background: filled ? color : "var(--station)" }}
              >
                {filled && <CheckIcon size={11} className="text-white dark:text-[#0e1013]" strokeWidth={2.6} />}
                {dim && <LockIcon size={9} className="text-muted-foreground" />}
              </span>
            </div>
            <div className={`flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-2 ${last ? "pb-0" : "pb-6"}`}>
              {s.onSelect ? (
                <button type="button" onClick={s.onSelect} className="flex min-h-11 min-w-0 flex-1 basis-56 items-start gap-4 rounded-md text-left hover:bg-muted/60">{inner}</button>
              ) : (
                <div className="flex min-w-0 flex-1 basis-56 items-start gap-4">{inner}</div>
              )}
              {s.action}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
