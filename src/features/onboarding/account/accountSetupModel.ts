import { withFormDistribution } from "@/features/forms/utils/formDistribution";
import { emptyTaskAudience } from "@/features/tasks/utils/taskAudience";
import {
  clampPermissionsToProductLevel,
  type ProductLevel,
} from "@/features/roles/constants/productLevels";
import {
  getPlantedSystemRoles,
  getProductRoleDefinition,
} from "@/features/roles/constants/productRoles";

export const BUSINESS_TYPES = ["restaurant", "cafe", "retail", "other"] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const LOCALES = ["en", "es", "pt", "fr", "it", "de"] as const;

export type SetupLocale = (typeof LOCALES)[number];

export const PLAIN_PERMISSIONS = [
  "viewOwnSchedules",
  "formsSubmit",
  "scheduleEdit",
  "formsRead",
  "manageUsers",
  "reportsView",
] as const;

export type PlainPermission = (typeof PLAIN_PERMISSIONS)[number];

export type PermissionChecks = Record<PlainPermission, boolean>;

const PERMISSION_KEY: Record<PlainPermission, string> = {
  viewOwnSchedules: "viewOwnSchedules",
  formsSubmit: "forms.submit",
  scheduleEdit: "schedule.edit",
  formsRead: "forms.submissions.read",
  manageUsers: "manageUsers",
  reportsView: "reports.view",
};

const MANAGER_PERMISSIONS = new Set<PlainPermission>([
  "scheduleEdit",
  "formsRead",
  "manageUsers",
  "reportsView",
]);

export type SetupRole = {
  key: string;
  enabled: boolean;
  permissions: PermissionChecks;
};

export type SetupDepartment = {
  key: string;
  defaults: PermissionChecks;
  roles: SetupRole[];
};

export type AccountStarter = "skip" | "shift" | "lists";

export type AccountWorkspaceInput = {
  businessType: BusinessType;
  timezone: string;
  locale: SetupLocale;
  departments: Array<{
    key: string;
    name: string;
    defaults: PermissionChecks;
    roles: Array<{
      key: string;
      name: string;
      enabled: boolean;
      permissions: PermissionChecks;
    }>;
  }>;
  store: { name: string; opens: string; closes: string };
  starter: AccountStarter;
  starterCopy: {
    openingTitle: string;
    closingTitle: string;
    openingItems: string[];
    closingItems: string[];
    shiftTitle: string;
  };
};

export const FIXED_OPS_SECTIONS = [
  "dashboard",
  "scheduling",
  "tasks",
  "messages",
  "employees",
  "forms",
  "company-updates",
  "calendar",
];

export const DEFAULT_COMPANY_SIZE = "1-10 employees";

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export function staffChecks(): PermissionChecks {
  return {
    viewOwnSchedules: true,
    formsSubmit: true,
    scheduleEdit: false,
    formsRead: false,
    manageUsers: false,
    reportsView: false,
  };
}

export function cloneChecks(checks: PermissionChecks): PermissionChecks {
  return { ...checks };
}

function role(key: string, permissions: PermissionChecks): SetupRole {
  return { key, enabled: true, permissions: cloneChecks(permissions) };
}

function department(key: string, roleKeys: string[]): SetupDepartment {
  const defaults = staffChecks();
  return {
    key,
    defaults,
    roles: roleKeys.map((key) => role(key, defaults)),
  };
}

export function templateFor(type: BusinessType): SetupDepartment[] {
  if (type === "cafe") {
    return [department("foh", ["barista", "cashier"]), department("boh", ["cook"])];
  }
  if (type === "retail") {
    return [department("floor", ["cashier", "stocker"]), department("back", ["receiver"])];
  }
  if (type === "other") {
    return [department("team", ["teammate"])];
  }
  return [department("foh", ["cashier", "server"]), department("boh", ["cook", "prep"])];
}

export function accessLevelFor(checks: PermissionChecks): "staff" | "manager" {
  for (const key of PLAIN_PERMISSIONS) {
    if (MANAGER_PERMISSIONS.has(key) && checks[key]) return "manager";
  }
  return "staff";
}

export function setDepartmentPermission(
  departmentRow: SetupDepartment,
  key: PlainPermission,
  value: boolean,
): SetupDepartment {
  const previous = departmentRow.defaults[key];
  return {
    ...departmentRow,
    defaults: { ...departmentRow.defaults, [key]: value },
    roles: departmentRow.roles.map((item) => {
      if (item.permissions[key] !== previous) return item;
      return {
        ...item,
        permissions: { ...item.permissions, [key]: value },
      };
    }),
  };
}

export function setRolePermission(
  departmentRow: SetupDepartment,
  roleKey: string,
  key: PlainPermission,
  value: boolean,
): SetupDepartment {
  return {
    ...departmentRow,
    roles: departmentRow.roles.map((item) =>
      item.key === roleKey
        ? { ...item, permissions: { ...item.permissions, [key]: value } }
        : item,
    ),
  };
}

export function roleOverridesDepartment(
  departmentRow: SetupDepartment,
  roleRow: SetupRole,
): boolean {
  return PLAIN_PERMISSIONS.some(
    (key) => roleRow.permissions[key] !== departmentRow.defaults[key],
  );
}

