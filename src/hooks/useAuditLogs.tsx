import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCan } from "@/hooks/useCan";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { logger } from "@/utils/logger";

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  performed_by: string;
  created_at: string;
  user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  performed_by_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function useAuditLogs() {
  const { can } = useCan();
  const auditLogsEnabled = useFeatureFlag("admin.auditLogs");

  const query = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", auditLogsEnabled],
    queryFn: async () => {
      if (!auditLogsEnabled) {
        return [];
      }

      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        // Gracefully handle missing table when feature flag is disabled or migration not run
        if ((error as unknown as Record<string, unknown>).code === "42P01") {
          logger.warn(
            "[useAuditLogs] audit_logs table not found. Returning empty list",
            { tags: ["warning"] },
          );
          return [];
        }

        throw error;
      }

      if (data && data.length > 0) {
        const enrichedData = await Promise.all(
          data.map(async (log: any) => {
            let userProfile = null;
            if (log.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("first_name, last_name, email")
                .eq("id", log.user_id)
                .single();
              userProfile = profile;
            }

            let performedByProfile = null;
            if (log.performed_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("first_name, last_name, email")
                .eq("id", log.performed_by)
                .single();
              performedByProfile = profile;
            }

            return {
              ...log,
              user_profile: userProfile,
              performed_by_profile: performedByProfile,
            } as AuditLog;
          }),
        );

        return enrichedData;
      }

      return (data as unknown as AuditLog[]) || [];
    },
    enabled: can("manageUsers") && auditLogsEnabled,
  });

  const normalizedData = auditLogsEnabled ? (query.data ?? []) : [];

  return {
    ...query,
    data: normalizedData,
    isAuditEnabled: auditLogsEnabled,
  };
}
