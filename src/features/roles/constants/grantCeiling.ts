import {
  isVerbAvailable,
  isVerbEnabled,
  isVerbLockedOn,
  type OperatorAreaDefinition,
  type OperatorVerb,
} from "./operatorBoxes";
import {
  sanitizePermissionDiffs,
  type PermissionDiffMap,
} from "./personAccessDiffs";
import {
  isProductLevel,
  resolveProductLevel,
  type ProductLevel,
} from "./productLevels";
import { normalizeProductRoleKey } from "./productRoles";

export const PRODUCT_LEVEL_RANK: Record<ProductLevel, number> = {
  staff: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export type InviteGrantPolicy = {
  managerCanInviteManagers: boolean;
};

export const DEFAULT_INVITE_GRANT_POLICY: InviteGrantPolicy = {
  managerCanInviteManagers: true,
};

export function parseInviteGrantPolicy(raw: unknown): InviteGrantPolicy {
  let config: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      config = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      config = null;
    }
  } else if (raw && typeof raw === "object") {
    config = raw as Record<string, unknown>;
  }

  const access =
    config?.access && typeof config.access === "object"
      ? (config.access as Record<string, unknown>)
      : config;

  return {
    managerCanInviteManagers: access?.managerCanInviteManagers !== false,
  };
}

export function withInviteGrantPolicy(
  config: Record<string, unknown> | null | undefined,
  policy: InviteGrantPolicy,
): Record<string, unknown> {
  const current = config ?? {};
  const access =
    current.access && typeof current.access === "object"
      ? (current.access as Record<string, unknown>)
      : {};
  return {
    ...current,
    access: {
      ...access,
      managerCanInviteManagers: policy.managerCanInviteManagers,
    },
  };
}

export function resolveInviterLevel(role?: {
  product_level?: string | null;
  name?: string | null;
  role?: string | null;
  hierarchy_level?: number | null;
} | null): ProductLevel {
  if (role?.product_level && isProductLevel(role.product_level)) {
    return role.product_level;
  }
  const fromRole = normalizeProductRoleKey(role?.role);
  if (fromRole && isProductLevel(fromRole)) return fromRole;
  return resolveProductLevel({
    product_level: role?.product_level,
    name: role?.name ?? role?.role,
    hierarchy_level: role?.hierarchy_level,
  });
}

export function maxInvitableProductLevel(
  inviterLevel: ProductLevel,
  policy: InviteGrantPolicy = DEFAULT_INVITE_GRANT_POLICY,
): ProductLevel | null {
  if (inviterLevel === "owner" || inviterLevel === "admin") return "admin";
  if (inviterLevel === "manager") {
    return policy.managerCanInviteManagers ? "manager" : "staff";
  }
  return null;
}

export function canInviteProductLevel(
  inviterLevel: ProductLevel,
  targetLevel: ProductLevel,
  policy: InviteGrantPolicy = DEFAULT_INVITE_GRANT_POLICY,
): boolean {
  if (targetLevel === "owner") return false;
  const maxLevel = maxInvitableProductLevel(inviterLevel, policy);
  if (!maxLevel) return false;
  return PRODUCT_LEVEL_RANK[targetLevel] <= PRODUCT_LEVEL_RANK[maxLevel];
}

export function inviterHoldsKey(
  inviterLevel: ProductLevel,
  inviterPermissions: Record<string, boolean> | null | undefined,
  key: string,
): boolean {
  if (inviterLevel === "owner") return true;
  return Boolean(inviterPermissions?.[key]);
}

export function inviterCanGrantVerb(
  area: OperatorAreaDefinition,
  verb: OperatorVerb,
  targetLevel: ProductLevel,
  inviterLevel: ProductLevel,
  inviterPermissions?: Record<string, boolean> | null,
): boolean {
  if (!isVerbAvailable(area, verb, targetLevel)) return false;
  if (isVerbLockedOn(area, verb, targetLevel)) {
    return inviterLevel === "owner";
  }
  if (inviterLevel === "owner") return true;
  return isVerbEnabled(area, verb, inviterLevel, inviterPermissions);
}

export function clampPermissionDiffsToInviter(
  targetLevel: ProductLevel,
  diffs: Record<string, unknown> | null | undefined,
  inviterLevel: ProductLevel,
  inviterPermissions?: Record<string, boolean> | null,
): PermissionDiffMap {
  const sanitized = sanitizePermissionDiffs(targetLevel, diffs);
  if (inviterLevel === "owner") return sanitized;

  const next: PermissionDiffMap = {};
  for (const [key, value] of Object.entries(sanitized)) {
    if (!inviterHoldsKey(inviterLevel, inviterPermissions, key)) continue;
    next[key] = value;
  }
  return next;
}
