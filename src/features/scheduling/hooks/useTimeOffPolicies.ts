import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { normalizeProductRoleKey } from "@/features/roles/constants/productRoles";
import { resolveProductLevel } from "@/features/roles/constants/productLevels";
import {
  toTimeOffPolicy,
  type CompanyPolicyAssignment,
  type CompanyPolicyRecord,
  type CompanyPolicyType,
  type PolicySubject,
  type PolicyTargetType,
} from "@/features/scheduling/utils/companyPolicy";
import type { TimeOffUnit } from "@/features/scheduling/utils/timeOffPolicy";

export type CompanyPolicyDraft = {
  id?: string;
  name: string;
  type: CompanyPolicyType;
  unit: TimeOffUnit;
  capWeek: number | null;
  capMonth: number | null;
  capYear: number | null;
  eligibleWeekdays: number[];
  noticeDays: number;
  assignments: CompanyPolicyAssignment[];
};

type PolicyRow = {
  id: string;
  company_id: string;
  name: string;
  type: string;
  unit: string | null;
  cap_week: number | null;
  cap_month: number | null;
  cap_year: number | null;
  eligible_weekdays: number[] | null;
  notice_days: number | null;
};

type AssignmentRow = {
  policy_id: string;
  target_type: string;
  target_id: string;
};

const TARGET_TYPES = new Set<PolicyTargetType>([
  "user",
  "role",
  "level",
  "store",
  "company",
]);

function asUnit(value: string | null): TimeOffUnit | null {
  if (value === "hours" || value === "days" || value === "minutes") return value;
  return null;
}

function asType(value: string): CompanyPolicyType {
  if (value === "availability" || value === "scheduling_rules") return value;
  return "time_off";
}

function asTargetType(value: string): PolicyTargetType {
  if (TARGET_TYPES.has(value as PolicyTargetType)) return value as PolicyTargetType;
  return "user";
}

function toRecord(row: PolicyRow, assignments: AssignmentRow[]): CompanyPolicyRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    type: asType(row.type),
    unit: asUnit(row.unit),
    capWeek: row.cap_week,
    capMonth: row.cap_month,
    capYear: row.cap_year,
    eligibleWeekdays: row.eligible_weekdays ?? [],
    noticeDays: row.notice_days ?? 0,
    assignments: assignments
      .filter((assignment) => assignment.policy_id === row.id)
      .map((assignment) => ({
        targetType: asTargetType(assignment.target_type),
        targetId: assignment.target_id,
      })),
  };
}

function policyRow(companyId: string, draft: CompanyPolicyDraft) {
  const timeOff = draft.type === "time_off";
  return {
    company_id: companyId,
    name: draft.name.trim(),
    type: draft.type,
    unit: timeOff ? draft.unit : null,
    cap_week: timeOff ? draft.capWeek : null,
    cap_month: timeOff ? draft.capMonth : null,
    cap_year: timeOff ? draft.capYear : null,
    eligible_weekdays: timeOff ? draft.eligibleWeekdays : [0, 1, 2, 3, 4, 5, 6],
    notice_days: timeOff ? draft.noticeDays : 0,
    updated_at: new Date().toISOString(),
  };
}

export function usePolicySubject(): PolicySubject {
  const { profile } = useProfile();
  const { roles } = useCompanyRoles();
  const userId = profile?.id ?? null;
  const companyRole = roles.find((role) => role.id === profile?.roleId);
  const level = companyRole
    ? resolveProductLevel({
        product_level: companyRole.product_level,
        name: companyRole.name,
        hierarchy_level: companyRole.hierarchy_level,
      })
    : normalizeProductRoleKey(profile?.role);

  const locationQuery = useQuery({
    queryKey: ["profile-location", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("location_id")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.location_id ?? null;
    },
  });

  return useMemo(
    () => ({
      userId: userId ?? "",
      roleId: profile?.roleId ?? null,
      level: level ?? null,
      locationId: locationQuery.data ?? null,
      companyId: profile?.companyId ?? "",
    }),
    [level, locationQuery.data, profile?.companyId, profile?.roleId, userId],
  );
}

export function useTimeOffPolicies(companyId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["time-off-policies", companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_policies")
        .select(
          "id, company_id, name, type, unit, cap_week, cap_month, cap_year, eligible_weekdays, notice_days",
        )
        .eq("company_id", companyId!);
      if (error) throw error;
      const rows = (data ?? []) as PolicyRow[];
      const ids = rows.map((row) => row.id);
      if (ids.length === 0) return [] as CompanyPolicyRecord[];
      const assignments = await supabase
        .from("company_policy_assignments")
        .select("policy_id, target_type, target_id")
        .in("policy_id", ids);
      if (assignments.error) throw assignments.error;
      const assignmentRows = (assignments.data ?? []) as AssignmentRow[];
      return rows.map((row) => toRecord(row, assignmentRows));
    },
  });

  const companyPolicies = query.data ?? [];

  const save = useMutation({
    mutationFn: async (draft: CompanyPolicyDraft) => {
      if (!companyId) throw new Error("Company missing");
      const assignments =
        draft.assignments.length > 0
          ? draft.assignments
          : [{ targetType: "company" as const, targetId: companyId }];
      const row = policyRow(companyId, draft);
      let policyId = draft.id;
      if (policyId) {
        const updated = await supabase
          .from("company_policies")
          .update(row)
          .eq("id", policyId);
        if (updated.error) throw updated.error;
        const removed = await supabase
          .from("company_policy_assignments")
          .delete()
          .eq("policy_id", policyId);
        if (removed.error) throw removed.error;
      } else {
        const inserted = await supabase
          .from("company_policies")
          .insert(row)
          .select("id")
          .single();
        if (inserted.error) throw inserted.error;
        policyId = inserted.data.id;
      }
      const savedAssignments = await supabase.from("company_policy_assignments").insert(
        assignments.map((assignment) => ({
          policy_id: policyId,
          target_type: assignment.targetType,
          target_id: assignment.targetId,
        })),
      );
      if (savedAssignments.error) throw savedAssignments.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["time-off-policies", companyId],
      });
    },
  });

  return {
    policies: companyPolicies
      .filter((policy) => policy.type === "time_off")
      .map(toTimeOffPolicy),
    companyPolicies,
    isLoading: query.isLoading,
    savePolicy: save.mutateAsync,
    isSaving: save.isPending,
  };
}
