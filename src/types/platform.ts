import type { Database, Json } from "@/integrations/supabase/types";
import type { PermissionKey } from "@/lib/permissions/registry";

export type UUID = string;
export type ISODateString = string;
export type CurrencyCode = string;

export type SupabaseTableName = keyof Database["public"]["Tables"];
export type SupabaseViewName = keyof Database["public"]["Views"];
export type SupabaseFunctionName = keyof Database["public"]["Functions"];

export type TableRow<TTable extends SupabaseTableName> =
  Database["public"]["Tables"][TTable]["Row"];
export type TableInsert<TTable extends SupabaseTableName> =
  Database["public"]["Tables"][TTable]["Insert"];
export type TableUpdate<TTable extends SupabaseTableName> =
  Database["public"]["Tables"][TTable]["Update"];

export type ViewRow<TView extends SupabaseViewName> =
  Database["public"]["Views"][TView]["Row"];

export type CompanyRow = TableRow<"companies">;
export type CompanyMemberRow = TableRow<"company_members">;
export type CompanyRoleRow = TableRow<"company_roles">;
export type ProfileRow = TableRow<"profiles">;

export type CompanyId = UUID;
export type UserId = UUID;
export type MemberId = UUID;
export type RoleId = UUID;

export type UserRole =
  | "owner"
  | "company_admin"
  | "admin"
  | "manager"
  | "supervisor"
  | "staff"
  | "employee";

export type ModuleSlug =
  | "dashboard"
  | "schedule"
  | "tasks"
  | "messages"
  | "company_updates"
  | "forms"
  | "inventory"
  | "purchasing"
  | "waste"
  | "reports"
  | "team"
  | "settings"
  | "ai_insights"
  | "operations"
  | "analytics"
  | "learning"
  | "performance"
  | "recognition"
  | "custom_sections";

export type ModuleLifecycle = "production" | "beta" | "internal" | "hidden";

export type ModuleVisibilityReason =
  | "role_allowed"
  | "role_denied"
  | "permission_allowed"
  | "permission_denied"
  | "setup_complete"
  | "setup_required"
  | "feature_enabled"
  | "feature_disabled"
  | "internal_only";

export interface TenantScopedRecord {
  company_id: CompanyId;
}

export interface UserScopedRecord {
  user_id: UserId;
}

export interface TenantContextContract {
  companyId: CompanyId | null;
  userId: UserId | null;
  memberId?: MemberId | null;
  role?: UserRole | string | null;
  permissions?: PermissionKey[];
  isReady: boolean;
}

export interface CompanySummary {
  id: CompanyId;
  name: string;
  timezone?: string | null;
  currency?: CurrencyCode | null;
}

export interface ProfileSummary {
  id: UserId;
  company_id?: CompanyId | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: UserRole | string | null;
  avatar_url?: string | null;
}

export interface RoleSummary {
  id: RoleId;
  company_id?: CompanyId | null;
  name: string;
  description?: string | null;
  permissions?: Record<string, boolean> | Json | null;
  is_system_role?: boolean | null;
}

export interface ModuleVisibilityContract {
  module: ModuleSlug;
  lifecycle: ModuleLifecycle;
  visible: boolean;
  reasons: ModuleVisibilityReason[];
  requiredPermissions?: PermissionKey[];
  allowedRoles?: UserRole[];
}

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
  cause?: unknown;
}

export type AppResult<TData, TError extends AppError = AppError> =
  | { ok: true; data: TData; error?: never }
  | { ok: false; error: TError; data?: never };

export type ApiSuccess<TData = unknown> = {
  ok: true;
  data: TData;
  meta?: Record<string, unknown>;
};

export type ApiFailure<TError extends AppError = AppError> = {
  ok: false;
  error: TError;
  meta?: Record<string, unknown>;
};

export type ApiResult<TData = unknown, TError extends AppError = AppError> =
  | ApiSuccess<TData>
  | ApiFailure<TError>;