export function permissionsForRole(
  level: "staff" | "manager",
  checks: PermissionChecks,
): Record<string, boolean> {
  const productLevel: ProductLevel = level;
  const base: Record<string, boolean> = {};
  for (const [key, enabled] of Object.entries(
    getProductRoleDefinition(productLevel).permissions,
  )) {
    if (enabled) base[key] = true;
  }
  for (const key of PLAIN_PERMISSIONS) {
    base[PERMISSION_KEY[key]] = checks[key] === true;
  }
  return clampPermissionsToProductLevel(productLevel, base);
}

export function enabledJobRoles(workspace: AccountWorkspaceInput) {
  return workspace.departments.flatMap((departmentRow) =>
    departmentRow.roles
      .filter((item) => item.enabled && item.name.trim())
      .map((item) => ({
        key: item.key,
        name: item.name.trim(),
        departmentKey: departmentRow.key,
        departmentName: departmentRow.name.trim(),
        level: accessLevelFor(item.permissions),
        permissions: item.permissions,
      })),
  );
}

export function onboardingRecordsFromWorkspace(workspace: AccountWorkspaceInput) {
  const jobs = enabledJobRoles(workspace);
  const customRoles = [
    ...getPlantedSystemRoles(),
    ...jobs.map((job) => {
      const definition = getProductRoleDefinition(job.level);
      return {
        id: job.key,
        name: job.name,
        description: job.departmentName,
        color: definition.color,
        icon: definition.icon,
        hierarchy_level: definition.hierarchy_level,
        product_level: job.level,
        permissions: permissionsForRole(job.level, job.permissions),
        is_system_role: false,
        is_active: true,
      };
    }),
  ];
  const positions = jobs.map((job) => ({
    id: job.key,
    name: job.name,
    description: job.departmentName,
    roleId: "",
    permissions: permissionsForRole(job.level, job.permissions),
  }));
  return { customRoles, positions, jobs };
}

export function industryForBusinessType(type: BusinessType): string {
  if (type === "retail") return "Retail";
  if (type === "other") return "Other";
  return "Food & Beverage";
}

export function fixedOpsTemplate(type: BusinessType) {
  return {
    id: "ops",
    name: "FlowForce",
    description: "",
    industry: type,
    icon: "LayoutDashboard",
    sections: FIXED_OPS_SECTIONS,
    defaultRoles: [] as string[],
    customFields: {},
    suggestedPositions: {},
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function signupProblem(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): "name" | "email" | "password" | null {
  if (!input.firstName.trim() || !input.lastName.trim()) return "name";
  if (!EMAIL.test(input.email.trim())) return "email";
  if (input.password.length < 8) return "password";
  return null;
}

export function companyProblem(input: {
  name: string;
  businessType: string;
  timezone: string;
  locale: string;
}): "company" | null {
  if (!input.name.trim() || !input.businessType || !input.timezone || !input.locale) {
    return "company";
  }
  if (!BUSINESS_TYPES.includes(input.businessType as BusinessType)) return "company";
  if (!LOCALES.includes(input.locale as SetupLocale)) return "company";
  return null;
}

export function departmentsProblem(departments: readonly SetupDepartment[]): "role" | null {
  const enabled = departments.some((departmentRow) =>
    departmentRow.roles.some((item) => item.enabled),
  );
  return enabled ? null : "role";
}

export function storeProblem(store: { name: string; opens: string; closes: string }): "store" | null {
  if (!store.name.trim() || !CLOCK.test(store.opens) || !CLOCK.test(store.closes)) {
    return "store";
  }
  if (store.opens === store.closes) return "store";
  return null;
}

export function inviteEmailProblem(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return !EMAIL.test(trimmed);
}

export function workingHoursFor(opens: string, closes: string) {
  return {
    start: opens,
    end: closes,
    days: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
  };
}

export function clockOnNextDay(opens: string, closes: string, now = new Date()) {
  const [openHour, openMinute] = opens.split(":").map(Number);
  const [closeHour, closeMinute] = closes.split(":").map(Number);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() + 1);
  start.setUTCHours(openHour, openMinute, 0, 0);
  const end = new Date(start);
  end.setUTCHours(closeHour, closeMinute, 0, 0);
  if (end.getTime() <= start.getTime()) end.setUTCDate(end.getUTCDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function starterListSettings(roleId: string, showFrom: string, dueAt: string) {
  return withFormDistribution(null, {
    recordKind: "list",
    roleIds: roleId ? [roleId] : [],
    fillAudience: emptyTaskAudience("company"),
    seeAudience: emptyTaskAudience("company"),
    showFrom,
    dueAt,
  });
}

export function readWorkspace(value: unknown): AccountWorkspaceInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Partial<AccountWorkspaceInput>;
  if (!BUSINESS_TYPES.includes(source.businessType as BusinessType)) return null;
  if (!LOCALES.includes(source.locale as SetupLocale)) return null;
  if (!source.store || typeof source.store.name !== "string") return null;
  if (!Array.isArray(source.departments)) return null;
  return source as AccountWorkspaceInput;
}
