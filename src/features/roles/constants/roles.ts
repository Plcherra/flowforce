/**
 * Role constants
 */

import type { RoleKey } from "../types/permissions";

export const ROLE_ORDER: RoleKey[] = [
  "owner",
  "admin",
  "manager",
  "supervisor",
  "staff",
];

export const ROLE_LABELS: Record<RoleKey, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  staff: "Staff",
};

export const ROLE_ACCENTS: Record<RoleKey, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-rose-100 text-rose-800 border-rose-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  supervisor: "bg-emerald-100 text-emerald-800 border-emerald-200",
  staff: "bg-gray-100 text-gray-800 border-gray-200",
};
