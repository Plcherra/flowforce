import {
  clampPermissionsToProductLevel,
  resolveProductLevel,
} from "@/features/roles/constants/productLevels";
import {
  getDefaultProductRoleDefinitions,
  normalizeProductRoleKey,
} from "@/features/roles/constants/productRoles";

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => Promise<{ data: unknown; error: unknown }>;
    };
    update: (values: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string,
      ) => {
        eq: (column: string, value: string) => Promise<{ error: unknown }>;
      };
    };
    insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};

type ExistingRole = {
  id: string;
  name: string | null;
  product_level?: string | null;
  is_system_role?: boolean | null;
  is_active?: boolean | null;
};

export type OnboardingRoleInput = {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  hierarchy_level?: number;
  product_level?: string | null;
  permissions?: Record<string, boolean>;
  is_system_role?: boolean;
  is_active?: boolean;
};

const isExistingRole = (value: unknown): value is ExistingRole =>
  Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      typeof (value as ExistingRole).id === "string",
  );

export async function ensureProductCompanyRoles(
  client: SupabaseClientLike,
  {
    companyId,
    userId,
  }: {
    companyId: string;
    userId: string;
  },
) {
  const { data, error } = await client
    .from("company_roles")
    .select("id,name,product_level,is_system_role,is_active")
    .eq("company_id", companyId);

  if (error) throw error;

  const existingRoles = Array.isArray(data) ? data.filter(isExistingRole) : [];

  for (const role of getDefaultProductRoleDefinitions()) {
    const existingRole = existingRoles.find((candidate) => {
      if (!candidate.is_system_role) return false;
      return (
        candidate.product_level === role.key ||
        normalizeProductRoleKey(candidate.name) === role.key
      );
    });

    if (existingRole) {
      // Seed if missing. Never overwrite name, metadata, permissions, or
      // an owner's archive of Admin / Manager / Staff. Custom classes named
      // Employee / Supervisor stay their own rows.
      continue;
    }

    const { error: insertError } = await client.from("company_roles").insert({
      name: role.label,
      description: role.description,
      color: role.color,
      icon: role.icon,
      hierarchy_level: role.hierarchy_level,
      product_level: role.key,
      permissions: role.permissions,
      is_system_role: true,
      is_active: true,
      company_id: companyId,
      created_by: userId,
    });

    if (insertError) throw insertError;
  }
}

function findMatchingOnboardingRole(
  existingRoles: ExistingRole[],
  incoming: OnboardingRoleInput,
) {
  const name = incoming.name?.trim() ?? "";
  const exactName = existingRoles.find(
    (row) => name && row.name?.trim().toLowerCase() === name.toLowerCase(),
  );
  if (exactName) return exactName;
  if (!incoming.is_system_role) return undefined;

  const productLevel = resolveProductLevel({
    product_level: incoming.product_level,
    name,
    hierarchy_level: incoming.hierarchy_level,
  });
  const incomingKey = normalizeProductRoleKey(name) ?? productLevel;

  return existingRoles.find((row) => {
    if (!row.is_system_role) return false;
    return (
      row.product_level === incomingKey ||
      normalizeProductRoleKey(row.name) === incomingKey
    );
  });
}

export async function applyOnboardingCompanyRoles(
  client: SupabaseClientLike,
  {
    companyId,
    userId,
    roles,
  }: {
    companyId: string;
    userId: string;
    roles: OnboardingRoleInput[];
  },
) {
  if (!Array.isArray(roles) || roles.length === 0) return;

  const { data, error } = await client
    .from("company_roles")
    .select("id,name,product_level,is_system_role,is_active")
    .eq("company_id", companyId);

  if (error) throw error;

  const existingRoles = Array.isArray(data) ? data.filter(isExistingRole) : [];

  for (const incoming of roles) {
    const name = incoming.name?.trim();
    if (!name) continue;

    const productLevel = resolveProductLevel({
      product_level: incoming.product_level,
      name,
      hierarchy_level: incoming.hierarchy_level,
    });
    const permissions = clampPermissionsToProductLevel(
      productLevel,
      incoming.permissions,
    );
    const match = findMatchingOnboardingRole(existingRoles, incoming);

    if (match) {
      // Seed if missing. Never rename or rewrite boxes on an existing class.
      continue;
    }

    const { error: insertError } = await client.from("company_roles").insert({
      name,
      description: incoming.description || "",
      color: incoming.color,
      icon: incoming.icon,
      hierarchy_level: incoming.hierarchy_level,
      product_level: productLevel,
      permissions,
      is_system_role: Boolean(incoming.is_system_role),
      is_active: incoming.is_active ?? true,
      company_id: companyId,
      created_by: userId,
    });

    if (insertError) throw insertError;
  }
}
