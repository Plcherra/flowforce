/** Opens the calendar on the day, and on the event when the day has one. */
export function calendarEventHref(input: {
  date?: string | null;
  eventId?: string | null;
}): string {
  const params = new URLSearchParams();
  if (input.date) params.set("date", input.date);
  if (input.eventId) params.set("event", input.eventId);
  const query = params.toString();
  return query ? `/app/calendar?${query}` : "/app/calendar";
}
