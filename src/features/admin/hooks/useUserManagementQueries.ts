/**
 * Hook for user management queries
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useCan";
import type { DepartmentRecord, CompanyInvite } from "../types/userManagement";

export function useUserManagementQueries() {
  const { can } = useCan();

  const departmentsQuery = useQuery({
    queryKey: ["team-management", "departments"],
    enabled: can("manageUsers"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, color")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DepartmentRecord[];
    },
  });

  const inactiveEmployeesQuery = useQuery({
    queryKey: ["inactive-employees"],
    enabled: can("manageUsers"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          role,
          employment_status,
          avatar_url,
          department_id,
          position_id,
          reliability,
          badges,
          department:departments(id, name, color),
          position:positions(id, name, role)
        `,
        )
        .eq("employment_status", "inactive")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invitesQuery = useQuery({
    queryKey: ["invites"],
    enabled: can("manageUsers"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_invites")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanyInvite[];
    },
  });

  return {
    departmentsQuery,
    inactiveEmployeesQuery,
    invitesQuery,
  };
}
