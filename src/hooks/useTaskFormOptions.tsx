import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logger } from "@/utils/logger";

export interface TaskFormAssignee {
  id: string;
  first_name: string;
  last_name: string;
}

export interface TaskFormGoal {
  id: string;
  title: string;
  status: string;
  progress: number;
  target_completion_date: string | null;
}

export const useTaskFormOptions = (shouldFetch: boolean) => {
  const { user } = useAuth();
  const [assignees, setAssignees] = useState<TaskFormAssignee[]>([]);
  const [goals, setGoals] = useState<TaskFormGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      const companyId = profileData?.company_id ?? null;

      if (!companyId) {
        setAssignees([]);
        setGoals([]);
        setLoading(false);
        return;
      }

      let assigneeQuery = supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("employment_status", "active")
        .order("first_name", { ascending: true });

      let goalsQuery = supabase
        .from("goals")
        .select("id, title, status, progress, target_completion_date")
        .order("created_at", { ascending: false });

      assigneeQuery = assigneeQuery.eq("company_id", companyId);
      goalsQuery = goalsQuery.eq("company_id", companyId);

      const [assigneesResult, goalsResult] = await Promise.all([
        assigneeQuery,
        goalsQuery,
      ]);

      if (assigneesResult.error) throw assigneesResult.error;
      if (goalsResult.error) throw goalsResult.error;

      setAssignees((assigneesResult.data ?? []) as TaskFormAssignee[]);
      setGoals((goalsResult.data ?? []) as TaskFormGoal[]);
    } catch (fetchError) {
      logger.error("Error loading task form options", {
        error: fetchError,
        tags: ["error"],
      });
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load options",
      );
      setAssignees([]);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!shouldFetch || !user) return;
    fetchOptions();
  }, [shouldFetch, user, fetchOptions]);

  return {
    assignees,
    goals,
    loading,
    error,
    refetch: fetchOptions,
  };
};
