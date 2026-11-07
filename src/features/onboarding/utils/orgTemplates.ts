export const ORG_BUSINESS_TYPES = ["cafe", "restaurant", "retail"] as const;

export type OrgBusinessType = (typeof ORG_BUSINESS_TYPES)[number];

export const ORG_PERMISSION_KEYS = [
  "schedule.view",
  "schedule.edit",
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
};

export type OrgSetup = {
  businessType: OrgBusinessType;
  departments: OrgDepartmentDraft[];
};

const FLOOR: OrgPermissionMap = {
  "schedule.view": true,
  "schedule.edit": false,
  "forms.submit": true,
  "tasks.view": true,
  "tasks.update": true,
};

const KITCHEN: OrgPermissionMap = {
  "schedule.view": true,
  "schedule.edit": false,
  "forms.submit": false,
  "tasks.view": true,
  "tasks.update": true,
};

const LEAD: OrgPermissionMap = { "schedule.edit": true };

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
): OrgDepartmentDraft {
  return { id, name, permissions, roles };
}

export function orgTemplate(type: OrgBusinessType): OrgSetup {
  if (type === "restaurant") {
    return {
      businessType: type,
      departments: [
        department("foh", "FOH", FLOOR, [
          role("cashier", "Cashier"),
          role("server", "Server"),
          role("host", "Host"),
        ]),
        department("boh", "BOH", KITCHEN, [
          role("cook", "Cook"),
          role("dish", "Dish"),
        ]),
      ],
    };
  }
  if (type === "retail") {
    return {
      businessType: type,
      departments: [
        department("floor", "Floor", FLOOR, [
          role("sales", "Sales"),
          role("cashier", "Cashier"),
        ]),
        department("stock", "Stock", KITCHEN, [role("stocker", "Stocker")]),
      ],
    };
  }
  return {
    businessType: "cafe",
    departments: [
      department("foh", "FOH", FLOOR, [
        role("cashier", "Cashier"),
        role("lead", "Shift lead", "manager", LEAD),
      ]),
      department("boh", "BOH", KITCHEN, [role("cook", "Cook")]),
    ],
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
    department.roles.map((role) => ({
      id: role.id,
      name: role.name.trim(),
      description: department.name.trim(),
      color: role.level === "manager" ? "#0f766e" : "#2563eb",
      icon: "Users",
      hierarchy_level: role.level === "manager" ? 2 : 1,
      product_level: role.level,
      permissions: effectivePermissions(department.permissions, role.overrides) as Record<
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
      department.roles.every((role) => role.name.trim().length > 0),
  );
}
