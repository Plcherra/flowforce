import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TimeOffPolicy, TimeOffUnit } from "@/features/scheduling/utils/timeOffPolicy";

export type TimeOffPolicyDraft = {
  id?: string;
  name: string;
  unit: TimeOffUnit;
  capWeek: number | null;
  capMonth: number | null;
  capYear: number | null;
  eligibleWeekdays: number[];
  noticeDays: number;
  appliesToRoleIds: string[];
  appliesToUserIds: string[];
};

type PolicyRow = {
  id: string;
  name: string;
  unit: string;
  cap_week: number | null;
  cap_month: number | null;
  cap_year: number | null;
  eligible_weekdays: number[] | null;
  notice_days: number | null;
  applies_to_role_ids: string[] | null;
  applies_to_user_ids: string[] | null;
};

function toPolicy(row: PolicyRow): TimeOffPolicy {
  const unit: TimeOffUnit =
    row.unit === "hours" || row.unit === "minutes" ? row.unit : "days";
  return {
    id: row.id,
    name: row.name,
    unit,
    capWeek: row.cap_week,
    capMonth: row.cap_month,
    capYear: row.cap_year,
    eligibleWeekdays: row.eligible_weekdays ?? [],
    noticeDays: row.notice_days ?? 0,
    appliesToRoleIds: row.applies_to_role_ids ?? [],
    appliesToUserIds: row.applies_to_user_ids ?? [],
  };
}

function toRow(companyId: string, draft: TimeOffPolicyDraft) {
  return {
    company_id: companyId,
    name: draft.name.trim(),
    unit: draft.unit,
    cap_week: draft.capWeek,
    cap_month: draft.capMonth,
    cap_year: draft.capYear,
    eligible_weekdays: draft.eligibleWeekdays,
    notice_days: draft.noticeDays,
    applies_to_role_ids: draft.appliesToRoleIds,
    applies_to_user_ids: draft.appliesToUserIds,
    updated_at: new Date().toISOString(),
  };
}

export function useTimeOffPolicies(companyId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["time-off-policies", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_off_policies")
        .select(
          "id, name, unit, cap_week, cap_month, cap_year, eligible_weekdays, notice_days, applies_to_role_ids, applies_to_user_ids",
        )
        .eq("company_id", companyId!);
      if (error) throw error;
      return ((data ?? []) as PolicyRow[]).map(toPolicy);
    },
  });

  const save = useMutation({
    mutationFn: async (draft: TimeOffPolicyDraft) => {
      if (!companyId) throw new Error("Company missing");
      const row = toRow(companyId, draft);
      const result = draft.id
        ? await supabase.from("time_off_policies").update(row).eq("id", draft.id)
        : await supabase.from("time_off_policies").insert(row);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-off-policies", companyId],
      });
    },
  });

  return {
    policies: query.data ?? [],
    isLoading: query.isLoading,
    savePolicy: save.mutateAsync,
    isSaving: save.isPending,
  };
}
