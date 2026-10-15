import React, { ReactNode, useEffect } from "react";
import { useToast } from "@/context/ToastContext";
import type { NodeStatus, Proficiency } from "@/data/mock";

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center gap-2 font-display font-600 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants = {
    primary:   "bg-primary text-primary-foreground hover:opacity-90 active:scale-95 shadow-sm",
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
  const labels: Record<NodeStatus, string> = { completed: "Completed", "in-progress": "In Progress", locked: "Locked", unlocked: "Unlocked" };
  const icons: Record<NodeStatus, string> = { completed: "✓", "in-progress": "◉", locked: "🔒", unlocked: "◎" };
  return <Badge variant={status}>{icons[status]} {labels[status]}</Badge>;
}

export function ProficiencyBadge({ level }: { level: Proficiency }) {
  return <Badge variant={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>;
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = "", hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-card text-card-foreground border border-border rounded-xl shadow-sm ${hover ? "hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" : ""} ${className}`}
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
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${className}`}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-700 text-lg text-foreground">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
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

export function Input({ label, error, hint, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-500 text-foreground">{label}</label>}
      <input
        className={`px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground transition-all ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
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
