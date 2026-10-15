import React, { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useCurrentUser } from "@/auth/AuthContext";
import { Button, EmptyState, ErrorState, PageLoader } from "@/components/ui";
import { nextRouteFor } from "@/lib/redirect";

/** Signed-in users only; anonymous visitors go to /login and come back afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, error, retry } = useAuth();
  const { pathname } = useLocation();

  if (status === "loading") return <PageLoader label="Loading your session…" />;
  if (status === "error") {
    return (
      <ErrorState
        title="Couldn't load your account"
        message={error?.message ?? "Something went wrong."}
        onRetry={retry}
      />
    );
  }
  if (status === "anonymous") return <Navigate to="/login" state={{ from: pathname }} replace />;
  return <>{children}</>;
}

/** Use inside RequireAuth. Learners see an access notice instead of the page. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <EmptyState
          icon="🔒"
          title="Access Restricted"
          description="Admin panel is only available to administrators."
          action={<Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>}
        />
      </div>
    );
  }
  return <>{children}</>;
}

/** Use inside RequireAuth. Users without a target role finish onboarding first. */
export function RequireTargetRole({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  if (!user.targetRoleId) return <Navigate to={nextRouteFor(user)} replace />;
  return <>{children}</>;
}
