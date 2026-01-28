/**
 * Shared date formatting and manipulation utilities
 */

import { format, parseISO, isSameDay as dateFnsIsSameDay } from "date-fns";

/**
 * Safely parse a date string, returning null if invalid
 *
 * @param value - Date string to parse (ISO format or any valid date string)
 * @returns Parsed Date object or null if invalid/empty
 *
 * @example
 * ```ts
 * const date = safeDate("2024-01-15"); // Date object
 * const invalid = safeDate("invalid"); // null
 * const empty = safeDate(null); // null
 * ```
 */
export function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format date for display using locale-aware formatting
 *
 * @param value - Date string to format
 * @returns Formatted date string or "—" if invalid/empty
 *
 * @example
 * ```ts
 * formatDate("2024-01-15"); // "1/15/2024" (locale-dependent)
 * formatDate(null); // "—"
 * ```
 */
export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = safeDate(value);
  if (!date) return "—";
  return date.toLocaleDateString();
}

/**
 * Format date and time for display using date-fns format
 *
 * @param date - Date string or Date object to format
 * @param formatStr - date-fns format string (default: "MMM d, yyyy · HH:mm")
 * @returns Formatted date-time string or "Not set" if invalid/empty
 *
 * @example
 * ```ts
 * formatDateTime("2024-01-15T10:30:00Z"); // "Jan 15, 2024 · 10:30"
 * formatDateTime(new Date(), "yyyy-MM-dd"); // "2024-01-15"
 * ```
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  formatStr: string = "MMM d, yyyy · HH:mm",
): string {
  if (!date) return "Not set";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (Number.isNaN(dateObj.getTime())) return "Not set";
  return format(dateObj, formatStr);
}

/**
 * Format date time with locale-aware formatting
 */
export function formatDateTimeLocale(
  date: string | Date | null | undefined,
): string {
  if (!date) return "Not set";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(dateObj.getTime())) return "Not set";
  return dateObj.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(a: Date | string, b: Date | string): boolean {
  const dateA = typeof a === "string" ? parseISO(a) : a;
  const dateB = typeof b === "string" ? parseISO(b) : b;
  return dateFnsIsSameDay(dateA, dateB);
}

/**
 * Get days count from time range
 */
export function getDaysFromTimeRange(
  timeRange: "7d" | "30d" | "90d" | "1y",
): number {
  const map: Record<string, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "1y": 365,
  };
  return map[timeRange] ?? 30;
}
