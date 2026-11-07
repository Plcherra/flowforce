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
import { rolesFromOrg, type OrgSetup } from "@/features/onboarding/utils/orgTemplates";

export const COFFEE_INDUSTRY = "Coffee shop";

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
  timezone: string;
  locale: SetupLocale;
  org: OrgSetup;
  store: { name: string; opens: string; closes: string };
  starter: AccountStarter;
  starterCopy: {
    shiftTitle: string;
    lists: Array<{ key: string; title: string; items: string[] }>;
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

export function jobsFromOrg(setup: OrgSetup) {
  return setup.departments.flatMap((departmentRow) =>
    departmentRow.roles
      .filter((item) => item.name.trim() && departmentRow.name.trim())
      .map((item) => ({
        key: item.id,
        name: item.name.trim(),
        departmentKey: departmentRow.id,
        departmentName: departmentRow.name.trim(),
        level: item.level,
      })),
  );
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
  return jobsFromOrg(workspace.org);
}

export function onboardingRecordsFromWorkspace(workspace: AccountWorkspaceInput) {
  const jobs = enabledJobRoles(workspace);
  const orgRoles = rolesFromOrg(workspace.org);
  const customRoles = [...getPlantedSystemRoles(), ...orgRoles];
  const positions = orgRoles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    roleId: "",
    permissions: role.permissions,
  }));
  return { customRoles, positions, jobs };
}

export function fixedOpsTemplate() {
  return {
    id: "ops",
    name: "FlowForce",
    description: "",
    industry: "cafe",
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
  timezone: string;
  locale: string;
}): "company" | null {
  if (!input.name.trim() || !input.timezone || !input.locale) return "company";
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
    showAt: null,
    dueTime: null,
    completeBy: null,
    timeMode: "legacy",
  });
}

export function readWorkspace(value: unknown): AccountWorkspaceInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Partial<AccountWorkspaceInput>;
  if (!LOCALES.includes(source.locale as SetupLocale)) return null;
  if (!source.org || !Array.isArray(source.org.departments)) return null;
  if (!source.store || typeof source.store.name !== "string") return null;
  if (!source.starterCopy || !Array.isArray(source.starterCopy.lists)) return null;
  return source as AccountWorkspaceInput;
}
