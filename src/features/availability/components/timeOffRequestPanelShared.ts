import {
  differenceInCalendarDays,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from "date-fns";

import type { AvailabilityGrid } from "@/features/availability/components/AvailabilityRequestForm";

export const BASE_TIME_OFF_ALLOWANCE = 25;

export type TimeOffType = "vacation" | "sick" | "personal" | "other";

export const STATUS_STYLES = {
  pending: "bg-warning-muted text-warning-foreground border-warning/40",
  approved: "bg-success-muted text-success border-success/40",
  rejected: "bg-accent text-accent-foreground border-accent/40",
} as const;

export const TYPE_STYLES: Record<TimeOffType, string> = {
  vacation: "bg-primary/10 text-primary border-primary/40",
  sick: "bg-accent text-accent-foreground border-accent/40",
  personal: "bg-secondary/10 text-secondary border-secondary/40",
  other: "bg-muted text-foreground border-border",
};

export const REQUEST_TYPES: TimeOffType[] = [
  "vacation",
  "sick",
  "personal",
  "other",
];

export function calculateAvailabilityHours(grid?: AvailabilityGrid) {
  if (!grid) return 0;
  return Object.values(grid).reduce(
    (total, hours) => total + (Array.isArray(hours) ? hours.length : 0),
    0,
  );
}

export function formatRange(start: string, end: string) {
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (differenceInCalendarDays(endDate, startDate) === 0) {
    return format(startDate, "MMM d, yyyy");
  }
  return `${format(startDate, "MMM d, yyyy")} → ${format(endDate, "MMM d, yyyy")}`;
}

export function dayCount(start: string, end: string) {
  return (
    differenceInCalendarDays(
      endOfDay(parseISO(end)),
      startOfDay(parseISO(start)),
    ) + 1
  );
}
