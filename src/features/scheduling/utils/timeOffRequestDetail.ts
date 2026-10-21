import { format } from "date-fns";

export interface TimeOffSpan {
  user_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  user?: unknown;
}

export function timeOffStatusLabel(
  status: string | null | undefined,
): "pending" | "approved" | "rejected" {
  const value = (status ?? "").toLowerCase();
  if (value === "approved") return "approved";
  if (value === "denied" || value === "rejected" || value === "cancelled") {
    return "rejected";
  }
  return "pending";
}

export function showsRequestedOff(status: string | null | undefined): boolean {
  const label = timeOffStatusLabel(status);
  return label === "pending" || label === "approved";
}

export function localDayKey(day: Date): string {
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

export function requestCoversDay(request: TimeOffSpan, day: Date): boolean {
  if (!showsRequestedOff(request.status)) return false;
  const key = localDayKey(day);
  const start = (request.start_date ?? "").slice(0, 10);
  const end = (request.end_date ?? request.start_date ?? "").slice(0, 10);
  if (!start) return false;
  return key >= start && key <= (end || start);
}

export function isRequestedOffDay(
  requests: TimeOffSpan[],
  userId: string,
  day: Date,
): boolean {
  return requests.some(
    (request) => request.user_id === userId && requestCoversDay(request, day),
  );
}

export function formatRequestedWhen(value: string | null | undefined): string {
  if (!value) return "Not set";
  const dateOnly = value.slice(0, 10);
  const hasTime = value.includes("T");
  const parsed = hasTime ? new Date(value) : new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, hasTime ? "MMM d, yyyy p" : "MMM d, yyyy");
}

export function timeLeftLabel(
  start: string | null | undefined,
  now = new Date(),
): string {
  if (!start) return "Time left unavailable";
  const dateOnly = start.slice(0, 10);
  const target = start.includes("T")
    ? new Date(start)
    : new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(target.getTime())) return "Time left unavailable";
  const minutes = Math.round((target.getTime() - now.getTime()) / 60000);
  if (minutes <= 0) return "Time left: started";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `Time left: ${days}d ${hours}h`;
  if (hours > 0) return `Time left: ${hours}h ${mins}m`;
  return `Time left: ${mins}m`;
}
