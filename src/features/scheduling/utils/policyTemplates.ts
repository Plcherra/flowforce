import type { CompanyPolicyType } from "@/features/scheduling/utils/companyPolicy";
import type { TimeOffUnit } from "@/features/scheduling/utils/timeOffPolicy";

export type PolicyTemplate = {
  id: string;
  nameKey: string;
  type: CompanyPolicyType;
  unit: TimeOffUnit | null;
  capWeek: number | null;
  capMonth: number | null;
  capYear: number | null;
  noticeDays: number | null;
  weekdays: number[] | null;
};

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: "weekend-time-off",
    nameKey: "schedule.templateWeekendTimeOff",
    type: "time_off",
    unit: "days",
    capWeek: null,
    capMonth: 2,
    capYear: 24,
    noticeDays: 0,
    weekdays: [6, 0],
  },
  {
    id: "weekday-time-off",
    nameKey: "schedule.templateWeekdayTimeOff",
    type: "time_off",
    unit: "days",
    capWeek: null,
    capMonth: null,
    capYear: 90,
    noticeDays: 7,
    weekdays: [1, 2, 3, 4, 5],
  },
  {
    id: "standard-availability",
    nameKey: "schedule.templateStandardAvailability",
    type: "availability",
    unit: null,
    capWeek: null,
    capMonth: null,
    capYear: null,
    noticeDays: null,
    weekdays: null,
  },
  {
    id: "scheduling-notice",
    nameKey: "schedule.templateSchedulingNotice",
    type: "scheduling_rules",
    unit: null,
    capWeek: null,
    capMonth: null,
    capYear: null,
    noticeDays: null,
    weekdays: null,
  },
];

const LEVEL_NAMES = new Set(["owner", "admin", "manager", "staff"]);

export function policyTemplateById(id: string): PolicyTemplate | null {
  return POLICY_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function showPolicyStores(storeCount: number): boolean {
  return storeCount > 1;
}

export function isLevelNamedRole(name: string): boolean {
  return LEVEL_NAMES.has(name.trim().toLowerCase());
}
