import { WarningIcon } from "@/components/transit/icons";
import React, { ReactNode } from "react";

interface State {
  hasError: boolean;
}

// Last-resort fallback for render errors. Never shows the error or stack trace.
export default class ErrorBoundary extends React.Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-card text-card-foreground border border-border rounded-lg p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 rounded-md border-2 border-primary text-primary flex items-center justify-center mx-auto mb-4"><WarningIcon size={26} /></div>
          <h1 className="font-display font-700 text-lg text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6">An unexpected error occurred. Reloading the page usually fixes it.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 font-display font-600 rounded-full min-h-11 px-5 text-sm bg-primary text-primary-foreground hover:opacity-90"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
