import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { PRODUCT_LEVELS } from "@/features/roles/constants/productLevels";
import { useTimeOffPolicies } from "@/features/scheduling/hooks/useTimeOffPolicies";
import { assignmentsFromSelection } from "@/features/scheduling/utils/companyPolicy";
import type { CompanyPolicyType } from "@/features/scheduling/utils/companyPolicy";
import type { TimeOffUnit } from "@/features/scheduling/utils/timeOffPolicy";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

const LEVEL_LABELS: Record<(typeof PRODUCT_LEVELS)[number], string> = {
  staff: "schedule.levelStaff",
  manager: "schedule.levelManager",
  admin: "schedule.levelAdmin",
  owner: "schedule.levelOwner",
};

type TimeOffPoliciesSectionProps = {
  canManage: boolean;
};

function optionalCap(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function TimeOffPoliciesSection({ canManage }: TimeOffPoliciesSectionProps) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? null;
  const { companyPolicies, savePolicy, isSaving, isLoading } = useTimeOffPolicies(companyId);
  const { roles } = useCompanyRoles();
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<CompanyPolicyType>("time_off");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<TimeOffUnit>("days");
  const [capWeek, setCapWeek] = useState("");
  const [capMonth, setCapMonth] = useState("");
  const [capYear, setCapYear] = useState("");
  const [noticeDays, setNoticeDays] = useState("0");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [levelKeys, setLevelKeys] = useState<string[]>([]);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState("");
  const [error, setError] = useState<string | null>(null);

  const storesQuery = useQuery({
    queryKey: ["company-policy-stores", companyId],
    enabled: Boolean(companyId) && canManage && formOpen,
    queryFn: async () => {
      const { data, error: storeError } = await supabase
        .from("inv_locations")
        .select("id, name")
        .eq("company_id", companyId!)
        .order("name", { ascending: true });
      if (storeError) throw storeError;
      return data ?? [];
    },
  });

  const fillWeekend = () => {
    setType("time_off");
    setName("Weekend");
    setUnit("days");
    setCapWeek("");
    setCapMonth("2");
    setCapYear("24");
    setNoticeDays("0");
    setWeekdays([6, 0]);
  };

  const fillWeekday = () => {
    setType("time_off");
    setName("Weekday");
    setUnit("days");
    setCapWeek("");
    setCapMonth("");
    setCapYear("90");
    setNoticeDays("7");
    setWeekdays([1, 2, 3, 4, 5]);
  };

  const toggleWeekday = (value: number) => {
    setWeekdays((current) =>
      current.includes(value)
        ? current.filter((day) => day !== value)
        : [...current, value],
    );
  };

  const toggleId = (
    value: string,
    current: string[],
    setValues: (next: string[]) => void,
  ) => {
    setValues(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const handleSave = async () => {
    if (!companyId) return;
    if (!name.trim()) {
      setError(t("schedule.nameThePolicy"));
      return;
    }
    if (type === "time_off" && weekdays.length === 0) {
      setError(t("schedule.chooseAtLeastOneWeekday"));
      return;
    }
    setError(null);
    try {
      await savePolicy({
        name,
        type,
        unit,
        capWeek: optionalCap(capWeek),
        capMonth: optionalCap(capMonth),
        capYear: optionalCap(capYear),
        eligibleWeekdays: weekdays,
        noticeDays: Math.max(0, Number(noticeDays) || 0),
        assignments: assignmentsFromSelection({
          companyId,
          roleIds,
          userIds: userIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean),
          levelKeys,
          storeIds,
        }),
      });
      setName("");
      setFormOpen(false);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("schedule.couldNotSaveThePolicy"),
      );
    }
  };

  if (!canManage) return null;

  return (
    <section className="space-y-3" data-testid="company-policies">
      {!isLoading && companyPolicies.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="company-policies-empty">
          {t("schedule.noCompanyPoliciesYet")}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        data-testid="company-policies-create"
        onClick={() => setFormOpen(true)}
      >
        {t("schedule.createPolicy")}
      </Button>
      {formOpen ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label>{t("schedule.type")}</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as CompanyPolicyType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_off">{t("schedule.policyTimeOff")}</SelectItem>
                  <SelectItem value="availability">{t("schedule.availability")}</SelectItem>
                  <SelectItem value="scheduling_rules">{t("schedule.schedulingRules")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="policy-name">{t("schedule.name")}</Label>
              <Input
                id="policy-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
          {type === "time_off" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={fillWeekend}>
                  {t("schedule.weekendExample")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={fillWeekday}>
                  {t("schedule.weekdayExample")}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label>{t("schedule.unit")}</Label>
                  <Select value={unit} onValueChange={(value) => setUnit(value as TimeOffUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">{t("schedule.days")}</SelectItem>
                      <SelectItem value="hours">{t("schedule.hours")}</SelectItem>
                      <SelectItem value="minutes">{t("schedule.minutes")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="cap-week">{t("schedule.maxPerWeek")}</Label>
                  <Input
                    id="cap-week"
                    value={capWeek}
                    onChange={(event) => setCapWeek(event.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="cap-month">{t("schedule.maxPerMonth")}</Label>
                  <Input
                    id="cap-month"
                    value={capMonth}
                    onChange={(event) => setCapMonth(event.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="cap-year">{t("schedule.maxPerYear")}</Label>
                  <Input
                    id="cap-year"
                    value={capYear}
                    onChange={(event) => setCapYear(event.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="notice-days">{t("schedule.noticeInDays")}</Label>
                  <Input
                    id="notice-days"
                    value={noticeDays}
                    onChange={(event) => setNoticeDays(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day.value}
                    type="button"
                    size="sm"
                    variant={weekdays.includes(day.value) ? "default" : "outline"}
                    onClick={() => toggleWeekday(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("schedule.levels")}</p>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_LEVELS.map((level) => (
                <Button
                  key={level}
                  type="button"
                  size="sm"
                  variant={levelKeys.includes(level) ? "default" : "outline"}
                  onClick={() => toggleId(level, levelKeys, setLevelKeys)}
                >
                  {t(LEVEL_LABELS[level])}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Button
                key={role.id}
                type="button"
                size="sm"
                variant={roleIds.includes(role.id) ? "default" : "outline"}
                onClick={() => toggleId(role.id, roleIds, setRoleIds)}
              >
                {role.name}
              </Button>
            ))}
          </div>
          {(storesQuery.data ?? []).length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("schedule.stores")}</p>
              <div className="flex flex-wrap gap-2">
                {(storesQuery.data ?? []).map((store) => (
                  <Button
                    key={store.id}
                    type="button"
                    size="sm"
                    variant={storeIds.includes(store.id) ? "default" : "outline"}
                    onClick={() => toggleId(store.id, storeIds, setStoreIds)}
                  >
                    {store.name || store.id}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-1">
            <Label htmlFor="policy-people">{t("schedule.people")}</Label>
            <Input
              id="policy-people"
              value={userIds}
              placeholder={t("schedule.leaveEmptyOrPastePersonIdsSeparatedBy")}
              onChange={(event) => setUserIds(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("schedule.leaveAssignmentsEmptyToApplyThisPolicyToEveryone")}
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !companyId}>
            {isSaving ? t("schedule.savingPolicy") : t("schedule.savePolicy")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
