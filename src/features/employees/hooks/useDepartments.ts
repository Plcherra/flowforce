/**
 * Hook for fetching and managing departments
 */

import { useState, useEffect, useCallback } from "react";
import { employeesRepository } from "@/repositories/employeesRepository";
import { logger } from "@/utils/logger";
import type { Department } from "../types/directory";

interface UseDepartmentsProps {
  companyId: string | null;
  profileLoading: boolean;
}

export function useDepartments({
  companyId,
  profileLoading,
}: UseDepartmentsProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentError, setDepartmentError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    if (!companyId) {
      if (!profileLoading) {
        setDepartmentError(
          "Department filters need an active company assignment. Ask an admin to link your profile and refresh.",
        );
      }
      setDepartments([]);
      return;
    }

    try {
      const data =
        await employeesRepository.fetchDepartmentsByCompany(companyId);
      setDepartments(data || []);
      setDepartmentError(null);
    } catch (unknownErr) {
      logger.error("Error fetching departments", {
        error: unknownErr,
        tags: ["error"],
      });
      setDepartmentError(
        "Department filters are unavailable right now. Once Supabase is back online, refresh to restore filters.",
      );
      setDepartments([]);
    }
  }, [companyId, profileLoading]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return {
    departments,
    departmentError,
    refetchDepartments: fetchDepartments,
  };
}
