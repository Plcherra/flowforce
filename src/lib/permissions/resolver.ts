import {
  PERMISSION_KEYS,
  type PermissionKey,
  type PermissionValue,
} from "@/lib/permissions/registry";

export interface RolePermissions {
  [key: string]: boolean;
}

export interface UserPermissionOverride {
  permission_key: PermissionKey;
  permission_value: PermissionValue;
}

export interface PermissionContext {
  rolePermissions: RolePermissions;
  userOverrides: UserPermissionOverride[];
  userId?: string;
  roleId?: string;
}

/**
 * Permission Resolver - Merges role defaults and per-user overrides
 * Precedence: Deny override > Allow override > Role default
 */
export class PermissionResolver {
  private context: PermissionContext;

  constructor(context: PermissionContext) {
    this.context = context;
  }

  /**
   * Resolve a single permission using precedence rules
   * @param permissionKey - The permission to resolve
   * @returns boolean - Final permission result
   */
  resolve(permissionKey: PermissionKey): boolean {
    // Find user override for this permission
    const override = this.context.userOverrides.find(
      (o) => o.permission_key === permissionKey,
    );

    // Apply precedence rules:
    // 1. Deny override (highest precedence)
    if (override?.permission_value === "deny") {
      return false;
    }

    // 2. Allow override (second precedence)
    if (override?.permission_value === "allow") {
      return true;
    }

    // 3. Role default (lowest precedence)
    // If no override or override is 'inherit', use role default
    return Boolean(this.context.rolePermissions[permissionKey]);
  }

  /**
   * Resolve multiple permissions at once
   * @param permissionKeys - Array of permissions to resolve
   * @returns Record<PermissionKey, boolean> - Map of permissions to results
   */
  resolveMany(permissionKeys: PermissionKey[]): Record<string, boolean> {
    const results: Record<string, boolean> = {};

    for (const key of permissionKeys) {
      results[key] = this.resolve(key);
    }

    return results;
  }

  /**
   * Resolve all available permissions
   * @returns Record<PermissionKey, boolean> - Map of all permissions
   */
  resolveAll(): Record<string, boolean> {
    return this.resolveMany([...PERMISSION_KEYS]);
  }

  /**
   * Get the source of a permission (role, allow_override, deny_override)
   * @param permissionKey - The permission to check
   * @returns string - Source of the permission
   */
  getPermissionSource(
    permissionKey: PermissionKey,
  ): "role" | "allow_override" | "deny_override" {
    const override = this.context.userOverrides.find(
      (o) => o.permission_key === permissionKey,
    );

    if (override?.permission_value === "deny") {
      return "deny_override";
    }

    if (override?.permission_value === "allow") {
      return "allow_override";
    }

    return "role";
  }

  /**
   * Check if user has ANY of the provided permissions
   * @param permissionKeys - Array of permissions to check
   * @returns boolean - True if user has at least one permission
   */
  hasAny(permissionKeys: PermissionKey[]): boolean {
    return permissionKeys.some((key) => this.resolve(key));
  }

  /**
   * Check if user has ALL of the provided permissions
   * @param permissionKeys - Array of permissions to check
   * @returns boolean - True if user has all permissions
   */
  hasAll(permissionKeys: PermissionKey[]): boolean {
    return permissionKeys.every((key) => this.resolve(key));
  }

  /**
   * Update the context (useful for reactive updates)
   * @param newContext - New permission context
   */
  updateContext(newContext: PermissionContext): void {
    this.context = newContext;
  }
}

/**
 * Create a permission resolver instance
 * @param context - Permission context
 * @returns PermissionResolver - New resolver instance
 */
export function createPermissionResolver(
  context: PermissionContext,
): PermissionResolver {
  return new PermissionResolver(context);
}

/**
 * Server-side permission checking (for edge functions/API routes)
 * @param context - Permission context
 * @param permissionKey - Permission to check
 * @returns boolean - Permission result
 */
export function serverResolvePermission(
  context: PermissionContext,
  permissionKey: PermissionKey,
): boolean {
  const resolver = createPermissionResolver(context);
  return resolver.resolve(permissionKey);
}
