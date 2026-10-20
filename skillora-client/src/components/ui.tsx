import React, { ReactNode, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { useToast, type Toast } from "@/context/ToastContext";
import { fadeIn, scaleIn } from "@/lib/motion";
import type { NodeStatus, Proficiency } from "@/lib/types";
import { CheckIcon, CloseIcon, InfoIcon, LockIcon, StationIcon, TrainIcon, WarningIcon } from "@/components/transit/icons";

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  // Pills with a 44px minimum target. Press feedback is a small scale, dropped for reduced motion.
  const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-display font-700 transition-[color,background-color,border-color,opacity,scale] duration-(--duration-fast) ease-out-quint active:scale-[0.98] motion-reduce:scale-none disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-4 text-sm", md: "px-5 text-[15px]", lg: "px-7 text-base" };
  const variants = {
    primary:   "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
    ghost:     "bg-transparent text-foreground hover:bg-muted",
    danger:    "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "beginner" | "intermediate" | "advanced" | "completed" | "in-progress" | "locked" | "unlocked" | "demand" | "outline";
  className?: string;
}

const badgeVariants: Record<string, string> = {
  default:      "bg-muted text-muted-foreground",
  beginner:     "border border-line-web text-foreground",
  intermediate: "border border-line-design text-foreground",
  advanced:     "border border-line-alt text-foreground",
  completed:    "bg-primary text-primary-foreground",
  "in-progress":"border border-primary text-primary",
  locked:       "bg-muted text-muted-foreground",
  unlocked:     "border border-foreground text-foreground",
  demand:       "bg-muted text-foreground",
  outline:      "border border-border text-muted-foreground bg-transparent",
};

/** A small roundel pill. Colour is never the only signal: the text always says what it means. */
export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-700 ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: NodeStatus }) {
  const labels: Record<NodeStatus, string> = { completed: "Completed", "in-progress": "Up next", locked: "Locked", unlocked: "Available" };
  const icons: Record<NodeStatus, ReactNode> = {
    completed: <CheckIcon size={12} strokeWidth={2.4} />,
    "in-progress": <TrainIcon size={12} />,
    locked: <LockIcon size={12} />,
    unlocked: <StationIcon size={12} />,
  };
  return <Badge variant={status}>{icons[status]} {labels[status]}</Badge>;
}

