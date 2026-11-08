export function formatChatTime(
  value: string | null | undefined,
  locale: string,
  now = new Date(),
): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === now.toDateString();
  return new Intl.DateTimeFormat(locale, sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  ).format(date);
}
