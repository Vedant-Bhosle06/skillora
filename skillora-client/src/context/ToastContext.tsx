import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** An underlined text button (for example Undo). A toast with an action stays for 8 seconds. */
  action?: ToastAction;
  /** Milliseconds before the toast fades; defaults to 3500, or 8000 with an action. */
  duration?: number;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration: number;
  exiting?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>(null!);

const FADE_MS = 200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Fade first, then remove, so the exit is not a hard cut.
  const dismissToast = useCallback((id: string) => {
    setToasts(t => t.map(x => (x.id === id ? { ...x, exiting: true } : x)));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), FADE_MS);
  }, []);

  // The timer lives in ToastItem so it can pause while the toast is hovered or focused.
  const showToast = useCallback((message: string, type: ToastType = "info", options?: ToastOptions) => {
    const id = Math.random().toString(36).slice(2);
    const duration = options?.duration ?? (options?.action ? 8000 : 3500);
    setToasts(t => [...t, { id, message, type, action: options?.action, duration }]);
    return id;
  }, []);

  const value = useMemo(() => ({ toasts, showToast, dismissToast }), [toasts, showToast, dismissToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
