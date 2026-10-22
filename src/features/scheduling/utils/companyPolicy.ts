import type { TimeOffPolicy, TimeOffUnit } from "@/features/scheduling/utils/timeOffPolicy";

export type CompanyPolicyType = "time_off" | "availability" | "scheduling_rules";

export type PolicyTargetType = "user" | "role" | "level" | "store" | "company";

export type CompanyPolicyAssignment = {
  targetType: PolicyTargetType;
  targetId: string;
};

export type LegacyTimeOffPolicyRow = {
  id: string;
  companyId: string;
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

export type CompanyPolicyRecord = {
  id: string;
  companyId: string;
  name: string;
  type: CompanyPolicyType;
  unit: TimeOffUnit | null;
  capWeek: number | null;
  capMonth: number | null;
  capYear: number | null;
  eligibleWeekdays: number[];
  noticeDays: number;
  assignments: CompanyPolicyAssignment[];
};

export type PolicySubject = {
  userId: string;
  roleId?: string | null;
  level?: string | null;
  locationId?: string | null;
  companyId: string;
};

function uniqueIds(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function companyPolicyFromTimeOffRow(
  row: LegacyTimeOffPolicyRow,
): CompanyPolicyRecord {
  const roleIds = uniqueIds(row.appliesToRoleIds);
  const userIds = uniqueIds(row.appliesToUserIds);
  const assignments: CompanyPolicyAssignment[] =
    roleIds.length === 0 && userIds.length === 0
      ? [{ targetType: "company", targetId: row.companyId }]
      : [
          ...roleIds.map((targetId) => ({ targetType: "role" as const, targetId })),
          ...userIds.map((targetId) => ({ targetType: "user" as const, targetId })),
        ];

  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    type: "time_off",
    unit: row.unit,
    capWeek: row.capWeek,
    capMonth: row.capMonth,
    capYear: row.capYear,
    eligibleWeekdays: row.eligibleWeekdays,
    noticeDays: row.noticeDays,
    assignments,
  };
}

export function assignmentsFromSelection(input: {
  companyId: string;
  roleIds: string[];
  userIds: string[];
  levelKeys: string[];
  storeIds: string[];
}): CompanyPolicyAssignment[] {
  const roles = uniqueIds(input.roleIds).map((targetId) => ({
    targetType: "role" as const,
    targetId,
  }));
  const users = uniqueIds(input.userIds).map((targetId) => ({
    targetType: "user" as const,
    targetId,
  }));
  const levels = uniqueIds(input.levelKeys).map((targetId) => ({
    targetType: "level" as const,
    targetId,
  }));
  const stores = uniqueIds(input.storeIds).map((targetId) => ({
    targetType: "store" as const,
    targetId,
  }));
  const selected = [...roles, ...users, ...levels, ...stores];
  if (selected.length === 0) {
    return [{ targetType: "company", targetId: input.companyId }];
  }
  return selected;
}

export function policyMatchesSubject(
  assignments: CompanyPolicyAssignment[],
  subject: PolicySubject,
): boolean {
  return assignments.some((assignment) => {
    if (assignment.targetType === "company") {
      return assignment.targetId === subject.companyId;
    }
    if (assignment.targetType === "user") {
      return assignment.targetId === subject.userId;
    }
    if (assignment.targetType === "role") {
      return Boolean(subject.roleId) && assignment.targetId === subject.roleId;
    }
    if (assignment.targetType === "level") {
      return Boolean(subject.level) && assignment.targetId === subject.level;
    }
    if (assignment.targetType === "store") {
      return Boolean(subject.locationId) && assignment.targetId === subject.locationId;
    }
    return false;
  });
}

export function toTimeOffPolicy(policy: CompanyPolicyRecord): TimeOffPolicy {
  const companyWide = policy.assignments.some(
    (assignment) => assignment.targetType === "company",
  );
  const unit: TimeOffUnit =
    policy.unit === "hours" || policy.unit === "minutes" ? policy.unit : "days";
  return {
    id: policy.id,
    name: policy.name,
    unit,
    capWeek: policy.capWeek,
    capMonth: policy.capMonth,
    capYear: policy.capYear,
    eligibleWeekdays: policy.eligibleWeekdays,
    noticeDays: policy.noticeDays,
    appliesToRoleIds: companyWide
      ? []
      : policy.assignments
          .filter((assignment) => assignment.targetType === "role")
          .map((assignment) => assignment.targetId),
    appliesToUserIds: companyWide
      ? []
      : policy.assignments
          .filter((assignment) => assignment.targetType === "user")
          .map((assignment) => assignment.targetId),
  };
}

export function timeOffPolicyForSubject(
  policy: CompanyPolicyRecord,
  subject: PolicySubject,
): TimeOffPolicy | null {
  if (policy.type !== "time_off") return null;
  if (!policyMatchesSubject(policy.assignments, subject)) return null;
  const mapped = toTimeOffPolicy(policy);
  const matchedByRoleOrUser =
    (subject.roleId != null && mapped.appliesToRoleIds.includes(subject.roleId)) ||
    (subject.userId != null && mapped.appliesToUserIds.includes(subject.userId));
  const matchedByInheritedRule = policy.assignments.some(
    (assignment) =>
      assignment.targetType === "company" ||
      (assignment.targetType === "level" && assignment.targetId === subject.level) ||
      (assignment.targetType === "store" && assignment.targetId === subject.locationId),
  );
  if (matchedByInheritedRule && !matchedByRoleOrUser) {
    return { ...mapped, appliesToRoleIds: [], appliesToUserIds: [] };
  }
  return mapped;
}
