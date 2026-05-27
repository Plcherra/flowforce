import productRoleContract from "./productRoleContract.json";
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from "@/lib/permissions/registry";

export const PRODUCT_ROLE_KEYS = [
  "owner",
  "admin",
  "manager",
  "staff",
] as const;

export type ProductRoleKey = (typeof PRODUCT_ROLE_KEYS)[number];

export type ProductRoutePermission = {
  surface: string;
  routes: string[];
  requiredAny: PermissionKey[];
};

export type ProductRoleDefinition = {
  key: ProductRoleKey;
  label: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: Record<PermissionKey, boolean>;
};

type RawProductRole = {
  key: string;
  label: string;
  description: string;
  color: string;
  icon: string;
  hierarchy_level: number;
  permissions: string[];
};

const rawRoles = productRoleContract.roles as RawProductRole[];
const aliasMap = productRoleContract.legacyAliases as Record<
  string,
  ProductRoleKey
>;

const permissionSet = new Set<string>(PERMISSION_KEYS);

export function isProductRoleKey(value: string): value is ProductRoleKey {
  return PRODUCT_ROLE_KEYS.includes(value as ProductRoleKey);
}

export function normalizeProductRoleKey(
  value?: string | null,
): ProductRoleKey | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (isProductRoleKey(normalized)) return normalized;
  return aliasMap[normalized];
}

export function expandProductRolePermissions(
  permissions: string[],
): Record<PermissionKey, boolean> {
  if (permissions.includes("*")) {
    return PERMISSION_KEYS.reduce<Record<PermissionKey, boolean>>(
      (acc, key) => {
        acc[key] = true;
        return acc;
      },
      {} as Record<PermissionKey, boolean>,
    );
  }

  return permissions.reduce<Record<PermissionKey, boolean>>(
    (acc, key) => {
      if (permissionSet.has(key)) {
        acc[key as PermissionKey] = true;
      }
      return acc;
    },
    {} as Record<PermissionKey, boolean>,
  );
}

export const PRODUCT_ROLE_DEFINITIONS: ProductRoleDefinition[] = rawRoles.map(
  (role) => ({
    key: normalizeProductRoleKey(role.key) ?? "staff",
    label: role.label,
    description: role.description,
    color: role.color,
    icon: role.icon,
    hierarchy_level: role.hierarchy_level,
    permissions: expandProductRolePermissions(role.permissions),
  }),
);

export const PRODUCT_ROLE_LABELS = PRODUCT_ROLE_DEFINITIONS.reduce<
  Record<ProductRoleKey, string>
>(
  (acc, role) => {
    acc[role.key] = role.label;
    return acc;
  },
  {} as Record<ProductRoleKey, string>,
);

export const PRODUCT_ROLE_ACCENTS: Record<ProductRoleKey, string> = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin: "bg-rose-100 text-rose-800 border-rose-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  staff: "bg-gray-100 text-gray-800 border-gray-200",
};

export const PRODUCT_ROLE_HIERARCHY = PRODUCT_ROLE_DEFINITIONS.reduce<
  Record<ProductRoleKey, number>
>(
  (acc, role) => {
    acc[role.key] = role.hierarchy_level;
    return acc;
  },
  {} as Record<ProductRoleKey, number>,
);

export const PRODUCT_ROUTE_PERMISSION_MAP =
  productRoleContract.routePermissionMap as ProductRoutePermission[];

export function getDefaultProductRoleDefinitions(): ProductRoleDefinition[] {
  return PRODUCT_ROLE_DEFINITIONS.map((role) => ({
    ...role,
    permissions: { ...role.permissions },
  }));
}

export function getProductRoleDefinition(
  roleKey: ProductRoleKey,
): ProductRoleDefinition {
  const role = PRODUCT_ROLE_DEFINITIONS.find((item) => item.key === roleKey);
  if (!role) {
    throw new Error(`Unknown product role: ${roleKey}`);
  }
  return role;
}

export function getProductRolePermissions(
  roleKey: ProductRoleKey,
): Record<PermissionKey, boolean> {
  return { ...getProductRoleDefinition(roleKey).permissions };
}
