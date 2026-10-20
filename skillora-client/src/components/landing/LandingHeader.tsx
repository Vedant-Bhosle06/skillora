import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Logo from "@/components/Logo";
import { MoonIcon, SunIcon } from "@/components/transit/icons";
import { usePlanTarget } from "./PlanCta";
import { PILL } from "./data";

const SECTIONS = [["Your line", "line"], ["From here", "from-here"], ["Status", "status"], ["Destinations", "destinations"]] as const;

/** Smooth-scroll to a section without touching the router's history. */
function jump(e: React.MouseEvent, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/** The landing's header: the same 56px bar as the app Navbar, with section links and the CTAs. */
export default function LandingHeader() {
  const { status, user } = useAuth();
  const signedIn = status === "authenticated" && user !== null;
  const { darkMode, toggleDark } = useTheme();
  const plan = usePlanTarget();
  return (
    <header className="sticky top-0 z-40 h-14 border-b-2 border-border bg-background">
      <nav className="flex h-full items-center gap-3 px-4 md:px-8" aria-label="Main">
        <Link to="/" aria-label="SKILLORA home" onClick={e => jump(e, "line")} className="flex min-h-11 shrink-0 items-center rounded-md">
          <Logo variant="mark" wordmark size={26} wordmarkClassName="hidden min-[440px]:inline text-[17px]" />
        </Link>
        <div className="ml-4 hidden items-stretch gap-1 md:flex">
          {SECTIONS.map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={e => jump(e, id)} className="flex min-h-11 items-center rounded-md px-3 text-[15px] font-700 text-muted-foreground hover:text-foreground">
              {label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            onClick={toggleDark}
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          {!signedIn && (
            <Link to="/login" className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 text-[15px] font-700 text-foreground hover:bg-muted sm:px-4">
              Sign in
            </Link>
          )}
          <Link to={plan} className={`${PILL} whitespace-nowrap bg-primary px-4 text-[14px] text-primary-foreground hover:opacity-90 sm:px-5 sm:text-[15px]`}>
            Plan my journey
          </Link>
        </div>
      </nav>
    </header>
  );
}
