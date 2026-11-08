import { supabase as db } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { cloneClassFromProductLevel } from "@/features/roles/constants/productLevels";
import { coffeeShopStarter } from "@/features/onboarding/utils/orgTemplates";

function levelFor(name: string, translate: (key: string) => string) {
  const shop = coffeeShopStarter(translate);
  for (const department of shop.departments) {
    const role = department.roles.find(
      (item) => item.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (role) return role.level;
  }
  return "staff" as const;
}

export async function insertDepartment(companyId: string, name: string) {
  const { data, error } = await db
    .from("departments")
    .insert({ company_id: companyId, name: name.trim(), type: "operations", description: "" })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

export async function removeDepartmentIfUnused(companyId: string, id: string) {
  const [{ count: people }, { count: roles }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("department_id", id),
    db.from("company_roles").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("department_id", id),
  ]);
  if ((people ?? 0) > 0 || (roles ?? 0) > 0) return "blocked" as const;
  const { error } = await db.from("departments").delete().eq("id", id).eq("company_id", companyId);
  return error ? ("blocked" as const) : ("ok" as const);
}

export async function insertShopRole(input: {
  companyId: string;
  userId: string;
  name: string;
  departmentId: string;
  translate: (key: string) => string;
}) {
  const level = levelFor(input.name, input.translate);
  const draft = cloneClassFromProductLevel(level, input.name.trim());
  const { data, error } = await db
    .from("company_roles")
    .insert({
      ...draft,
      company_id: input.companyId,
      department_id: input.departmentId || null,
      is_system_role: false,
      is_active: true,
      created_by: input.userId,
    })
    .select("id")
    .maybeSingle();
  if (error || !data?.id) return null;
  return String(data.id);
}

export async function removeRoleIfUnused(companyId: string, id: string, name: string) {
  const [{ count: people }, { count: shifts }] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("role_id", id),
    db.from("schedules").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("role", name),
  ]);
  if ((people ?? 0) > 0 || (shifts ?? 0) > 0) return "blocked" as const;
  const { error } = await db.from("company_roles").update({ is_active: false }).eq("id", id).eq("company_id", companyId);
  return error ? ("blocked" as const) : ("ok" as const);
}
