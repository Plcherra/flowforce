import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsData {
  totalEmployees: number;
  activeEmployees: number;
  pendingTimeOffRequests: number;
  completedTasks: number;
  overdueTasks: number;
  totalForms: number;
  formSubmissions: number;
  monthlyTrends: {
    month: string;
    employees: number;
    tasks: number;
    timeOff: number;
  }[];
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async (): Promise<AnalyticsData> => {
      // Get total employees
      const { count: totalEmployees } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Get active employees
      const { count: activeEmployees } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("employment_status", "active");

      // Get pending time off requests
      const { count: pendingTimeOffRequests } = await supabase
        .from("time_off_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "requested");

      // Get completed tasks
      const { count: completedTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      // Get overdue tasks
      const { count: overdueTasks } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .lt("due_date", new Date().toISOString())
        .neq("status", "completed");

      // Get total forms
      const { count: totalForms } = await supabase
        .from("forms")
        .select("*", { count: "exact", head: true });

      // Get form submissions
      const { count: formSubmissions } = await supabase
        .from("form_submissions")
        .select("*", { count: "exact", head: true });

      // Get monthly trends (simplified for demo)
      const monthlyTrends = [
        {
          month: "Jan",
          employees: totalEmployees || 0,
          tasks: completedTasks || 0,
          timeOff: pendingTimeOffRequests || 0,
        },
        {
          month: "Feb",
          employees: (totalEmployees || 0) + 2,
          tasks: (completedTasks || 0) + 5,
          timeOff: (pendingTimeOffRequests || 0) + 1,
        },
        {
          month: "Mar",
          employees: (totalEmployees || 0) + 1,
          tasks: (completedTasks || 0) + 8,
          timeOff: (pendingTimeOffRequests || 0) + 3,
        },
      ];

      return {
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        pendingTimeOffRequests: pendingTimeOffRequests || 0,
        completedTasks: completedTasks || 0,
        overdueTasks: overdueTasks || 0,
        totalForms: totalForms || 0,
        formSubmissions: formSubmissions || 0,
        monthlyTrends,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useEmployeePerformance() {
  return useQuery({
    queryKey: ["employeePerformance"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name");

      if (error) throw error;

      // Get task counts for each employee
      const employeeData = await Promise.all(
        profiles.map(async (profile) => {
          const { count: totalTasks } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("assigned_to", profile.id);

          const { count: completedTasks } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("assigned_to", profile.id)
            .eq("status", "completed");

          return {
            ...profile,
            tasks: totalTasks || 0,
            completed_tasks: completedTasks || 0,
            completion_rate:
              totalTasks && totalTasks > 0
                ? ((completedTasks || 0) / totalTasks) * 100
                : 0,
          };
        }),
      );

      return employeeData;
    },
  });
}
