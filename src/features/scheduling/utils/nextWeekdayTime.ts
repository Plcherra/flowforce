const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayName = (typeof WEEKDAYS)[number];

export function isWeekdayName(value: string): value is WeekdayName {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function nextWeekdayTime(
  day: string,
  time: string,
  now = new Date(),
): Date {
  const weekday = day.trim().toLowerCase();
  const index = WEEKDAYS.indexOf(weekday as WeekdayName);
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

  if (index < 0) {
    if (result <= now) result.setDate(result.getDate() + 1);
    return result;
  }

  let delta = (index - result.getDay() + 7) % 7;
  if (delta === 0 && result <= now) delta = 7;
  result.setDate(result.getDate() + delta);
  return result;
}
