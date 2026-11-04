import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logger } from "@/utils/logger";

export interface TaskFormAssignee {
  id: string;
  first_name: string;
  last_name: string;
  level: number;
}

export interface TaskFormGoal {
  id: string;
  title: string;
  status: string;
  progress: number;
  target_completion_date: string | null;
}

export interface TaskFormChoice {
  id: string;
  name: string;
}

export const useTaskFormOptions = (shouldFetch: boolean) => {
  const { user } = useAuth();
  const [assignees, setAssignees] = useState<TaskFormAssignee[]>([]);
  const [goals, setGoals] = useState<TaskFormGoal[]>([]);
  const [positions, setPositions] = useState<TaskFormChoice[]>([]);
  const [roles, setRoles] = useState<TaskFormChoice[]>([]);
  const [departments, setDepartments] = useState<TaskFormChoice[]>([]);
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
        setPositions([]);
        setRoles([]);
        setDepartments([]);
        setLoading(false);
        return;
      }

      let assigneeQuery = supabase
        .from("profiles")
        .select("id, first_name, last_name, role_id")
        .eq("employment_status", "active")
        .order("first_name", { ascending: true });

      let goalsQuery = supabase
        .from("goals")
        .select("id, title, status, progress, target_completion_date")
        .order("created_at", { ascending: false });

      assigneeQuery = assigneeQuery.eq("company_id", companyId);
      goalsQuery = goalsQuery.eq("company_id", companyId);

      const [assigneesResult, goalsResult, rolesResult, positionsResult, departmentsResult] =
        await Promise.all([
        assigneeQuery,
        goalsQuery,
        supabase
          .from("company_roles")
          .select("id, name, hierarchy_level")
          .eq("company_id", companyId)
          .order("hierarchy_level", { ascending: true }),
        supabase
          .from("positions")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name", { ascending: true }),
        supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", companyId)
          .order("name", { ascending: true }),
      ]);

      if (assigneesResult.error) throw assigneesResult.error;
      if (goalsResult.error) throw goalsResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (positionsResult.error) throw positionsResult.error;
      if (departmentsResult.error) throw departmentsResult.error;

      const levels = new Map(
        (rolesResult.data ?? []).map((role) => [role.id, role.hierarchy_level ?? 1]),
      );
      setAssignees(
        (assigneesResult.data ?? []).map((person) => ({
          id: person.id,
          first_name: person.first_name,
          last_name: person.last_name,
          level: levels.get(person.role_id ?? "") ?? 1,
        })),
      );
      setGoals((goalsResult.data ?? []) as TaskFormGoal[]);
      setRoles(
        (rolesResult.data ?? []).map((role) => ({
          id: role.id,
          name: role.name ?? "",
        })),
      );
      setPositions(
        (positionsResult.data ?? []).map((position) => ({
          id: position.id,
          name: position.name ?? "",
        })),
      );
      setDepartments(
        (departmentsResult.data ?? []).map((department) => ({
          id: department.id,
          name: department.name ?? "",
        })),
      );
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
      setPositions([]);
      setRoles([]);
      setDepartments([]);
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
    positions,
    roles,
    departments,
    loading,
    error,
    refetch: fetchOptions,
  };
};
