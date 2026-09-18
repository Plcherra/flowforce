import productRoleContract from "./productRoleContract.json";
import {
  getProductRoleDefinition,
  getProductRolePermissions,
  isProductRoleKey,
  normalizeProductRoleKey,
  type ProductRoleKey,
} from "./productRoles";
import type { PermissionKey } from "@/lib/permissions/registry";

export const PRODUCT_LEVELS = [
  "owner",
  "admin",
  "manager",
  "staff",
] as const;

export type ProductLevel = (typeof PRODUCT_LEVELS)[number];

export const CLONEABLE_PRODUCT_LEVELS = [
  "admin",
  "manager",
  "staff",
] as const;

export type CloneableProductLevel = (typeof CLONEABLE_PRODUCT_LEVELS)[number];

const rawGrantableExtras = (productRoleContract.levelGrantableExtras ??
  {}) as Partial<Record<ProductLevel, string[]>>;

export function getProductLevelGrantableKeys(level: ProductLevel): Set<string> {
  if (level === "owner") {
    return new Set<string>();
  }

  const defaults = Object.entries(getProductRolePermissions(level))
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);
  const extras = rawGrantableExtras[level] ?? [];
  return new Set([...defaults, ...extras]);
}

export function isProductLevel(value?: string | null): value is ProductLevel {
  return PRODUCT_LEVELS.includes(value as ProductLevel);
}

export function isCloneableProductLevel(
  value?: string | null,
): value is CloneableProductLevel {
  return CLONEABLE_PRODUCT_LEVELS.includes(value as CloneableProductLevel);
}

export function inferProductLevel(
  name?: string | null,
  hierarchyLevel?: number | null,
): ProductLevel {
  const fromName = normalizeProductRoleKey(name);
  if (fromName) return fromName;
  if (hierarchyLevel === 2) return "manager";
  if (hierarchyLevel === 3) return "admin";
  return "staff";
}

export function resolveProductLevel(role: {
  product_level?: string | null;
  name?: string | null;
  hierarchy_level?: number | null;
}): ProductLevel {
  if (isProductLevel(role.product_level)) return role.product_level;
  return inferProductLevel(role.name, role.hierarchy_level);
}

export const OWNER_MAJOR_PERMISSION_KEYS = [
  "manageUsers",
  "systemSettings",
  "managePositions",
  "admin.roles",
  "admin.permissions",
  "admin.settings",
  "billing.view",
  "billing.manage",
] as const satisfies readonly PermissionKey[];

export function isOwnerMajorPermission(key: string): boolean {
  return (OWNER_MAJOR_PERMISSION_KEYS as readonly string[]).includes(key);
}

export function permissionAllowedAtLevel(
  level: ProductLevel,
  key: string,
): boolean {
  if (level === "owner") return true;
  return getProductLevelGrantableKeys(level).has(key);
}

export function applyOwnerMajorPermissions(
  permissions?: Record<string, boolean> | null,
): Record<string, boolean> {
  const next = { ...(permissions ?? {}) };
  for (const key of OWNER_MAJOR_PERMISSION_KEYS) {
    next[key] = true;
  }
  return next;
}

export function clampPermissionsToProductLevel(
  level: ProductLevel,
  permissions?: Record<string, boolean> | null,
): Record<string, boolean> {
  const incoming = permissions ?? {};
  if (level === "owner") {
    return applyOwnerMajorPermissions(incoming);
  }

  return Object.entries(incoming).reduce<Record<string, boolean>>(
    (acc, [key, enabled]) => {
      if (permissionAllowedAtLevel(level, key)) {
        acc[key] = Boolean(enabled);
      }
      return acc;
    },
    {},
  );
}

export function isOwnerClass(role: {
  product_level?: string | null;
  name?: string | null;
  hierarchy_level?: number | null;
}): boolean {
  return resolveProductLevel(role) === "owner";
}

export function canDeactivateClass(role: {
  product_level?: string | null;
  name?: string | null;
  hierarchy_level?: number | null;
}): boolean {
  return !isOwnerClass(role);
}

export function isInviteableClass(role: {
  product_level?: string | null;
  name?: string | null;
  hierarchy_level?: number | null;
  is_active?: boolean | null;
}): boolean {
  if (role.is_active === false) return false;
  return !isOwnerClass(role);
}

export function profileRoleFromClass(role: {
  product_level?: string | null;
  name?: string | null;
  hierarchy_level?: number | null;
}): "owner" | "admin" | "manager" | "staff" {
  return resolveProductLevel(role);
}

export function cloneClassFromProductLevel(
  level: CloneableProductLevel,
  name = "",
) {
  const definition = getProductRoleDefinition(level);
  return {
    name,
    description: definition.description,
    color: definition.color,
    icon: definition.icon,
    hierarchy_level: definition.hierarchy_level,
    product_level: level,
    permissions: clampPermissionsToProductLevel(level, definition.permissions),
  };
}

export function assertProductLevelKey(
  value: string,
): asserts value is ProductRoleKey {
  if (!isProductRoleKey(value)) {
    throw new Error(`Unknown product level: ${value}`);
  }
}
