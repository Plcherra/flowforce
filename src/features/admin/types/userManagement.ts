/**
 * Types for user management feature
 */

import type { Database } from "@/integrations/supabase/types";
import type { Employee } from "@/hooks/useEmployees";

export type ViewMode = "department" | "role";
export type StatusFilter = "active" | "inactive" | "all";

export interface DepartmentRecord {
  id: string;
  name: string;
  color?: string | null;
}

export interface CompanyInvite {
  id: string;
  email: string;
  role: string;
  invite_code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  phone: string | null;
}

export interface CopilotInsight {
  id: string;
  type: "promotion" | "coaching" | "roleGap" | "inactive";
  title: string;
  description: string;
  employeeId?: string;
  positionId?: string;
}

export type UserRoleEnum = string;
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type PositionRow = Database["public"]["Tables"]["positions"]["Row"];
export type DepartmentRow = Database["public"]["Tables"]["departments"]["Row"];

export type ProfileWithRelations = ProfileRow & {
  department: (Pick<DepartmentRow, "id" | "name"> & {
    color?: string | null;
  }) | null;
  position:
    | (Pick<PositionRow, "id" | "name" | "role"> & { role: string | null })
    | null;
};

export const COMPANY_INVITES_TABLE = "company_invites" as const;
export const CREATE_COMPANY_INVITE_FN = "create_company_invite" as const;
export type CreateInviteArgs =
  Database["public"]["Functions"][typeof CREATE_COMPANY_INVITE_FN]["Args"];
export type CompanyInviteRow =
  Database["public"]["Tables"][typeof COMPANY_INVITES_TABLE]["Row"];

export interface InviteFormState {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  color: string | null;
  members: number;
  permissionCount: number;
}

export interface PositionCoverage {
  id: string;
  name: string;
  role: string | null;
  employees: number;
}

export type GroupedEmployees = Array<[string, Employee[]]>;
