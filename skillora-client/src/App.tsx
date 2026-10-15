import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ToastProvider } from "@/context/ToastContext";
import { ToastContainer } from "@/components/ui";
import Navbar from "@/components/Navbar";

import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import OnboardingSkills from "@/pages/OnboardingSkills";
import OnboardingRole from "@/pages/OnboardingRole";
import Dashboard from "@/pages/Dashboard";
import GraphExplorer from "@/pages/GraphExplorer";
import Alternatives from "@/pages/Alternatives";
import Progress from "@/pages/Progress";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";

const NO_NAV = ["/", "/auth", "/onboarding/skills", "/onboarding/role"];

function AppShell() {
  const { pathname } = useLocation();
  const showNav = !NO_NAV.includes(pathname);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showNav && <Navbar />}
      {!showNav && (
        <div className="absolute top-3 right-4 z-50 flex items-center gap-2">
          <NavbarMinimal />
        </div>
      )}
      <Routes>
        <Route path="/"                   element={<Landing />} />
        <Route path="/auth"               element={<Auth />} />
        <Route path="/onboarding/skills"  element={<OnboardingSkills />} />
        <Route path="/onboarding/role"    element={<OnboardingRole />} />
        <Route path="/dashboard"          element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/graph"              element={<RequireAuth><GraphExplorer /></RequireAuth>} />
        <Route path="/alternatives"       element={<RequireAuth><Alternatives /></RequireAuth>} />
        <Route path="/progress"           element={<RequireAuth><Progress /></RequireAuth>} />
        <Route path="/settings"           element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/admin"              element={<RequireAuth><Admin /></RequireAuth>} />
        <Route path="*"                   element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </div>
  );
}

function NavbarMinimal() {
  const { darkMode, toggleDark } = useTheme();
  return (
    <button
      onClick={toggleDark}
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-card border border-border shadow text-muted-foreground hover:text-foreground"
    >
      {darkMode ? "☀" : "☽"}
    </button>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useApp();
  const { pathname } = useLocation();
  if (!isLoggedIn) return <Navigate to="/auth" state={{ from: pathname }} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </ToastProvider>
      </AppProvider>
    </ThemeProvider>
  );
}
