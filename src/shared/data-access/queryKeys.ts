import type { CompanyId, ModuleSlug, UserId } from "@/types/platform";

type QueryKeyPart =
  | string
  | number
  | boolean
  | null
  | undefined
  | Date
  | Record<string, unknown>;

const normalizePart = (part: QueryKeyPart) => {
  if (part instanceof Date) return part.toISOString();
  if (part === undefined) return null;
  return part;
};

export const createModuleQueryKey = (
  module: ModuleSlug,
  companyId?: CompanyId | null,
  ...parts: QueryKeyPart[]
) =>
  [
    "module",
    module,
    companyId ?? null,
    ...parts.map((part) => normalizePart(part)),
  ] as const;

export const createUserQueryKey = (
  module: ModuleSlug,
  userId?: UserId | null,
  ...parts: QueryKeyPart[]
) =>
  [
    "user",
    module,
    userId ?? null,
    ...parts.map((part) => normalizePart(part)),
  ] as const;

export const moduleQueryKeys = {
  inventory: {
    root: (companyId?: CompanyId | null) =>
      createModuleQueryKey("inventory", companyId),
    items: (companyId?: CompanyId | null) =>
      createModuleQueryKey("inventory", companyId, "items"),
    locations: (companyId?: CompanyId | null) =>
      createModuleQueryKey("inventory", companyId, "locations"),
    counts: (companyId?: CompanyId | null, status?: string | null) =>
      createModuleQueryKey("inventory", companyId, "counts", status),
    purchasing: (companyId?: CompanyId | null, status?: string | null) =>
      createModuleQueryKey("purchasing", companyId, "orders", status),
  },
  scheduling: {
    root: (companyId?: CompanyId | null) =>
      createModuleQueryKey("schedule", companyId),
    week: (companyId?: CompanyId | null, weekStart?: string | Date | null) =>
      createModuleQueryKey("schedule", companyId, "week", weekStart),
    availability: (companyId?: CompanyId | null, userId?: UserId | null) =>
      createModuleQueryKey("schedule", companyId, "availability", userId),
    timeOff: (companyId?: CompanyId | null, status?: string | null) =>
      createModuleQueryKey("schedule", companyId, "time-off", status),
  },
  tasks: {
    root: (companyId?: CompanyId | null) =>
      createModuleQueryKey("tasks", companyId),
    list: (companyId?: CompanyId | null, filters?: Record<string, unknown>) =>
      createModuleQueryKey("tasks", companyId, "list", filters),
    timeline: (companyId?: CompanyId | null, taskId?: string | null) =>
      createModuleQueryKey("tasks", companyId, "timeline", taskId),
    notifications: (userId?: UserId | null) =>
      createUserQueryKey("tasks", userId, "notifications"),
  },
  employees: {
    root: (companyId?: CompanyId | null) =>
      createModuleQueryKey("team", companyId),
    directory: (companyId?: CompanyId | null) =>
      createModuleQueryKey("team", companyId, "directory"),
    invites: (companyId?: CompanyId | null) =>
      createModuleQueryKey("team", companyId, "invites"),
    departments: (companyId?: CompanyId | null) =>
      createModuleQueryKey("team", companyId, "departments"),
  },
  analytics: {
    root: (companyId?: CompanyId | null) =>
      createModuleQueryKey("analytics", companyId),
    reports: (companyId?: CompanyId | null, range?: string | null) =>
      createModuleQueryKey("reports", companyId, "reports", range),
    kpis: (companyId?: CompanyId | null, range?: string | null) =>
      createModuleQueryKey("analytics", companyId, "kpis", range),
  },
} as const;

