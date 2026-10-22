import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { CompanyPolicyRecord } from "@/features/scheduling/utils/companyPolicy";
import { policyIsOpen } from "@/features/scheduling/utils/policyDraft";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABEL: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  0: "Sun",
};

const LEVEL_LABELS: Record<string, string> = {
  staff: "schedule.levelStaff",
  manager: "schedule.levelManager",
  admin: "schedule.levelAdmin",
  owner: "schedule.levelOwner",
};

type PolicyPeoplePickerProps = {
  employees: Array<{ id: string; first_name?: string | null; last_name?: string | null }>;
  selectedIds: string[];
  nameFor: (person: { id: string; first_name?: string | null; last_name?: string | null }) => string;
  onToggle: (id: string) => void;
};

export function PolicyPeoplePicker({
  employees,
  selectedIds,
  nameFor,
  onToggle,
}: PolicyPeoplePickerProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t("schedule.people")}</p>
      <div className="flex flex-wrap gap-2">
        {employees.map((person) => (
          <Button
            key={person.id}
            type="button"
            size="sm"
            variant={selectedIds.includes(person.id) ? "default" : "outline"}
            onClick={() => onToggle(person.id)}
          >
            {nameFor(person)}
          </Button>
        ))}
      </div>
    </div>
  );
}

type CompanyPolicyListProps = {
  policies: CompanyPolicyRecord[];
  roles: Array<{ id: string; name: string }>;
  stores: Array<{ id: string; name: string | null }>;
  onEdit: (policy: CompanyPolicyRecord) => void;
  onRetire: (policyId: string) => void;
};

function capText(value: number | null): string {
  return value == null ? "—" : String(value);
}

function weekdayText(days: number[]): string {
  return WEEKDAY_ORDER.filter((day) => days.includes(day))
    .map((day) => WEEKDAY_LABEL[day])
    .join(", ");
}

export function CompanyPolicyList({
  policies,
  roles,
  stores,
  onEdit,
  onRetire,
}: CompanyPolicyListProps) {
  const { t } = useTranslation();
  const timeOff = policies.filter((policy) => policy.type === "time_off");
  if (timeOff.length === 0) return null;

  const unitLabel = (unit: CompanyPolicyRecord["unit"]) => {
    if (unit === "hours") return t("schedule.hours");
    if (unit === "minutes") return t("schedule.minutes");
    return t("schedule.days");
  };

  const appliesTo = (policy: CompanyPolicyRecord) => {
    const companyWide =
      policy.assignments.length === 0 ||
      policy.assignments.some((assignment) => assignment.targetType === "company");
    if (companyWide) return t("schedule.everyone");
    return policy.assignments
      .map((assignment) => {
        if (assignment.targetType === "role") {
          return roles.find((role) => role.id === assignment.targetId)?.name ?? assignment.targetId;
        }
        if (assignment.targetType === "level") {
          const key = LEVEL_LABELS[assignment.targetId];
          return key ? t(key) : assignment.targetId;
        }
        if (assignment.targetType === "store") {
          return stores.find((store) => store.id === assignment.targetId)?.name || assignment.targetId;
        }
        return assignment.targetId;
      })
      .join(", ");
  };

  return (
    <div className="space-y-2">
      {timeOff.map((policy) => (
        <div key={policy.id} className="rounded-lg border p-3 text-sm" data-testid="company-policy-row">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium" data-testid="company-policy-name">
              {policy.name}
            </p>
            <div className="flex gap-2">
              {policyIsOpen(policy) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="company-policy-retire"
                  onClick={() => onRetire(policy.id)}
                >
                  {t("schedule.retirePolicy")}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground" data-testid="company-policy-retired">
                  {t("schedule.retired")}
                </span>
              )}
              <Button type="button" size="sm" variant="outline" onClick={() => onEdit(policy)}>
                {t("common.edit")}
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            {t("schedule.unit")}: {unitLabel(policy.unit)}
            {" · "}
            {t("schedule.maxPerWeek")}: {capText(policy.capWeek)}
            {" · "}
            {t("schedule.maxPerMonth")}:{" "}
            <span data-testid="company-policy-month-cap">{capText(policy.capMonth)}</span>
            {" · "}
            {t("schedule.maxPerYear")}: {capText(policy.capYear)}
          </p>
          <p className="text-muted-foreground">
            {weekdayText(policy.eligibleWeekdays)}
            {" · "}
            {t("schedule.noticeInDays")}: {policy.noticeDays}
          </p>
          <p className="text-muted-foreground">
            {t("schedule.appliesTo")}: {appliesTo(policy)}
          </p>
        </div>
      ))}
    </div>
  );
}
