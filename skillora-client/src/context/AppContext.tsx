import React, { createContext, useContext, useState, ReactNode } from "react";

// Temporary mock state for pages that are not migrated to the API yet.
// Auth lives in AuthContext and theme in ThemeContext.
interface AppContextValue {
  currentRole: string;
  setCurrentRole: (id: string) => void;
  selectedPath: string;
  setSelectedPath: (id: string) => void;
}

const AppContext = createContext<AppContextValue>(null!);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState("mle");
  const [selectedPath, setSelectedPath] = useState("mle-primary");

  return (
    <AppContext.Provider value={{
      currentRole, setCurrentRole,
      selectedPath, setSelectedPath,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
