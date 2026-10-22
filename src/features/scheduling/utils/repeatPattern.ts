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
  | "every-15-days"
  | "custom";

export const REPEAT_CHOICES: Array<{ id: RepeatChoice; label: string }> = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "every-2-weeks", label: "Every 2 weeks (14 days)" },
  { id: "every-15-days", label: "Every 15 days" },
  { id: "custom", label: "Custom" },
];

const DAY_MS = 86_400_000;

export function customPattern(input: {
  interval: number;
  unit: RepeatUnit;
  anchor: string;
}): RepeatPattern | null {
  const interval = Math.floor(Number(input.interval));
  if (!Number.isFinite(interval) || interval < 1) return null;
  if (input.unit !== "days" && input.unit !== "weeks") return null;
  const anchor = input.anchor.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return null;
  return { frequency: "custom", interval, unit: input.unit, anchor };
}

export function patternFromChoice(
  choice: RepeatChoice,
  anchor: string,
  custom?: { interval: number; unit: RepeatUnit },
): RepeatPattern | null {
  if (choice === "none") return null;
  if (choice === "custom") {
    return customPattern({
      interval: custom?.interval ?? 1,
      unit: custom?.unit ?? "days",
      anchor,
    });
  }
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

export function choiceFromPattern(pattern: RepeatPattern | null): RepeatChoice {
  if (!pattern) return "none";
  if (pattern.frequency === "daily") return "daily";
  if (pattern.frequency === "monthly") return "monthly";
  if (pattern.frequency === "weekly" && pattern.interval === 1) return "weekly";
  if (pattern.frequency === "custom" && pattern.unit === "weeks" && pattern.interval === 2) {
    return "every-2-weeks";
  }
  if (pattern.frequency === "custom" && pattern.unit === "days" && pattern.interval === 15) {
    return "every-15-days";
  }
  if (pattern.frequency === "custom") return "custom";
  return "none";
}

export function applyChoiceToDays(
  current: Record<number, RepeatPattern | null>,
  selectedDays: number[],
  choice: RepeatChoice,
  dayAnchor: (day: number) => string,
  custom?: { interval: number; unit: RepeatUnit; anchor: string },
): Record<number, RepeatPattern | null> {
  const next = { ...current };
  for (const day of selectedDays) {
    if (choice === "none") {
      next[day] = null;
      continue;
    }
    if (choice === "custom") {
      next[day] = customPattern({
        interval: custom?.interval ?? 1,
        unit: custom?.unit ?? "days",
        anchor: custom?.anchor || dayAnchor(day),
      });
      continue;
    }
    next[day] = patternFromChoice(choice, dayAnchor(day));
  }
  return next;
}

export function nextThreeDates(
  pattern: RepeatPattern | null,
  start: string,
): string[] {
  const anchor = start.slice(0, 10);
  const dates: string[] = [];
  const cursor = parseUtcDate(anchor);
  if (Number.isNaN(cursor.getTime())) return [];
  for (let step = 0; step < 800 && dates.length < 3; step += 1) {
    const target = formatUtcDate(cursor);
    if (occursOn(pattern, anchor, target)) dates.push(target);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
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
