import { useState } from "react";
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
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { useTimeOffPolicies } from "@/features/scheduling/hooks/useTimeOffPolicies";
import {
  balanceLabel,
  remainingBalances,
  type TimeOffUnit,
  type TimeOffUsage,
} from "@/features/scheduling/utils/timeOffPolicy";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

type TimeOffPoliciesSectionProps = {
  companyId: string | null;
  canManage: boolean;
  userId: string | null;
  roleId: string | null;
  requests: Array<TimeOffUsage & { userId?: string | null }>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function optionalCap(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function TimeOffPoliciesSection({
  companyId,
  canManage,
  userId,
  roleId,
  requests,
}: TimeOffPoliciesSectionProps) {
  const { policies, savePolicy, isSaving } = useTimeOffPolicies(companyId);
  const { roles } = useCompanyRoles();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<TimeOffUnit>("days");
  const [capWeek, setCapWeek] = useState("");
  const [capMonth, setCapMonth] = useState("");
  const [capYear, setCapYear] = useState("");
  const [noticeDays, setNoticeDays] = useState("0");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState("");
  const [error, setError] = useState<string | null>(null);

  const balances = remainingBalances({
    policies,
    usage: requests.filter((request) => !request.userId || request.userId === userId),
    userId,
    roleId,
    asOf: todayIso(),
  });

  const fillWeekend = () => {
    setName("Weekend");
    setUnit("days");
    setCapWeek("");
    setCapMonth("2");
    setCapYear("24");
    setNoticeDays("0");
    setWeekdays([6, 0]);
  };

  const fillWeekday = () => {
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

  const toggleRole = (value: string) => {
    setRoleIds((current) =>
      current.includes(value)
        ? current.filter((id) => id !== value)
        : [...current, value],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name the policy.");
      return;
    }
    if (weekdays.length === 0) {
      setError("Choose at least one weekday.");
      return;
    }
    setError(null);
    try {
      await savePolicy({
        name,
        unit,
        capWeek: optionalCap(capWeek),
        capMonth: optionalCap(capMonth),
        capYear: optionalCap(capYear),
        eligibleWeekdays: weekdays,
        noticeDays: Math.max(0, Number(noticeDays) || 0),
        appliesToRoleIds: roleIds,
        appliesToUserIds: userIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      });
      setName("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the policy.");
    }
  };

  return (
    <section className="space-y-3" data-testid="time-off-policies">
      <div className="space-y-1">
        <h3 className="text-sm font-medium">Time off policies</h3>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">No policy applies yet.</p>
        ) : (
          balances.map((balance) => (
            <p
              key={balance.policy.id}
              className="text-sm text-muted-foreground"
              data-testid="time-off-balance"
            >
              {balance.policy.name}: {balanceLabel(balance)}
            </p>
          ))
        )}
      </div>
      {canManage ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={fillWeekend}>
              Weekend example
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={fillWeekday}>
              Weekday example
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="policy-name">Name</Label>
              <Input id="policy-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={(value) => setUnit(value as TimeOffUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cap-week">Max per week</Label>
              <Input id="cap-week" value={capWeek} onChange={(event) => setCapWeek(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cap-month">Max per month</Label>
              <Input id="cap-month" value={capMonth} onChange={(event) => setCapMonth(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="cap-year">Max per year</Label>
              <Input id="cap-year" value={capYear} onChange={(event) => setCapYear(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="notice-days">Notice in days</Label>
              <Input id="notice-days" value={noticeDays} onChange={(event) => setNoticeDays(event.target.value)} />
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
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <Button
                key={role.id}
                type="button"
                size="sm"
                variant={roleIds.includes(role.id) ? "default" : "outline"}
                onClick={() => toggleRole(role.id)}
              >
                {role.name}
              </Button>
            ))}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="policy-people">People</Label>
            <Input
              id="policy-people"
              value={userIds}
              placeholder="Leave empty, or paste person ids separated by commas"
              onChange={(event) => setUserIds(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Leave roles and people empty to apply this policy to everyone.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !companyId}>
            {isSaving ? "Saving..." : "Save policy"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
