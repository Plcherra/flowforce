import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CustomReport {
  id: string;
  created_by: string;
  name: string;
  description?: string;
  report_type: string;
  filters: Record<string, unknown>;
  columns: string[];
  chart_config: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomReport[];
    },
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (
      report: Omit<CustomReport, "id" | "created_at" | "updated_at">,
    ) => {
      const { data, error } = await supabase
        .from("custom_reports")
        .insert(report)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Success",
        description: "Report created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create report: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<CustomReport> & { id: string }) => {
      const { data, error } = await supabase
        .from("custom_reports")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Success",
        description: "Report updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update report: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("custom_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Success",
        description: "Report deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete report: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}

export function useReportData(
  reportType: string,
  filters: Record<string, unknown> = {},
) {
  return useQuery({
    queryKey: ["reportData", reportType, filters],
    queryFn: async () => {
      // Map report types to actual table names
      const tableMap: Record<string, string> = {
        employee: "profiles",
        timeoff: "time_off_requests",
        scheduling: "schedules",
        tasks: "tasks",
        forms: "forms",
        expenses: "expenses",
        inventory: "inventory_items",
        shift_profitability: "cost_day_location_summary_v",
        cost_engine: "cost_day_location_summary_v",
      };

      const tableName = tableMap[reportType];
      if (!tableName) {
        throw new Error(`Invalid report type: ${reportType}`);
      }

      let query = supabase.from(tableName).select("*");

      // Apply filters dynamically
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!reportType,
  });
}
