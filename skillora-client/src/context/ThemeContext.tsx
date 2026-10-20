import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";

const THEME_KEY = "skillora.theme";
const THEME_SWITCH_MS = 320; // a little longer than --duration-base

interface ThemeContextValue {
  darkMode: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue>(null!);

function initialDarkMode(): boolean {
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "dark") return true;
    if (saved === "light") return false;
  } catch {
    // storage unavailable: fall through to the system preference
  }
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

// The only owner of the `dark` class on <html>.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(initialDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const switchTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(switchTimer.current), []);

  const toggleDark = useCallback(() => {
    // Animate colours only while switching (see .theme-switching in index.css).
    const root = document.documentElement;
    root.classList.add("theme-switching");
    window.clearTimeout(switchTimer.current);
    switchTimer.current = window.setTimeout(() => root.classList.remove("theme-switching"), THEME_SWITCH_MS);
    setDarkMode(d => {
      const next = !d;
      try {
        window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        // ignore: the choice just won't persist
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
