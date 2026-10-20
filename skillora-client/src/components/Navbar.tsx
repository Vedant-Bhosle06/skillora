import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import Logo from "@/components/Logo";
import { AnimatePresence, m } from "motion/react";
import { menuReveal } from "@/lib/motion";
import { CloseIcon, MenuIcon, MoonIcon, SettingsIcon, SignOutIcon, SunIcon } from "@/components/transit/icons";

const navLinks = [
  { label: "Dashboard",  to: "/dashboard" },
  { label: "Graph",      to: "/graph" },
  { label: "Alternatives", to: "/dashboard/alternatives" },
  { label: "Progress",   to: "/progress" },
  { label: "Admin",      to: "/admin" },
];

// Dashboard is active only on its own page, so it doesn't light up on /dashboard/alternatives.
function isActive(pathname: string, to: string) {
  return to === "/dashboard" ? pathname === to : pathname.startsWith(to);
}

export default function Navbar() {
  const { status, user, isAdmin, logout } = useAuth();
  const signedIn = status === "authenticated" && user !== null;
  const { darkMode, toggleDark } = useTheme();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  const filteredLinks = navLinks.filter(l => l.to !== "/admin" || isAdmin);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    setAvatarOpen(false);
    // Leave the guarded page first, so RequireAuth doesn't bounce to /login when the session clears.
    navigate("/");
    await logout();
    setSigningOut(false);
    showToast("Signed out successfully", "success");
  }

  return (
    <nav className="sticky top-0 z-40 h-14 border-b-2 border-border bg-background flex items-center px-4 md:px-8 gap-3" aria-label="Main">
      {/* Logo */}
      <Link to="/" aria-label="SKILLORA home" className="flex min-h-11 items-center shrink-0 rounded-md">
        <Logo variant="mark" wordmark size={26} wordmarkClassName="text-[17px]" />
      </Link>

      {/* Desktop nav */}
      {signedIn && (
        <div className="hidden md:flex items-stretch gap-1 flex-1 ml-4 h-full">
          {filteredLinks.map(l => {
            const active = isActive(pathname, l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center px-3 text-[15px] font-700 ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {l.label}
                {/* The platform bar under the active line. */}
                {active && <span className="absolute inset-x-2 -bottom-0.5 h-1 rounded-full bg-primary" aria-hidden="true" />}
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1 ml-auto">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted text-foreground transition-colors"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>

        {signedIn ? (
          <div className="relative">
            <button
              onClick={() => setAvatarOpen(o => !o)}
              className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-display font-800"
              aria-label="Account menu"
              aria-expanded={avatarOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                {user.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
            </button>
            {avatarOpen && <div className="fixed inset-0" onClick={() => setAvatarOpen(false)} />}
            <AnimatePresence>
              {avatarOpen && (
                <m.div
                  key="avatar-menu"
                  className="absolute right-0 top-12 bg-card border-2 border-foreground rounded-md w-56 overflow-hidden z-50 origin-top-right"
                  variants={menuReveal}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-display font-700 text-sm text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Link to="/settings" onClick={() => setAvatarOpen(false)} className="flex min-h-11 items-center gap-2 px-4 text-sm font-600 text-foreground hover:bg-muted transition-colors">
                    <SettingsIcon size={16} /> Settings
                  </Link>
                  <button onClick={handleLogout} disabled={signingOut} className="w-full min-h-11 flex items-center gap-2 px-4 text-sm font-600 text-primary hover:bg-muted transition-colors">
                    <SignOutIcon size={16} /> Sign out
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        ) : status === "anonymous" ? (
          // Still holding a token while /users/me loads or the API is unreachable: not signed out.
          <Link to="/login" className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[15px] font-800 text-primary-foreground hover:opacity-90">
            Sign in
          </Link>
        ) : null}

        {/* Mobile hamburger */}
        {signedIn && (
          <button onClick={() => setMenuOpen(o => !o)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} className="md:hidden w-11 h-11 flex items-center justify-center rounded-full hover:bg-muted text-foreground">
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        )}
      </div>

      {/* Mobile menu: a full-width sheet of 44px rows */}
      <AnimatePresence>
        {menuOpen && signedIn && (
          <m.div
            key="mobile-menu"
            className="absolute top-14 left-0 right-0 bg-background border-b-2 border-border flex flex-col md:hidden z-40 origin-top"
            variants={menuReveal}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {filteredLinks.map(l => {
              const active = isActive(pathname, l.to);
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center border-l-4 px-5 text-base font-700 ${
                    active ? "border-primary text-foreground bg-muted" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
