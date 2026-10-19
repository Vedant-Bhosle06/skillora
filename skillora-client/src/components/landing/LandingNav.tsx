import React from "react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/context/ThemeContext";

// Floating glass "island" navigation for the homepage, with the theme toggle.

const LINKS: [string, string][] = [["How it works", "#how"], ["Within reach", "#reach"], ["Roles", "#roles"]];

export default function LandingNav() {
  const { status } = useAuth();
  const { darkMode, toggleDark } = useTheme();
  const signedIn = status === "authenticated";
  return (
    <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-3 sm:top-5">
      <nav className="glass-pill flex w-full max-w-max items-center gap-1 rounded-full py-1.5 pl-4 pr-1.5" aria-label="Main">
        <Link to="/" aria-label="SKILLORA home" className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo variant="mark" wordmark size={24} wordmarkClassName="text-[15px]" />
        </Link>
        <div className="mx-3 hidden items-center gap-1 md:flex">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} className="rounded-full px-3.5 py-2 text-[13px] text-muted-foreground hover:text-foreground">{label}</a>
          ))}
        </div>
        <button
          onClick={toggleDark}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="ml-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground"
        >
          {darkMode ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.4" /><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          )}
        </button>
        <Link
          to={signedIn ? "/dashboard" : "/login"}
          className="ml-1 rounded-full bg-foreground/[0.08] px-4 py-2 text-[13px] font-semibold text-foreground ring-1 ring-foreground/10 hover:bg-foreground/[0.14]"
        >
          {signedIn ? "Dashboard" : "Sign in"}
        </Link>
      </nav>
    </header>
  );
}
