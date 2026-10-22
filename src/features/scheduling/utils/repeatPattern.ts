export type RepeatFrequency = "daily" | "weekly" | "monthly" | "custom";
export type RepeatUnit = "days" | "weeks";

export type RepeatPattern = {
  frequency: RepeatFrequency;
  interval: number;
  unit: RepeatUnit;
  anchor: string;
};

export type RepeatChoice =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "every-2-weeks"
  | "every-15-days";

export const REPEAT_CHOICES: Array<{ id: RepeatChoice; label: string }> = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "every-2-weeks", label: "Every 2 weeks" },
  { id: "every-15-days", label: "Every 15 days" },
];

const DAY_MS = 86_400_000;

export function patternFromChoice(
  choice: RepeatChoice,
  anchor: string,
): RepeatPattern | null {
  if (choice === "none") return null;
  if (choice === "daily") {
    return { frequency: "daily", interval: 1, unit: "days", anchor };
  }
  if (choice === "weekly") {
    return { frequency: "weekly", interval: 1, unit: "weeks", anchor };
  }
  if (choice === "monthly") {
    return { frequency: "monthly", interval: 1, unit: "days", anchor };
  }
  if (choice === "every-2-weeks") {
    return { frequency: "custom", interval: 2, unit: "weeks", anchor };
  }
  return { frequency: "custom", interval: 15, unit: "days", anchor };
}

export function parseRepeatPattern(value: unknown): RepeatPattern | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<RepeatPattern>;
  const frequency = record.frequency;
  const unit = record.unit;
  const interval = Number(record.interval);
  const anchor = typeof record.anchor === "string" ? record.anchor : "";
  if (
    frequency !== "daily" &&
    frequency !== "weekly" &&
    frequency !== "monthly" &&
    frequency !== "custom"
  ) {
    return null;
  }
  if (unit !== "days" && unit !== "weeks") return null;
  if (!Number.isFinite(interval) || interval < 1 || !anchor) return null;
  return { frequency, interval, unit, anchor: anchor.slice(0, 10) };
}

export function occursOn(
  pattern: RepeatPattern | null | undefined,
  anchor: string,
  target: string,
): boolean {
  const anchorDate = parseUtcDate(anchor);
  const targetDate = parseUtcDate(target);
  if (Number.isNaN(anchorDate.getTime()) || Number.isNaN(targetDate.getTime())) {
    return false;
  }
  if (!pattern) return formatUtcDate(anchorDate) === formatUtcDate(targetDate);
  if (targetDate.getTime() < anchorDate.getTime()) return false;

  const days = Math.round((targetDate.getTime() - anchorDate.getTime()) / DAY_MS);
  if (pattern.frequency === "daily") return days % pattern.interval === 0;
  if (pattern.frequency === "monthly") {
    if (anchorDate.getUTCDate() !== targetDate.getUTCDate()) return false;
    const months =
      (targetDate.getUTCFullYear() - anchorDate.getUTCFullYear()) * 12 +
      (targetDate.getUTCMonth() - anchorDate.getUTCMonth());
    return months % pattern.interval === 0;
  }
  if (pattern.frequency === "weekly" || pattern.unit === "weeks") {
    if (anchorDate.getUTCDay() !== targetDate.getUTCDay()) return false;
    return Math.round(days / 7) % pattern.interval === 0;
  }
  return days % pattern.interval === 0;
}

export function availabilityAnchorDate(
  weekStart: string | null | undefined,
  dayOfWeek: number | null | undefined,
): string | null {
  if (!weekStart) return null;
  const date = parseUtcDate(weekStart);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + (dayOfWeek ?? 0));
  return formatUtcDate(date);
}

function parseUtcDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
