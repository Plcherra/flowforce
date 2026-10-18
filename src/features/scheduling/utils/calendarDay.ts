export function parseCalendarInstant(
  value: string | null | undefined,
): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function vendorEventStart(event: {
  start_time?: string | null;
  event_date?: string | null;
}): Date | null {
  return (
    parseCalendarInstant(event.start_time) ??
    parseCalendarInstant(event.event_date)
  );
}
