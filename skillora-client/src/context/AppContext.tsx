import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AppContextValue {
  darkMode: boolean;
  toggleDark: () => void;
  isLoggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  onboardingDone: boolean;
  setOnboardingDone: (v: boolean) => void;
  currentRole: string;
  setCurrentRole: (id: string) => void;
  selectedPath: string;
  setSelectedPath: (id: string) => void;
  isAdmin: boolean;
}

const AppContext = createContext<AppContextValue>(null!);

export function AppProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [currentRole, setCurrentRole] = useState("mle");
  const [selectedPath, setSelectedPath] = useState("mle-primary");
  const isAdmin = true;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <AppContext.Provider value={{
      darkMode, toggleDark: () => setDarkMode(d => !d),
      isLoggedIn, setLoggedIn,
      onboardingDone, setOnboardingDone,
      currentRole, setCurrentRole,
      selectedPath, setSelectedPath,
      isAdmin,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
