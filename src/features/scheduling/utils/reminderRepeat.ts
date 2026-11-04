export const REMINDER_REPEAT_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "weekdays", label: "Weekdays" },
] as const;

export type ReminderRepeat = (typeof REMINDER_REPEAT_OPTIONS)[number]["value"];

export function isReminderRepeat(value: string): value is ReminderRepeat {
  return REMINDER_REPEAT_OPTIONS.some((option) => option.value === value);
}

export function repeatLabel(
  interval: string | null | undefined,
  labels?: Partial<Record<ReminderRepeat | "once", string>>,
): string {
  const match = REMINDER_REPEAT_OPTIONS.find((option) => option.value === interval);
  if (match) return labels?.[match.value] ?? match.label;
  if (!interval) return labels?.once ?? "Once";
  return interval.charAt(0).toUpperCase() + interval.slice(1);
}

export function clockLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function remindAtForClock(time: string, now = new Date()): Date {
  const [hourText, minuteText] = time.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  const result = new Date(now);
  result.setSeconds(0, 0);
  result.setHours(
    Number.isFinite(hours) ? hours : 9,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  if (result <= now) result.setDate(result.getDate() + 1);
  return result;
}
