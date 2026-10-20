import React from "react";

export default function Chevron({ open, onClick, label }: { open: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground`}
      aria-label={label ? `${open ? "Collapse" : "Expand"} ${label}` : open ? "Collapse" : "Expand"}
    >
      <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}>
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
