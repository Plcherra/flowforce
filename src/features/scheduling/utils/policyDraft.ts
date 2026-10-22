import {
  assignmentsFromSelection,
  type CompanyPolicyAssignment,
  type CompanyPolicyRecord,
  type CompanyPolicyType,
} from "@/features/scheduling/utils/companyPolicy";
import type { TimeOffUnit } from "@/features/scheduling/utils/timeOffPolicy";

export type PolicyDraft = {
  id: string;
  name: string;
  type: CompanyPolicyType;
  unit: TimeOffUnit;
  capWeek: number | null;
  capMonth: number | null;
  capYear: number | null;
  eligibleWeekdays: number[];
  noticeDays: number;
  assignments: CompanyPolicyAssignment[];
  roleIds: string[];
  userIds: string[];
  levelKeys: string[];
  storeIds: string[];
};

function idsOf(
  assignments: CompanyPolicyAssignment[],
  targetType: CompanyPolicyAssignment["targetType"],
): string[] {
  return assignments
    .filter((assignment) => assignment.targetType === targetType)
    .map((assignment) => assignment.targetId);
}

export function draftFromPolicy(policy: CompanyPolicyRecord): PolicyDraft {
  const unit: TimeOffUnit =
    policy.unit === "hours" || policy.unit === "minutes" ? policy.unit : "days";
  return {
    id: policy.id,
    name: policy.name,
    type: policy.type,
    unit,
    capWeek: policy.capWeek,
    capMonth: policy.capMonth,
    capYear: policy.capYear,
    eligibleWeekdays: [...policy.eligibleWeekdays],
    noticeDays: policy.noticeDays,
    assignments: policy.assignments.map((assignment) => ({ ...assignment })),
    roleIds: idsOf(policy.assignments, "role"),
    userIds: idsOf(policy.assignments, "user"),
    levelKeys: idsOf(policy.assignments, "level"),
    storeIds: idsOf(policy.assignments, "store"),
  };
}

export function assignmentsForDraft(input: {
  companyId: string;
  roleIds: string[];
  userIds: string[];
  levelKeys: string[];
  storeIds: string[];
}): CompanyPolicyAssignment[] {
  return assignmentsFromSelection(input);
}

export function policyIsOpen(policy: Pick<CompanyPolicyRecord, "archivedAt">): boolean {
  return policy.archivedAt == null;
}

export function exampleKeepsOpenEdit(
  editingName: string | null,
  exampleName: string,
): boolean {
  return editingName === exampleName;
}
