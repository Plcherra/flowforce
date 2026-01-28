/**
 * Shared string manipulation utilities
 */

/**
 * Convert string to URL-friendly slug
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build initials from first and last name
 */
export function buildInitials(
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = firstName?.[0] ?? "";
  const last = lastName?.[0] ?? "";
  return (first + last || "TM").toUpperCase();
}

/**
 * Format role label for display (capitalize and replace underscores)
 */
export function formatRoleLabel(role?: string | null): string {
  if (!role) return "Unassigned";
  return role
    .replace(/_/g, " ")
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Truncate string to specified length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format name for sorting/comparison
 */
export function formatNameForSort(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return `${firstName || ""} ${lastName || ""}`.trim();
}
