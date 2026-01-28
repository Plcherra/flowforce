/**
 * Types for permissions and roles
 */

import type { LucideIcon } from "lucide-react";
import type { PermissionKey } from "@/hooks/useUserPermissions";
import type { PositionAssignment } from "@/hooks/usePositions";

export type RoleKey = "owner" | "admin" | "manager" | "supervisor" | "staff";

export type ModuleId =
  | "workspace"
  | "team"
  | "scheduling"
  | "operations"
  | "hr"
  | "finance"
  | "analytics"
  | "system";

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: PermissionKey[];
  sections?: string[];
  defaults: Record<RoleKey, boolean>;
  risk: "low" | "medium" | "high";
}

export interface RoleMetadata {
  id?: string;
  name: string;
  basePermissions: Record<string, boolean>;
  isSystemFallback?: boolean;
}

export interface Suggestion {
  id: string;
  role: RoleKey;
  moduleId: ModuleId;
  recommendation: boolean;
  reason: string;
  confidence: number;
  risk: "low" | "medium" | "high";
}

export type AssignmentRecord = PositionAssignment & {
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
  };
};
