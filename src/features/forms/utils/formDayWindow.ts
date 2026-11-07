export type ClockPhase = "before" | "open" | "due" | "after";

export function parseClock(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function clockMinutes(clock: string): number {
  const parsed = parseClock(clock);
  if (!parsed) return 0;
  const [hours, minutes] = parsed.split(":").map(Number);
  return hours * 60 + minutes;
}

export function clockFromDate(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatClock(clock: string, locale: string): string {
  const parsed = parseClock(clock);
  if (!parsed) return clock;
  const [hours, minutes] = parsed.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Show, due, and complete-by are optional. Compare only the ones that are set. */
export function clockWindowProblem(
  showAt: string | null,
  dueTime: string | null,
  completeBy: string | null,
): "due" | "complete" | null {
  const show = showAt ? clockMinutes(showAt) : null;
  const due = dueTime ? clockMinutes(dueTime) : null;
  const complete = completeBy ? clockMinutes(completeBy) : null;
  if (show != null && due != null && due < show) return "due";
  if (due != null && complete != null && complete < due) return "complete";
  if (show != null && complete != null && complete <= show) return "complete";
  return null;
}

/**
 * Times are clocks on the shift day.
 * A missing show time starts at the beginning of that day.
 * A missing due time never marks the list due.
 * A missing complete-by time stays up until the day ends (or the list is done).
 */
export function shiftDayPhase(
  input: {
    showAt: string | null;
    dueTime: string | null;
    completeBy: string | null;
  },
  now: Date,
): ClockPhase {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const show = input.showAt ? clockMinutes(input.showAt) : 0;
  const due = input.dueTime ? clockMinutes(input.dueTime) : null;
  const complete = input.completeBy ? clockMinutes(input.completeBy) : null;
  if (nowMinutes < show) return "before";
  if (complete != null && nowMinutes >= complete) return "after";
  if (due != null && nowMinutes >= due) return "due";
  return "open";
}
