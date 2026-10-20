import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/auth/AuthContext";
import { RequireAdmin, RequireAuth, RequireTargetRole } from "@/auth/guards";
import { queryClient } from "@/lib/queryClient";
import { PageLoader, ToastContainer } from "@/components/ui";
import ErrorBoundary from "@/components/ErrorBoundary";
import MotionProvider from "@/components/MotionProvider";
import PageTransition from "@/components/PageTransition";
import { useRouteScroll } from "@/hooks/useRouteScroll";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MoonIcon, SunIcon } from "@/components/transit/icons";

import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import OnboardingSkills from "@/pages/OnboardingSkills";
import OnboardingRole from "@/pages/OnboardingRole";
import Dashboard from "@/pages/Dashboard";
const GraphExplorer = lazy(() => import("@/pages/GraphExplorer"));
const Alternatives = lazy(() => import("@/pages/Alternatives"));
const Progress = lazy(() => import("@/pages/Progress"));
const Settings = lazy(() => import("@/pages/Settings"));
const Admin = lazy(() => import("@/pages/Admin"));

const NO_NAV = ["/", "/login", "/register", "/onboarding/skills", "/onboarding/role"];

function AppShell() {
  const location = useLocation();
  const { pathname } = location;
  const showNav = !NO_NAV.includes(pathname);
  // New pages start at the top; back/forward returns to where the user was.
  const restoreScroll = useRouteScroll();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {showNav && <Navbar />}
      {/* The homepage carries its own theme toggle in its navigation. */}
      {!showNav && pathname !== "/" && (
        <div className="absolute top-3 right-4 z-50 flex items-center gap-2">
          <NavbarMinimal />
        </div>
      )}
      {/* One keyed wrapper per path: the old page slides out before the new one enters. */}
      <div className="flex-1">
      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={pathname} onMount={restoreScroll}>
          <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/"                        element={<Landing />} />
            <Route path="/login"                   element={<Auth mode="login" />} />
            <Route path="/register"                element={<Auth mode="register" />} />
            <Route path="/auth"                    element={<Navigate to="/login" replace />} />
            <Route path="/onboarding/skills"       element={<RequireAuth><OnboardingSkills /></RequireAuth>} />
            <Route path="/onboarding/role"         element={<RequireAuth><OnboardingRole /></RequireAuth>} />
            <Route path="/dashboard"               element={<RequireAuth><RequireTargetRole><Dashboard /></RequireTargetRole></RequireAuth>} />
            <Route path="/dashboard/alternatives"  element={<RequireAuth><RequireTargetRole><Alternatives /></RequireTargetRole></RequireAuth>} />
            <Route path="/alternatives"            element={<Navigate to="/dashboard/alternatives" replace />} />
            <Route path="/progress"                element={<RequireAuth><RequireTargetRole><Progress /></RequireTargetRole></RequireAuth>} />
            <Route path="/graph"                   element={<RequireAuth><GraphExplorer /></RequireAuth>} />
            <Route path="/settings"                element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/admin"                   element={<RequireAuth><RequireAdmin><Admin /></RequireAdmin></RequireAuth>} />
            <Route path="*"                        element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </PageTransition>
      </AnimatePresence>
      </div>
      {/* The graph is a full-height tool; auth and onboarding are focused flows. */}
      {showNav && pathname !== "/graph" && <Footer />}
      <ToastContainer />
    </div>
  );
}

function NavbarMinimal() {
  const { darkMode, toggleDark } = useTheme();
  return (
    <button
      onClick={toggleDark}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="w-11 h-11 flex items-center justify-center rounded-full bg-card border-2 border-border text-foreground hover:border-foreground"
    >
      {darkMode ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MotionProvider>
            <ToastProvider>
              <BrowserRouter>
                <AuthProvider>
                  <AppShell />
                </AuthProvider>
              </BrowserRouter>
            </ToastProvider>
          </MotionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
