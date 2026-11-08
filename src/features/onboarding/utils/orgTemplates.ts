export const ORG_PERMISSION_KEYS = [
  "schedule.view",
  "schedule.create",
  "schedule.edit",
  "schedule.assign",
  "schedule.delete",
  "forms.submit",
  "tasks.view",
  "tasks.update",
] as const;

export type OrgPermissionKey = (typeof ORG_PERMISSION_KEYS)[number];

export type OrgPermissionMap = Partial<Record<OrgPermissionKey, boolean>>;

export type OrgRoleDraft = {
  id: string;
  name: string;
  level: "staff" | "manager";
  overrides: OrgPermissionMap;
};

export type OrgDepartmentDraft = {
  id: string;
  name: string;
  permissions: OrgPermissionMap;
  roles: OrgRoleDraft[];
  solo?: boolean;
};

export type OrgSetup = {
  businessType: "cafe";
  start?: "template" | "scratch";
  departments: OrgDepartmentDraft[];
};

const STAFF_SCHEDULE: OrgPermissionMap = {
  "schedule.view": true,
  "schedule.create": false,
  "schedule.edit": false,
  "schedule.assign": false,
  "schedule.delete": false,
};

const FOH: OrgPermissionMap = {
  ...STAFF_SCHEDULE,
  "forms.submit": true,
  "tasks.view": true,
  "tasks.update": true,
};

const PREP: OrgPermissionMap = {
  ...STAFF_SCHEDULE,
  "forms.submit": true,
  "tasks.view": true,
  "tasks.update": true,
};

const MANAGER: OrgPermissionMap = {
  "schedule.view": true,
  "schedule.create": true,
  "schedule.edit": true,
  "schedule.assign": true,
  "schedule.delete": true,
  "forms.submit": true,
  "tasks.view": true,
  "tasks.update": true,
};

// Shift lead is the coffee-shop supervisor: assign and edit, not create or delete.
const LEAD: OrgPermissionMap = {
  "schedule.edit": true,
  "schedule.assign": true,
};

const NAME_FALLBACKS: Record<string, string> = {
  "onboarding.org.names.foh": "FOH",
  "onboarding.org.names.boh": "BOH",
  "onboarding.org.names.cashier": "Cashier",
  "onboarding.org.names.barista": "Barista",
  "onboarding.org.names.shiftLead": "Shift lead",
  "onboarding.org.names.bakerPrep": "Baker/Prep",
  "onboarding.org.names.manager": "Manager",
};

function label(name: (key: string) => string, key: string) {
  const value = name(key).trim();
  if (!value || value === key) return NAME_FALLBACKS[key] ?? "";
  return value;
}

function role(
  id: string,
  name: string,
  level: OrgRoleDraft["level"] = "staff",
  overrides: OrgPermissionMap = {},
): OrgRoleDraft {
  return { id, name, level, overrides };
}

function department(
  id: string,
  name: string,
  permissions: OrgPermissionMap,
  roles: OrgRoleDraft[],
  solo = false,
): OrgDepartmentDraft {
  return { id, name, permissions, roles, ...(solo ? { solo: true } : {}) };
}

function randomId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function coffeeShopStarter(name: (key: string) => string): OrgSetup {
  return {
    businessType: "cafe",
    start: "template",
    departments: [
      department("foh", label(name, "onboarding.org.names.foh"), FOH, [
        role("cashier", label(name, "onboarding.org.names.cashier")),
        role("barista", label(name, "onboarding.org.names.barista")),
        role("lead", label(name, "onboarding.org.names.shiftLead"), "manager", LEAD),
      ]),
      department("boh", label(name, "onboarding.org.names.boh"), PREP, [
        role("baker", label(name, "onboarding.org.names.bakerPrep")),
      ]),
      department(
        "manager",
        label(name, "onboarding.org.names.manager"),
        MANAGER,
        [role("manager", label(name, "onboarding.org.names.manager"), "manager")],
        true,
      ),
    ],
  };
}

export function emptyOrgSetup(): OrgSetup {
  return { businessType: "cafe", start: "scratch", departments: [] };
}

export function newDepartment(): OrgDepartmentDraft {
  return {
    id: `department-${randomId()}`,
    name: "",
    permissions: {},
    roles: [],
  };
}

export function newRole(departmentId: string): OrgRoleDraft {
  return {
    id: `${departmentId}-role-${randomId()}`,
    name: "",
    level: "staff",
    overrides: {},
  };
}

export function effectivePermissions(
  departmentPermissions: OrgPermissionMap,
  overrides: OrgPermissionMap,
): OrgPermissionMap {
  const next: OrgPermissionMap = { ...departmentPermissions };
  for (const key of ORG_PERMISSION_KEYS) {
    if (overrides[key] !== undefined) next[key] = overrides[key];
  }
  return next;
}

export function permissionValue(
  departmentPermissions: OrgPermissionMap,
  overrides: OrgPermissionMap,
  key: OrgPermissionKey,
): boolean {
  if (overrides[key] !== undefined) return Boolean(overrides[key]);
  return Boolean(departmentPermissions[key]);
}

export function withRoleOverride(
  overrides: OrgPermissionMap,
  departmentPermissions: OrgPermissionMap,
  key: OrgPermissionKey,
  value: boolean,
): OrgPermissionMap {
  const next = { ...overrides };
  if (Boolean(departmentPermissions[key]) === value) {
    delete next[key];
  } else {
    next[key] = value;
  }
  return next;
}

export function rolesFromOrg(setup: OrgSetup): Array<{
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  product_level: "staff" | "manager";
  permissions: Record<string, boolean>;
  is_system_role: boolean;
  is_active: boolean;
}> {
  return setup.departments.flatMap((department) =>
    department.roles.map((entry) => ({
      id: entry.id,
      name: entry.name.trim(),
      description: department.solo ? entry.name.trim() : department.name.trim(),
      color: entry.level === "manager" ? "#0f766e" : "#2563eb",
      icon: "Users",
      hierarchy_level: entry.level === "manager" ? 2 : 1,
      product_level: entry.level,
      permissions: effectivePermissions(department.permissions, entry.overrides) as Record<
        string,
        boolean
      >,
      is_system_role: false,
      is_active: true,
    })),
  );
}

export function orgReady(setup: OrgSetup | null): boolean {
  if (!setup || setup.departments.length === 0) return false;
  return setup.departments.every(
    (department) =>
      department.name.trim().length > 0 &&
      department.roles.length > 0 &&
      department.roles.every((entry) => entry.name.trim().length > 0),
  );
}
