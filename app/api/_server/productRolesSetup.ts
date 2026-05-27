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
    .select("id,name")
    .eq("company_id", companyId);

  if (error) throw error;

  const existingRoles = Array.isArray(data) ? data.filter(isExistingRole) : [];

  for (const role of getDefaultProductRoleDefinitions()) {
    const existingRole = existingRoles.find(
      (candidate) => normalizeProductRoleKey(candidate.name) === role.key,
    );

    const values = {
      name: role.label,
      description: role.description,
      color: role.color,
      icon: role.icon,
      hierarchy_level: role.hierarchy_level,
      permissions: role.permissions,
      is_system_role: true,
      is_active: true,
    };

    if (existingRole) {
      const { error: updateError } = await client
        .from("company_roles")
        .update(values)
        .eq("company_id", companyId)
        .eq("id", existingRole.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await client.from("company_roles").insert({
        ...values,
        company_id: companyId,
        created_by: userId,
      });

      if (insertError) throw insertError;
    }
  }
}
