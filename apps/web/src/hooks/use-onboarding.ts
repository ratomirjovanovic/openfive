"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/providers/context-provider";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  completed: boolean;
}

const STORAGE_KEY = "openfive_onboarding";

interface OnboardingState {
  completedSteps: string[];
  dismissed: boolean;
}

function loadState(): OnboardingState {
  if (typeof window === "undefined") return { completedSteps: [], dismissed: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedSteps: [], dismissed: false };
}

function saveState(state: OnboardingState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useOnboarding() {
  const { currentOrg, currentProject, currentEnv } = useAppContext();
  const [state, setState] = useState<OnboardingState>(loadState);

  useEffect(() => {
    setState(loadState());
  }, []);

  const steps: OnboardingStep[] = [
    {
      id: "create_org",
      title: "Create organization",
      description: "Set up your first organization to start collaborating.",
      href: "/settings/general",
      completed: state.completedSteps.includes("create_org") || !!currentOrg,
    },
    {
      id: "create_project",
      title: "Create a project",
      description: "Projects group related environments and routes.",
      href: "/settings/general",
      completed: state.completedSteps.includes("create_project") || !!currentProject,
    },
    {
      id: "create_env",
      title: "Create an environment",
      description: "Environments (production, staging, dev) isolate your configurations.",
      href: "/settings/general",
      completed: state.completedSteps.includes("create_env") || !!currentEnv,
    },
    {
      id: "connect_provider",
      title: "Connect a provider",
      description: "Add your OpenRouter API key or connect to a local Ollama instance.",
      href: "/providers",
      completed: state.completedSteps.includes("connect_provider"),
    },
    {
      id: "create_route",
      title: "Create your first route",
      description: "Routes define which models to use and how to score them.",
      href: "/routes",
      completed: state.completedSteps.includes("create_route"),
    },
    {
      id: "generate_key",
      title: "Generate an API key",
      description: "Create a key to authenticate gateway requests.",
      href: "/settings/api-keys",
      completed: state.completedSteps.includes("generate_key"),
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allComplete = completedCount === steps.length;
  const progress = Math.round((completedCount / steps.length) * 100);

  const completeStep = useCallback(
    (stepId: string) => {
      const next = {
        ...state,
        completedSteps: [...new Set([...state.completedSteps, stepId])],
      };
      setState(next);
      saveState(next);
    },
    [state]
  );

  const dismiss = useCallback(() => {
    const next = { ...state, dismissed: true };
    setState(next);
    saveState(next);
  }, [state]);

  const showChecklist = !state.dismissed && !allComplete;

  return { steps, completedCount, allComplete, progress, showChecklist, completeStep, dismiss };
}
