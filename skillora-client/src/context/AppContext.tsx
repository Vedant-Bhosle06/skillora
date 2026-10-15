import React, { createContext, useContext, useState, ReactNode } from "react";

interface AppContextValue {
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
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [currentRole, setCurrentRole] = useState("mle");
  const [selectedPath, setSelectedPath] = useState("mle-primary");
  const isAdmin = true;

  return (
    <AppContext.Provider value={{
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
