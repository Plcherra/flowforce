export type TimeOffUnit = "hours" | "days" | "minutes";

export type TimeOffPolicy = {
  id: string;
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

export type TimeOffUsage = {
  policyId: string;
  startDate: string;
  endDate: string;
  status: string;
};

export type PeriodBalance = {
  cap: number;
  used: number;
  remaining: number;
};

export type PolicyBalance = {
  policy: TimeOffPolicy;
  week: PeriodBalance | null;
  month: PeriodBalance | null;
  year: PeriodBalance | null;
};

export type PolicyFit =
  | { ok: true; amount: number }
  | { ok: false; reason: string };

const DAY_MS = 86_400_000;

export function policyAppliesTo(
  policy: TimeOffPolicy,
  userId: string | null | undefined,
  roleId: string | null | undefined,
): boolean {
  const roles = policy.appliesToRoleIds;
  const people = policy.appliesToUserIds;
  if (roles.length === 0 && people.length === 0) return true;
  if (userId && people.includes(userId)) return true;
  if (roleId && roles.includes(roleId)) return true;
  return false;
}

export function requestFitsPolicy(input: {
  policy: TimeOffPolicy;
  startDate: string;
  endDate: string;
  usage: TimeOffUsage[];
  userId?: string | null;
  roleId?: string | null;
  asOf: string;
}): PolicyFit {
  const { policy } = input;
  if (!policyAppliesTo(policy, input.userId, input.roleId)) {
    return { ok: false, reason: "This policy does not apply to you." };
  }

  const dates = datesInRange(input.startDate, input.endDate);
  if (dates.length === 0) {
    return { ok: false, reason: "End date must be on or after the start date." };
  }

  const allowed = new Set(policy.eligibleWeekdays);
  if (dates.some((date) => !allowed.has(date.getUTCDay()))) {
    return {
      ok: false,
      reason: "That range includes a day this policy does not cover.",
    };
  }

  const notice = calendarDaysBetween(input.asOf, input.startDate);
  if (notice < policy.noticeDays) {
    return {
      ok: false,
      reason: `This policy needs ${policy.noticeDays} days of notice.`,
    };
  }

  for (const kind of ["week", "month", "year"] as const) {
    const cap = capFor(policy, kind);
    if (cap == null) continue;
    const groups = groupAmount(policy, dates, kind);
    for (const [key, amount] of groups) {
      const used = usedInPeriod(policy, input.usage, kind, key);
      if (used + amount > cap) {
        return {
          ok: false,
          reason: `That request is over the ${kind} cap of ${cap} ${policy.unit}.`,
        };
      }
    }
  }

  return { ok: true, amount: amountForDates(policy.unit, dates) };
}

export function remainingBalances(input: {
  policies: TimeOffPolicy[];
  usage: TimeOffUsage[];
  userId?: string | null;
  roleId?: string | null;
  asOf: string;
}): PolicyBalance[] {
  const asOfDate = parseUtcDate(input.asOf);
  return input.policies
    .filter((policy) => policyAppliesTo(policy, input.userId, input.roleId))
    .map((policy) => ({
      policy,
      week: periodBalance(policy, input.usage, "week", periodKey(asOfDate, "week")),
      month: periodBalance(policy, input.usage, "month", periodKey(asOfDate, "month")),
      year: periodBalance(policy, input.usage, "year", periodKey(asOfDate, "year")),
    }));
}

export function balanceLabel(balance: PolicyBalance): string {
  const parts: string[] = [];
  if (balance.week) {
    parts.push(`${formatAmount(balance.week.remaining, balance.policy.unit)} left this week`);
  }
  if (balance.month) {
    parts.push(`${formatAmount(balance.month.remaining, balance.policy.unit)} left this month`);
  }
  if (balance.year) {
    parts.push(`${formatAmount(balance.year.remaining, balance.policy.unit)} left this year`);
  }
  if (parts.length === 0) return "No cap on this policy";
  return parts.join(" · ");
}

function periodBalance(
  policy: TimeOffPolicy,
  usage: TimeOffUsage[],
  kind: "week" | "month" | "year",
  key: string,
): PeriodBalance | null {
  const cap = capFor(policy, kind);
  if (cap == null) return null;
  const used = usedInPeriod(policy, usage, kind, key);
  return { cap, used, remaining: Math.max(cap - used, 0) };
}

function capFor(policy: TimeOffPolicy, kind: "week" | "month" | "year"): number | null {
  if (kind === "week") return policy.capWeek;
  if (kind === "month") return policy.capMonth;
  return policy.capYear;
}

function usedInPeriod(
  policy: TimeOffPolicy,
  usage: TimeOffUsage[],
  kind: "week" | "month" | "year",
  key: string,
): number {
  let total = 0;
  for (const row of usage) {
    if (row.policyId !== policy.id || !countsTowardCap(row.status)) continue;
    const dates = datesInRange(row.startDate, row.endDate).filter(
      (date) =>
        policy.eligibleWeekdays.includes(date.getUTCDay()) &&
        periodKey(date, kind) === key,
    );
    total += amountForDates(policy.unit, dates);
  }
  return total;
}

function groupAmount(
  policy: TimeOffPolicy,
  dates: Date[],
  kind: "week" | "month" | "year",
): Map<string, number> {
  const groups = new Map<string, Date[]>();
  for (const date of dates) {
    const key = periodKey(date, kind);
    const bucket = groups.get(key) ?? [];
    bucket.push(date);
    groups.set(key, bucket);
  }
  return new Map(
    [...groups.entries()].map(([key, bucket]) => [
      key,
      amountForDates(policy.unit, bucket),
    ]),
  );
}

function countsTowardCap(status: string): boolean {
  const value = status.toLowerCase();
  return value === "pending" || value === "approved" || value === "requested";
}

function amountForDates(unit: TimeOffUnit, dates: Date[]): number {
  if (unit === "hours") return dates.length * 8;
  if (unit === "minutes") return dates.length * 480;
  return dates.length;
}

function formatAmount(amount: number, unit: TimeOffUnit): string {
  const rounded = Number.isInteger(amount) ? String(amount) : String(amount);
  return `${rounded} ${unit}`;
}

function datesInRange(start: string, end: string): Date[] {
  const first = parseUtcDate(start);
  const last = parseUtcDate(end);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || last < first) {
    return [];
  }
  const dates: Date[] = [];
  for (let cursor = first; cursor.getTime() <= last.getTime(); cursor = addUtcDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

function calendarDaysBetween(asOf: string, start: string): number {
  return Math.round((parseUtcDate(start).getTime() - parseUtcDate(asOf).getTime()) / DAY_MS);
}

function periodKey(date: Date, kind: "week" | "month" | "year"): string {
  if (kind === "year") return String(date.getUTCFullYear());
  if (kind === "month") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return formatUtcDate(addUtcDays(date, -date.getUTCDay()));
}

function parseUtcDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
