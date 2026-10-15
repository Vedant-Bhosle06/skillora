import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";

const navLinks = [
  { label: "Dashboard",  to: "/dashboard" },
  { label: "Graph",      to: "/graph" },
  { label: "Alternatives", to: "/alternatives" },
  { label: "Progress",   to: "/progress" },
  { label: "Admin",      to: "/admin" },
];

export default function Navbar() {
  const { isLoggedIn, setLoggedIn, isAdmin } = useApp();
  const { darkMode, toggleDark } = useTheme();
  const { showToast } = useToast();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const filteredLinks = navLinks.filter(l => l.to !== "/admin" || isAdmin);

  function handleLogout() {
    setLoggedIn(false);
    showToast("Signed out successfully", "success");
    navigate("/");
    setAvatarOpen(false);
  }

  return (
    <nav className="sticky top-0 z-40 h-14 bg-card/90 backdrop-blur border-b border-border flex items-center px-4 md:px-6 gap-4">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="4" r="2" fill="white" />
            <circle cx="3" cy="12" r="2" fill="white" opacity=".7" />
            <circle cx="13" cy="12" r="2" fill="white" opacity=".7" />
            <line x1="8" y1="6" x2="3" y2="10" stroke="white" strokeWidth="1.5" />
            <line x1="8" y1="6" x2="13" y2="10" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <span className="font-display font-800 text-base text-foreground tracking-tight">SKILLORA</span>
      </Link>

      {/* Desktop nav */}
      {isLoggedIn && (
        <div className="hidden md:flex items-center gap-1 flex-1">
          {filteredLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-lg text-sm font-500 transition-colors ${
                pathname.startsWith(l.to)
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDark}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? "☀" : "☽"}
        </button>

        {isLoggedIn ? (
          <div className="relative">
            <button
              onClick={() => setAvatarOpen(o => !o)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-display font-700"
            >
              A
            </button>
            {avatarOpen && (
              <>
                <div className="fixed inset-0" onClick={() => setAvatarOpen(false)} />
                <div className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-lg w-52 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-display font-600 text-sm text-foreground">Alex Thornton</p>
                    <p className="text-xs text-muted-foreground">alex@example.com</p>
                  </div>
                  <Link to="/settings" onClick={() => setAvatarOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    ⚙ Settings
                  </Link>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-muted transition-colors">
                    ↩ Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link to="/auth" className="px-3 py-1.5 text-sm font-500 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            Sign in
          </Link>
        )}

        {/* Mobile hamburger */}
        {isLoggedIn && (
          <button onClick={() => setMenuOpen(o => !o)} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-foreground">
            ☰
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && isLoggedIn && (
        <div className="absolute top-14 left-0 right-0 bg-card border-b border-border shadow-lg p-3 flex flex-col gap-1 md:hidden z-40">
          {filteredLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2 rounded-lg text-sm font-500 transition-colors ${
                pathname.startsWith(l.to)
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
