"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Organization, Project, Environment } from "@openfive/shared";

interface AppContextType {
  currentOrg: Organization | null;
  currentProject: Project | null;
  currentEnv: Environment | null;
  setCurrentOrg: (org: Organization | null) => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentEnv: (env: Environment | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function ContextProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [currentEnv, setCurrentEnv] = useState<Environment | null>(null);

  const setCurrentProject = useCallback((project: Project | null) => {
    setCurrentProjectState(project);
    setCurrentEnv(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentOrg,
        currentProject,
        currentEnv,
        setCurrentOrg,
        setCurrentProject,
        setCurrentEnv,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within a ContextProvider");
  }
  return context;
}