export function ProficiencyBadge({ level }: { level: Proficiency }) {
  return <Badge variant={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>;
}

// ── Keyboard activation ───────────────────────────────────────────────────────

/** onKeyDown for non-button elements that act like buttons: Enter or Space runs fn. */
export function activateOnKey(fn: () => void) {
  return (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;   // let nested buttons handle their own keys
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  /** For selectable cards: exposed to screen readers as aria-pressed. */
  selected?: boolean;
}

export function Card({ children, className = "", hover = false, onClick, selected }: CardProps) {
  const interactive = onClick
    ? { role: "button", tabIndex: 0, onKeyDown: activateOnKey(onClick), "aria-pressed": selected }
    : {};
  // A flat sign panel: 1px border, and a signal-red top rule when selected.
  return (
    <div
      onClick={onClick}
      {...interactive}
      className={`bg-card text-card-foreground border rounded-lg ${selected ? "border-foreground shadow-[inset_0_4px_0_0_var(--primary)]" : "border-border"} ${hover ? "cursor-pointer transition-[border-color] duration-(--duration-base) ease-out-quint hover:border-foreground" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  const titleId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose]);

  // Focus the first field when the dialog opens (or the close button if it has none),
  // and give focus back to whatever opened it when it closes.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = bodyRef.current?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
    );
    (first ?? closeRef.current)?.focus();
    return () => opener?.focus?.();
  }, [open]);

  // Callers often clear the data behind a dialog in the same update that closes it. Keep showing
  // the last open content while the exit animation plays, so it doesn't flash empty.
  const shown = useRef({ title, children, className });
  if (open) shown.current = { title, children, className };
  const content = shown.current;

  return (
    <AnimatePresence>
      {open && (
        <div key="modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <m.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`relative bg-card border-2 border-foreground rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto ${content.className}`}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 id={titleId} className="font-display font-700 text-lg text-foreground">{content.title}</h2>
              <button ref={closeRef} onClick={onClose} aria-label="Close dialog" className="w-11 h-11 -m-2 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><CloseIcon size={18} /></button>
            </div>
            <div ref={bodyRef} className="p-5">{content.children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────

// Halo in the page colour keeps bare text legible over any content without drawing a box.
const TOAST_HALO = [
  "0 0 2px", "0 0 5px", "0 0 9px", "1px 0 0", "-1px 0 0", "0 1px 0", "0 -1px 0",
].map(o => `${o} var(--background)`).join(", ");

function ToastItem({ toast }: { toast: Toast }) {
  const { dismissToast } = useToast();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const remaining = useRef(toast.duration);
  const startedAt = useRef(0);

  // The timer runs only while the pointer and keyboard focus are elsewhere.
  useEffect(() => {
    if (paused || toast.exiting) return;
    startedAt.current = Date.now();
    const id = setTimeout(() => dismissToast(toast.id), remaining.current);
    return () => {
      clearTimeout(id);
      remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current));
    };
  }, [paused, toast.exiting, toast.id, dismissToast]);

  const subtle = toast.type === "success" || toast.type === "info";
  const panelAccent = toast.type === "error" ? "border-t-4 border-t-primary" : "border-t-4 border-t-line-design";
  const Icon = toast.type === "error" ? CloseIcon : WarningIcon;

  return (
    <div
      className={`${toast.exiting ? "toast-exit" : "toast-enter"} pointer-events-auto flex max-w-[min(32rem,calc(100vw-2rem))] items-center justify-center ${
        subtle ? "gap-1 text-foreground" : `gap-3 rounded-md border border-border bg-card px-4 py-2 ${panelAccent}`
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {!subtle && <Icon size={16} className={toast.type === "error" ? "shrink-0 text-primary" : "shrink-0 text-foreground"} />}
      <span
        className={`py-2 text-center text-[15px] font-bold ${toast.type === "error" ? "text-primary" : "text-foreground"}`}
        style={subtle ? { textShadow: TOAST_HALO } : undefined}
      >
        {toast.message}
      </span>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action!.onClick(); dismissToast(toast.id); }}
          className="min-h-11 shrink-0 px-3 text-[15px] font-bold text-foreground underline underline-offset-4"
          style={subtle ? { textShadow: TOAST_HALO } : undefined}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex w-max -translate-x-1/2 flex-col items-center gap-1"
    >
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  );
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

export function StatTile({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  // A board cell: sentence-case label above, big tabular number below.
  return (
    <div className={`rounded-md border p-4 ${accent ? "border-foreground bg-foreground text-background" : "border-border bg-card"}`}>
      <p className={`text-sm font-600 mb-1 ${accent ? "text-background/80" : "text-muted-foreground"}`}>{label}</p>
      <p className={`font-display font-800 text-3xl tabular-nums leading-tight ${accent ? "text-background" : "text-foreground"}`}>{value}</p>
      {sub && <p className={`text-sm mt-0.5 ${accent ? "text-background/80" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  // Pass an SVG icon. Plain-text glyphs from older callers are replaced by a station dot.
  const mark = icon && typeof icon !== "string" ? icon : icon === "🔒" ? <LockIcon size={28} /> : <StationIcon size={28} />;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-md border border-border bg-muted flex items-center justify-center text-foreground mb-4">{mark}</div>
      <h3 className="font-display font-700 text-lg text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  // A line with stop ticks: the filled part is the route travelled so far.
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      className={`relative h-3 flex items-center ${className}`}
    >
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-border" />
      <div className="absolute left-0 h-1.5 rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      {[0, 25, 50, 75, 100].map(t => (
        <span key={t} className={`absolute h-3 w-3 -translate-x-1/2 rounded-full border-2 ${pct >= t ? "border-primary" : "border-line-grey"} bg-station`} style={{ left: `${t}%` }} />
      ))}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/** Ids that tie a field to its label, hint and error text. */
function useFieldIds(id: string | undefined, hint?: string, error?: string) {
  const generated = useId();
  const fieldId = id ?? generated;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  return { fieldId, describedBy };
}

function FieldMessages({ fieldId, hint, error }: { fieldId: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && !error && <p id={`${fieldId}-hint`} className="text-sm text-muted-foreground">{hint}</p>}
      {error && <p id={`${fieldId}-error`} className="text-sm font-600 text-primary">{error}</p>}
    </>
  );
}

export function Input({ label, error, hint, className = "", id, ...props }: InputProps) {
  const { fieldId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={fieldId} className="text-sm font-600 text-foreground">{label}</label>}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`px-3 py-2 min-h-11 rounded-md border border-line-grey bg-card text-foreground text-[15px] placeholder:text-muted-foreground transition-colors ${error ? "!border-primary border-2" : ""} ${className}`}
        {...props}
      />
      <FieldMessages fieldId={fieldId} hint={hint} error={error} />
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Select({ label, error, hint, className = "", id, children, ...props }: SelectProps) {
  const { fieldId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={fieldId} className="text-sm font-600 text-foreground">{label}</label>}
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`px-3 py-2 min-h-11 rounded-md border border-line-grey bg-card text-foreground text-[15px] transition-colors ${error ? "!border-primary border-2" : ""} ${className}`}
        {...props}
      >
        {children}
      </select>
      <FieldMessages fieldId={fieldId} hint={hint} error={error} />
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", id, ...props }: TextareaProps) {
  const { fieldId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={fieldId} className="text-sm font-600 text-foreground">{label}</label>}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`px-3 py-2 min-h-11 rounded-md border border-line-grey bg-card text-foreground text-[15px] placeholder:text-muted-foreground transition-colors ${error ? "!border-primary border-2" : ""} ${className}`}
        {...props}
      />
      <FieldMessages fieldId={fieldId} hint={hint} error={error} />
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block w-5 h-5 rounded-full border-2 border-muted border-t-primary animate-spin ${className}`}
    />
  );
}

// ── Page Loader ───────────────────────────────────────────────────────────────

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Spinner className="w-8 h-8" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-md border-2 border-primary text-primary flex items-center justify-center mb-4"><WarningIcon size={28} /></div>
      <h3 className="font-display font-700 text-lg text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
