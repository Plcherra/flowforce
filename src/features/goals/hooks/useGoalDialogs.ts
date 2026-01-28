import { useCallback, useState } from "react";
import type { Goal } from "@/hooks/useGoals";

export interface GoalSuggestion {
  title: string;
  description: string;
}

interface GoalDialogOptions {
  suggestion?: GoalSuggestion | null;
}

export function useGoalDialogs() {
  const [isOpen, setOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [suggestion, setSuggestion] = useState<GoalSuggestion | null>(null);

  const open = useCallback(
    (goal?: Goal | null, options?: GoalDialogOptions) => {
      setSelectedGoal(goal ?? null);
      setSuggestion(options?.suggestion ?? null);
      setOpen(true);
    },
    [],
  );

  const close = useCallback(() => {
    setOpen(false);
    setSelectedGoal(null);
    setSuggestion(null);
  }, []);

  return {
    isOpen,
    selectedGoal,
    suggestion,
    open,
    close,
  };
}

export type GoalDialogs = ReturnType<typeof useGoalDialogs>;
