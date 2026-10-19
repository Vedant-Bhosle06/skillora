import React, { ReactNode, useEffect, useId, useRef } from "react";
import { AnimatePresence, m } from "motion/react";
import { useToast } from "@/context/ToastContext";
import { fadeIn, scaleIn } from "@/lib/motion";
import type { NodeStatus, Proficiency } from "@/lib/types";

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  // Press feedback (scale) on every variant; the primary button also lifts and glows on hover.
  // Movement is dropped for users who prefer reduced motion.
  const base = "inline-flex items-center gap-2 font-display font-600 rounded-md transition-[color,background-color,border-color,box-shadow,opacity,translate,scale] duration-(--duration-fast) ease-out-quint active:scale-[0.97] motion-reduce:translate-none motion-reduce:scale-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary:   "bg-primary text-primary-foreground shadow-sm hover:shadow-glow hover:-translate-y-px active:translate-y-0",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
    ghost:     "bg-transparent text-foreground hover:bg-muted border border-border",
    danger:    "bg-red-600 text-white hover:bg-red-700 shadow-sm",
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
  beginner:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  advanced:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  completed:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "in-progress":"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  locked:       "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  unlocked:     "bg-secondary text-secondary-foreground",
  demand:       "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  outline:      "border border-border text-muted-foreground bg-transparent",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-500 ${badgeVariants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: NodeStatus }) {
  const labels: Record<NodeStatus, string> = { completed: "Completed", "in-progress": "Up next", locked: "Locked", unlocked: "Available" };
  const icons: Record<NodeStatus, string> = { completed: "✓", "in-progress": "◉", locked: "🔒", unlocked: "◎" };
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
  return (
    <div
      onClick={onClick}
      {...interactive}
      className={`bg-card text-card-foreground border border-border rounded-xl shadow-sm ${hover ? "cursor-pointer transition-[translate,box-shadow,border-color] duration-(--duration-base) ease-out-quint hover:-translate-y-0.5 hover:shadow-glow hover:border-primary/40 motion-reduce:translate-none" : ""} ${onClick ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""} ${className}`}
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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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
            className={`relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${content.className}`}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 id={titleId} className="font-display font-700 text-lg text-foreground">{content.title}</h2>
              <button ref={closeRef} onClick={onClose} aria-label="Close dialog" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">✕</button>
            </div>
            <div ref={bodyRef} className="p-5">{content.children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts } = useToast();
  const icons: Record<string, string> = { success: "✓", error: "✕", info: "ℹ", warning: "⚠" };
  const colors: Record<string, string> = {
    success: "border-l-4 border-emerald-500",
    error:   "border-l-4 border-red-500",
    info:    "border-l-4 border-primary",
    warning: "border-l-4 border-amber-500",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`${t.exiting ? "toast-exit" : "toast-enter"} bg-card border border-border ${colors[t.type]} rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-72 max-w-sm`}>
          <span className="text-sm">{icons[t.type]}</span>
          <span className="text-sm text-foreground font-500">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Tile ─────────────────────────────────────────────────────────────────

export function StatTile({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-4 ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <p className={`text-xs font-mono uppercase tracking-wider mb-1 ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</p>
      <p className={`font-display font-800 text-2xl ${accent ? "text-primary-foreground" : "text-foreground"}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: { icon: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl mb-4">{icon}</div>
      <h3 className="font-display font-700 text-lg text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`h-2 bg-muted rounded-full overflow-hidden ${className}`}>
      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
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
      {hint && !error && <p id={`${fieldId}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${fieldId}-error`} className="text-xs text-red-500">{error}</p>}
    </>
  );
}

export function Input({ label, error, hint, className = "", id, ...props }: InputProps) {
  const { fieldId, describedBy } = useFieldIds(id, hint, error);
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={fieldId} className="text-sm font-500 text-foreground">{label}</label>}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground transition-all ${error ? "border-red-500" : ""} ${className}`}
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
      {label && <label htmlFor={fieldId} className="text-sm font-500 text-foreground">{label}</label>}
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all ${error ? "border-red-500" : ""} ${className}`}
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
      {label && <label htmlFor={fieldId} className="text-sm font-500 text-foreground">{label}</label>}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground transition-all ${error ? "border-red-500" : ""} ${className}`}
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

// ── Demand score bar ──────────────────────────────────────────────────────────

export function DemandBar({ score }: { score: number }) {
  const color = score >= 90 ? "bg-rose-500" : score >= 75 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{score}</span>
    </div>
  );
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
      <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-3xl mb-4">⚠</div>
      <h3 className="font-display font-700 text-lg text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">{message}</p>
      {onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────

export function ProgressRing({ value, size = 88, stroke = 8, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.round(clamped * 100);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className="stroke-primary transition-all duration-500"
          strokeDasharray={`${circumference * clamped} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-800 text-lg text-foreground">{pct}%</span>
        {label && <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
