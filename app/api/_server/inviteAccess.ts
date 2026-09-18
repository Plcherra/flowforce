import {
  canInviteProductLevel,
  clampPermissionDiffsToInviter,
  parseInviteGrantPolicy,
  resolveInviterLevel,
  type InviteGrantPolicy,
} from "@/features/roles/constants/grantCeiling";
import {
  isInviteableClass,
  profileRoleFromClass,
  resolveProductLevel,
  type ProductLevel,
} from "@/features/roles/constants/productLevels";
import {
  applyPermissionDiffsToClassPermissions,
  permissionDiffsFromRows,
  retainAllowedDiffs,
  sanitizePermissionDiffs,
  type PermissionDiffMap,
} from "@/features/roles/constants/personAccessDiffs";
import { getProductRolePermissions } from "@/features/roles/constants/productRoles";
import { supabaseAdmin } from "./supabaseAdmin";

export type InviteAccessClass = {
  id: string;
  name: string;
  product_level: string | null;
  permissions: Record<string, boolean>;
};

export type InviterGrantContext = {
  level: ProductLevel;
  permissions: Record<string, boolean>;
  policy: InviteGrantPolicy;
};

export type InviteAccessInput = {
  companyId: string;
  actorId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  roleId: string | null;
  roleKey: string;
  permissionOverrides: PermissionDiffMap;
  locationId: string | null;
  departmentId: string | null;
  inviteToken: string;
};

function parsePermissions(raw: unknown): Record<string, boolean> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return parsePermissions(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, boolean>>((acc, key) => {
      if (typeof key === "string") acc[key] = true;
      return acc;
    }, {});
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).reduce<
      Record<string, boolean>
    >((acc, [key, value]) => {
      if (value) acc[key] = true;
      return acc;
    }, {});
  }
  return {};
}

export async function loadInviteGrantPolicy(
  companyId: string,
): Promise<InviteGrantPolicy> {
  const { data } = await supabaseAdmin
    .from("companies")
    .select("template_config")
    .eq("id", companyId)
    .maybeSingle();
  return parseInviteGrantPolicy(data?.template_config);
}

export async function loadInviterGrantContext(params: {
  companyId: string;
  actorId: string;
}): Promise<InviterGrantContext> {
  const [profileResult, policy] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("role, role_id")
      .eq("id", params.actorId)
      .eq("company_id", params.companyId)
      .maybeSingle(),
    loadInviteGrantPolicy(params.companyId),
  ]);
  const profile = profileResult.data;

  let match: {
    permissions: unknown;
    product_level?: string | null;
    name?: string | null;
    hierarchy_level?: number | null;
  } | null = null;

  if (profile?.role_id) {
    const { data } = await supabaseAdmin
      .from("company_roles")
      .select("id, name, product_level, permissions, hierarchy_level")
      .eq("company_id", params.companyId)
      .eq("id", profile.role_id)
      .maybeSingle();
    match = data;
  }

  const level = resolveInviterLevel({
    product_level: match?.product_level,
    name: match?.name,
    role: profile?.role,
    hierarchy_level: match?.hierarchy_level,
  });

  if (!match) {
    const { data } = await supabaseAdmin
      .from("company_roles")
      .select("id, name, product_level, permissions, hierarchy_level")
      .eq("company_id", params.companyId);
    match =
      (data ?? []).find((row) => resolveProductLevel(row) === level) ?? null;
  }

  const { data: overrideRows } = await supabaseAdmin
    .from("user_permissions")
    .select("permission_key, permission_value")
    .eq("user_id", params.actorId);

  return {
    level,
    policy,
    permissions: applyPermissionDiffsToClassPermissions(
      level,
      match
        ? parsePermissions(match.permissions)
        : getProductRolePermissions(level),
      permissionDiffsFromRows(overrideRows),
    ),
  };
}

