/**
 * Utility functions for user management
 */

import type { Employee } from "@/hooks/useEmployees";
import type { CompanyInvite } from "../types/userManagement";

export const DEFAULT_ROLES = [
  "staff",
  "supervisor",
  "manager",
  "admin",
  "owner",
];

/**
 * Check if invite is expired
 */
export function isInviteExpired(invite: CompanyInvite): boolean {
  return new Date(invite.expires_at) < new Date();
}

/**
 * Sort employees by name
 */
export function sortEmployeesByName(a: Employee, b: Employee): number {
  return `${a.first_name} ${a.last_name}`.localeCompare(
    `${b.first_name} ${b.last_name}`,
  );
}
