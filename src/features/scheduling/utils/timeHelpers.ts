/**
 * Time utility functions
 */

/**
 * Convert time string to SQL time format (HH:mm:ss)
 */
export function toSqlTime(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length === 5 ? `${value}:00` : value;
}