export async function loadInviteableClass(params: {
  companyId: string;
  roleId?: string | null;
  roleKey?: string | null;
  inviterLevel?: ProductLevel;
  policy?: InviteGrantPolicy;
  allowOwnerClass?: boolean;
  includeInactive?: boolean;
}): Promise<InviteAccessClass | null> {
  const { companyId, roleId, roleKey } = params;
  let query = supabaseAdmin
    .from("company_roles")
    .select("id, name, product_level, permissions, is_active, hierarchy_level")
    .eq("company_id", companyId);
  if (!params.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = roleId
    ? await query.eq("id", roleId).maybeSingle()
    : await query;

  if (error) throw error;

  const rows = roleId ? (data ? [data] : []) : (data ?? []);
  const match =
    rows.find((row) => row.id === roleId) ??
    rows.find(
      (row) =>
        roleKey &&
        row.name.trim().toLowerCase() === roleKey.trim().toLowerCase(),
    ) ??
    rows.find((row) => resolveProductLevel(row) === roleKey) ??
    null;

  if (!match) return null;
  const matchLevel = resolveProductLevel(match);
  if (match.is_active === false && !params.includeInactive) return null;
  if (matchLevel === "owner" && !params.allowOwnerClass) return null;
  if (matchLevel !== "owner" && !isInviteableClass({ ...match, is_active: true })) {
    return null;
  }
  if (
    params.inviterLevel &&
    !canInviteProductLevel(
      params.inviterLevel,
      resolveProductLevel(match),
      params.policy,
    )
  ) {
    return null;
  }

  return {
    id: match.id,
    name: match.name ?? "",
    product_level: match.product_level,
    permissions: parsePermissions(match.permissions),
  };
}

export function clampInviteOverrides(
  role: InviteAccessClass,
  overrides?: Record<string, unknown> | null,
  inviter?: InviterGrantContext | null,
): PermissionDiffMap {
  const targetLevel = resolveProductLevel(role);
  const sanitized = sanitizePermissionDiffs(targetLevel, overrides);
  if (!inviter) return sanitized;
  return clampPermissionDiffsToInviter(
    targetLevel,
    sanitized,
    inviter.level,
    inviter.permissions,
  );
}

export async function applyInviteAccessToUser(params: {
  userId: string;
  companyId: string;
  actorId: string;
  email: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: InviteAccessClass;
  permissionOverrides: PermissionDiffMap;
  departmentId: string | null;
  locationId?: string | null;
}) {
  const roleKey = profileRoleFromClass(params.role);

  await supabaseAdmin.from("profiles").upsert(
    {
      id: params.userId,
      company_id: params.companyId,
      email: params.email || "",
      first_name: params.firstName || "Team",
      last_name: params.lastName || "Member",
      phone: params.phone,
      role: roleKey,
      role_id: params.role.id,
      department_id: params.departmentId,
      employment_status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  await supabaseAdmin.from("company_members").upsert(
    {
      company_id: params.companyId,
      user_id: params.userId,
      role: roleKey,
      added_at: new Date().toISOString(),
    },
    { onConflict: "company_id,user_id" },
  );

  await writeUserPermissionDiffs({
    userId: params.userId,
    actorId: params.actorId,
    diffs: params.permissionOverrides,
  });
}

async function writeUserPermissionDiffs(params: {
  userId: string;
  actorId: string;
  diffs: PermissionDiffMap;
}) {
  const { data: existing } = await supabaseAdmin
    .from("user_permissions")
    .select("permission_key")
    .eq("user_id", params.userId);

  const nextKeys = new Set(Object.keys(params.diffs));
  const staleKeys = (existing ?? [])
    .map((row) => row.permission_key)
    .filter((key): key is string => Boolean(key) && !nextKeys.has(key));

  if (staleKeys.length > 0) {
    await supabaseAdmin
      .from("user_permissions")
      .delete()
      .eq("user_id", params.userId)
      .in("permission_key", staleKeys);
  }

  const rows = Object.entries(params.diffs).map(
    ([permission_key, permission_value]) => ({
      user_id: params.userId,
      permission_key,
      permission_value,
      created_by: params.actorId,
      updated_at: new Date().toISOString(),
    }),
  );

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from("user_permissions").upsert(rows, {
      onConflict: "user_id,permission_key",
    });
    if (error) throw error;
  }
}

export async function applyManagedUserAccess(params: {
  companyId: string;
  actorId: string;
  userId: string;
  roleId?: string | null;
  permissionOverrides?: Record<string, unknown> | null;
  replaceOverrides: boolean;
}) {
  const { data: target, error: targetError } = await supabaseAdmin
    .from("profiles")
    .select("id, company_id, role, role_id, first_name, last_name, email, phone, department_id")
    .eq("id", params.userId)
    .eq("company_id", params.companyId)
    .maybeSingle();

  if (targetError) throw targetError;
  if (!target) {
    throw Object.assign(new Error("That person is not on this company."), {
      status: 404,
    });
  }

  const inviter = await loadInviterGrantContext({
    companyId: params.companyId,
    actorId: params.actorId,
  });

  const currentLevel = resolveInviterLevel({
    role: target.role,
    product_level: target.role,
    name: target.role,
  });
  if (
    currentLevel === "owner" &&
    params.roleId &&
    params.roleId !== target.role_id
  ) {
    throw Object.assign(new Error("Owner stays on the Owner class."), {
      status: 403,
    });
  }

  const role = await loadInviteableClass({
    companyId: params.companyId,
    roleId: params.roleId || target.role_id,
    roleKey: target.role,
    inviterLevel: inviter.level === "owner" ? undefined : inviter.level,
    policy: inviter.policy,
    allowOwnerClass: inviter.level === "owner",
    includeInactive: true,
  });

  if (!role) {
    throw Object.assign(new Error("Choose a class you can grant."), {
      status: 403,
    });
  }

  const targetLevel = resolveProductLevel(role);
  if (targetLevel === "owner" && inviter.level !== "owner") {
    throw Object.assign(new Error("You cannot change Owner access."), {
      status: 403,
    });
  }
  if (
    targetLevel !== "owner" &&
    !canInviteProductLevel(inviter.level, targetLevel, inviter.policy)
  ) {
    throw Object.assign(new Error("That class is above what you can grant."), {
      status: 403,
    });
  }

  const { data: existingRows } = await supabaseAdmin
    .from("user_permissions")
    .select("permission_key, permission_value")
    .eq("user_id", params.userId);

  const diffs = params.replaceOverrides
    ? clampInviteOverrides(role, params.permissionOverrides, inviter)
    : retainAllowedDiffs(
        targetLevel,
        role.permissions,
        permissionDiffsFromRows(existingRows),
      );

  await applyInviteAccessToUser({
    userId: params.userId,
    companyId: params.companyId,
    actorId: params.actorId,
    email: target.email,
    firstName: target.first_name || "",
    lastName: target.last_name || "",
    phone: target.phone,
    role,
    permissionOverrides: diffs,
    departmentId: target.department_id,
  });

  return { roleId: role.id, role: profileRoleFromClass(role), diffs };
}

export async function applyInviteAccessByToken(params: {
  userId: string;
  email: string;
  inviteToken: string;
}) {
  const { data: invite, error } = await supabaseAdmin
    .from("company_invites")
    .select(
      "id, company_id, invited_by, first_name, last_name, phone, role, role_id, permission_overrides, department_id, location_id, email",
    )
    .eq("invite_token", params.inviteToken)
    .maybeSingle();

  if (error) throw error;
  if (!invite?.company_id) return null;

  const inviter = invite.invited_by
    ? await loadInviterGrantContext({
        companyId: invite.company_id,
        actorId: invite.invited_by,
      })
    : null;
  const role = await loadInviteableClass({
    companyId: invite.company_id,
    roleId: invite.role_id,
    roleKey: invite.role,
    inviterLevel: inviter?.level,
    policy: inviter?.policy,
  });
  if (!role) return null;
  const overrides = clampInviteOverrides(
    role,
    (invite.permission_overrides ?? {}) as Record<string, unknown>,
    inviter,
  );

  await applyInviteAccessToUser({
    userId: params.userId,
    companyId: invite.company_id,
    actorId: invite.invited_by ?? params.userId,
    email: params.email || invite.email,
    firstName: invite.first_name || "",
    lastName: invite.last_name || "",
    phone: invite.phone,
    role,
    permissionOverrides: overrides,
    departmentId: invite.department_id,
    locationId: invite.location_id,
  });

  await supabaseAdmin
    .from("company_invites")
    .update({
      accepted_at: new Date().toISOString(),
      status: "accepted",
    })
    .eq("id", invite.id);

  return invite.id as string;
}
