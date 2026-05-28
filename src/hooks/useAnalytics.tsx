import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import type { Tables } from "@/integrations/supabase/types";

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
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  return useQuery({
    queryKey: ["analytics", companyId ?? "no-company"],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!companyId) {
        return {
          totalEmployees: 0,
          activeEmployees: 0,
          pendingTimeOffRequests: 0,
          completedTasks: 0,
          overdueTasks: 0,
          totalForms: 0,
          formSubmissions: 0,
          monthlyTrends: buildMonthlyTrends([], [], []),
        };
      }

      const now = new Date();
      const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const [
        totalEmployeesResult,
        activeEmployeesResult,
        pendingTimeOffResult,
        completedTasksResult,
        overdueTasksResult,
        totalFormsResult,
        formSubmissionsResult,
        employeeTrendResult,
        taskTrendResult,
        timeOffTrendResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("employment_status", "active"),
        supabase
          .from("time_off_requests")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "requested"),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("status", "completed"),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId)
          .lt("due_date", now.toISOString())
          .neq("status", "completed"),
        supabase
          .from("forms")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("form_submissions")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId),
        supabase
          .from("profiles")
          .select("created_at")
          .eq("company_id", companyId)
          .gte("created_at", trendStart.toISOString())
          .limit(800),
        supabase
          .from("tasks")
          .select("created_at, completed_at, status")
          .eq("company_id", companyId)
          .gte("created_at", trendStart.toISOString())
          .limit(800),
        supabase
          .from("time_off_requests")
          .select("created_at, status")
          .eq("company_id", companyId)
          .gte("created_at", trendStart.toISOString())
          .limit(400),
      ]);

      const results = [
        totalEmployeesResult,
        activeEmployeesResult,
        pendingTimeOffResult,
        completedTasksResult,
        overdueTasksResult,
        totalFormsResult,
        formSubmissionsResult,
        employeeTrendResult,
        taskTrendResult,
        timeOffTrendResult,
      ];
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;

      const monthlyTrends = buildMonthlyTrends(
        (employeeTrendResult.data ?? []) as Pick<Tables<"profiles">, "created_at">[],
        (taskTrendResult.data ?? []) as Pick<
          Tables<"tasks">,
          "created_at" | "completed_at" | "status"
        >[],
        (timeOffTrendResult.data ?? []) as Pick<
          Tables<"time_off_requests">,
          "created_at" | "status"
        >[],
      );

      return {
        totalEmployees: totalEmployeesResult.count || 0,
        activeEmployees: activeEmployeesResult.count || 0,
        pendingTimeOffRequests: pendingTimeOffResult.count || 0,
        completedTasks: completedTasksResult.count || 0,
        overdueTasks: overdueTasksResult.count || 0,
        totalForms: totalFormsResult.count || 0,
        formSubmissions: formSubmissionsResult.count || 0,
        monthlyTrends,
      };
    },
    enabled: Boolean(companyId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useEmployeePerformance() {
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  return useQuery({
    queryKey: ["employeePerformance", companyId ?? "no-company"],
    queryFn: async () => {
      if (!companyId) return [];

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("company_id", companyId);

      if (error) throw error;

      // Get task counts for each employee
      const employeeData = await Promise.all(
        profiles.map(async (profile) => {
          const { count: totalTasks } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("assigned_to", profile.id);

          const { count: completedTasks } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
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
    enabled: Boolean(companyId),
  });
}

function buildMonthlyTrends(
  employees: Pick<Tables<"profiles">, "created_at">[],
  tasks: Pick<Tables<"tasks">, "created_at" | "completed_at" | "status">[],
  timeOffRequests: Pick<Tables<"time_off_requests">, "created_at" | "status">[],
): AnalyticsData["monthlyTrends"] {
  const now = new Date();
  const buckets = new Map<
    string,
    { month: string; employees: number; tasks: number; timeOff: number }
  >();

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, {
      month: date.toLocaleString("en-US", { month: "short" }),
      employees: 0,
      tasks: 0,
      timeOff: 0,
    });
  }

  const getKey = (value: string | null | undefined) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  employees.forEach((employee) => {
    const key = getKey(employee.created_at);
    const bucket = key ? buckets.get(key) : null;
    if (bucket) {
      bucket.employees += 1;
    }
  });

  tasks.forEach((task) => {
    const key = getKey(task.completed_at ?? task.created_at);
    const bucket = key ? buckets.get(key) : null;
    if (bucket && task.status === "completed") {
      bucket.tasks += 1;
    }
  });

  timeOffRequests.forEach((request) => {
    const key = getKey(request.created_at);
    const bucket = key ? buckets.get(key) : null;
    if (bucket && request.status === "requested") {
      bucket.timeOff += 1;
    }
  });

  return Array.from(buckets.values());
}
