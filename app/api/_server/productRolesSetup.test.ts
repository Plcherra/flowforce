import assert from "node:assert/strict";
import {
  applyOnboardingCompanyRoles,
  ensureProductCompanyRoles,
} from "./productRolesSetup";
import {
  getDefaultProductRoleDefinitions,
  getProductRolePermissions,
  normalizeProductRoleKey,
} from "@/features/roles/constants/productRoles";

type RoleRow = {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  hierarchy_level?: number;
  product_level?: string;
  permissions?: Record<string, boolean>;
  is_system_role?: boolean;
  is_active?: boolean | null;
  created_by?: string;
};

type UpdateRecord = {
  id: string;
  values: Record<string, unknown>;
};

function createMemoryRolesClient(rows: RoleRow[]) {
  const updates: UpdateRecord[] = [];
  const inserts: RoleRow[] = [];

  const client = {
    from(table: string) {
      assert.equal(table, "company_roles");
      return {
        select(_columns: string) {
          return {
            eq(column: string, value: string) {
              const data = rows.filter(
                (row) => (row as Record<string, unknown>)[column] === value,
              );
              return Promise.resolve({ data, error: null });
            },
          };
        },
        update(values: Record<string, unknown>) {
          return {
            eq(column1: string, value1: string) {
              return {
                eq(column2: string, value2: string) {
                  for (const row of rows) {
                    const record = row as Record<string, unknown>;
                    if (record[column1] === value1 && record[column2] === value2) {
                      updates.push({ id: row.id, values: { ...values } });
                      Object.assign(row, values);
                    }
                  }
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
        insert(values: Record<string, unknown>) {
          const row: RoleRow = {
            id: `inserted-${inserts.length + 1}`,
            company_id: String(values.company_id),
            name: String(values.name),
            description: values.description as string | undefined,
            color: values.color as string | undefined,
            icon: values.icon as string | undefined,
            hierarchy_level: values.hierarchy_level as number | undefined,
            product_level: values.product_level as string | undefined,
            permissions: values.permissions as Record<string, boolean> | undefined,
            is_system_role: values.is_system_role as boolean | undefined,
            is_active: values.is_active as boolean | undefined,
            created_by: values.created_by as string | undefined,
          };
          rows.push(row);
          inserts.push(row);
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  return { client, updates, inserts, rows };
}

function stockRole(key: "owner" | "admin" | "manager" | "staff"): RoleRow {
  const role = getDefaultProductRoleDefinitions().find((item) => item.key === key);
  assert.ok(role, `missing stock role ${key}`);
  return {
    id: `existing-${key}`,
    company_id: "company-1",
    name: role.label,
    description: role.description,
    color: role.color,
    icon: role.icon,
    hierarchy_level: role.hierarchy_level,
    permissions: { ...role.permissions },
    is_system_role: true,
    is_active: true,
    created_by: "user-1",
  };
}

export async function runProductRolesSetupTests() {
  const managerPermissions = getProductRolePermissions("manager");
  assert.equal(managerPermissions.approveTimeOff, true);

  const customizedManager = stockRole("manager");
  customizedManager.permissions = {
    ...managerPermissions,
    approveTimeOff: false,
  };
  customizedManager.description = "Owner-edited Manager class";
  customizedManager.color = "#custom";

  const customClass: RoleRow = {
    id: "custom-kitchen-manager",
    company_id: "company-1",
    name: "Kitchen manager",
    description: "Custom class",
    permissions: { viewOwnProfile: true },
    is_system_role: false,
    is_active: true,
    created_by: "user-1",
  };

  const { client, updates, inserts, rows } = createMemoryRolesClient([
    stockRole("owner"),
    stockRole("admin"),
    customizedManager,
    customClass,
  ]);

  await ensureProductCompanyRoles(client, {
    companyId: "company-1",
    userId: "user-1",
  });

  const manager = rows.find((row) => row.id === "existing-manager");
  assert.ok(manager, "Manager row still exists");
  assert.equal(manager.permissions?.approveTimeOff, false);
  assert.equal(manager.description, "Owner-edited Manager class");
  assert.equal(manager.color, "#custom");
  assert.equal(
    updates.some((update) => update.id === "existing-manager"),
    false,
    "existing Manager must not be updated",
  );

  const kitchen = rows.find((row) => row.id === "custom-kitchen-manager");
  assert.ok(kitchen);
  assert.equal(kitchen.name, "Kitchen manager");
  assert.deepEqual(kitchen.permissions, { viewOwnProfile: true });

  assert.equal(inserts.length, 1);
  assert.equal(inserts[0]?.name, "Staff");
  assert.equal(inserts[0]?.product_level, "staff");
  assert.equal(inserts[0]?.is_system_role, true);
  assert.deepEqual(inserts[0]?.permissions, getProductRolePermissions("staff"));
  assert.ok(rows.some((row) => normalizeProductRoleKey(row.name) === "staff"));

  const empty = createMemoryRolesClient([]);
  await ensureProductCompanyRoles(empty.client, {
    companyId: "company-2",
    userId: "user-2",
  });
  assert.deepEqual(
    empty.inserts.map((row) => row.name),
    ["Owner", "Admin", "Manager", "Staff"],
  );

  const aliasStaff = stockRole("staff");
  aliasStaff.id = "existing-employee";
  aliasStaff.name = "Employee";
  aliasStaff.permissions = { viewOwnProfile: true };
  const aliased = createMemoryRolesClient([
    stockRole("owner"),
    stockRole("admin"),
    stockRole("manager"),
    aliasStaff,
  ]);
  await ensureProductCompanyRoles(aliased.client, {
    companyId: "company-1",
    userId: "user-1",
  });
  assert.equal(aliased.inserts.length, 0);
  assert.deepEqual(aliasStaff.permissions, { viewOwnProfile: true });
  assert.equal(aliasStaff.name, "Employee");

  const inactiveManager = stockRole("manager");
  inactiveManager.is_active = false;
  inactiveManager.permissions = {
    ...managerPermissions,
    approveTimeOff: false,
  };
  const archived = createMemoryRolesClient([
    stockRole("owner"),
    stockRole("admin"),
    inactiveManager,
    stockRole("staff"),
  ]);
  await ensureProductCompanyRoles(archived.client, {
    companyId: "company-1",
    userId: "user-1",
  });
  assert.equal(inactiveManager.is_active, false);
  assert.equal(inactiveManager.permissions?.approveTimeOff, false);
  assert.equal(archived.inserts.length, 0);
  assert.equal(archived.updates.length, 0);

  await applyOnboardingCompanyRoles(archived.client, {
    companyId: "company-1",
    userId: "user-1",
    roles: [
      {
        name: "Manager",
        product_level: "manager",
        is_system_role: true,
        permissions: inactiveManager.permissions,
      },
    ],
  });
  assert.equal(
    inactiveManager.is_active,
    false,
    "onboarding without is_active must keep an archived Manager archived",
  );

  const stubbed = createMemoryRolesClient([
    stockRole("owner"),
    { ...stockRole("admin"), name: "Administrator" },
    customizedManager,
    { ...stockRole("staff"), id: "existing-employee", name: "Employee" },
  ]);
  const managerEdits = getProductRolePermissions("manager");
  await applyOnboardingCompanyRoles(stubbed.client, {
    companyId: "company-1",
    userId: "user-1",
    roles: [
      {
        name: "Manager",
        product_level: "manager",
        is_system_role: true,
        permissions: { ...managerEdits, approveTimeOff: true },
      },
      {
        name: "Staff",
        product_level: "staff",
        is_system_role: true,
        permissions: getProductRolePermissions("staff"),
      },
      {
        name: "Kitchen manager",
        product_level: "manager",
        is_system_role: false,
        permissions: { viewOwnSchedules: true },
      },
    ],
  });
  const updatedManager = stubbed.rows.find((row) => row.name === "Manager");
  assert.equal(
    updatedManager?.permissions?.approveTimeOff,
    false,
    "apply must not clobber an existing Manager class",
  );
  assert.equal(
    stubbed.rows.find((row) => row.id === "existing-employee")?.name,
    "Employee",
    "renamed system Staff stays Employee",
  );
  assert.ok(stubbed.rows.some((row) => row.name === "Kitchen manager"));

  await ensureProductCompanyRoles(stubbed.client, {
    companyId: "company-1",
    userId: "user-1",
  });
  assert.equal(
    stubbed.rows.find((row) => row.name === "Manager")?.permissions
      ?.approveTimeOff,
    false,
    "repair seed must not restore Manager time off",
  );

  const customEmployee = createMemoryRolesClient([
    stockRole("owner"),
    stockRole("admin"),
    stockRole("manager"),
    {
      id: "custom-employee",
      company_id: "company-1",
      name: "Employee",
      permissions: { viewOwnProfile: true },
      is_system_role: false,
      is_active: true,
      created_by: "user-1",
    },
  ]);
  await ensureProductCompanyRoles(customEmployee.client, {
    companyId: "company-1",
    userId: "user-1",
  });
  assert.equal(customEmployee.inserts.length, 1);
  assert.equal(customEmployee.inserts[0]?.name, "Staff");
  assert.equal(customEmployee.inserts[0]?.product_level, "staff");
  assert.equal(
    customEmployee.rows.find((row) => row.id === "custom-employee")?.name,
    "Employee",
  );

  await applyOnboardingCompanyRoles(customEmployee.client, {
    companyId: "company-1",
    userId: "user-1",
    roles: [
      {
        name: "Staff",
        product_level: "staff",
        is_system_role: true,
        permissions: getProductRolePermissions("staff"),
      },
    ],
  });
  assert.equal(
    customEmployee.rows.find((row) => row.id === "custom-employee")?.name,
    "Employee",
    "system Staff must not swallow a custom Employee class",
  );
  assert.equal(
    customEmployee.rows.find((row) => row.id === "custom-employee")?.permissions
      ?.viewOwnProfile,
    true,
  );
}
