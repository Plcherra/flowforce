import { PERMISSION_KEYS, type PermissionKey } from '@/lib/permissions/registry';

/**
 * Type-safe permission utilities for compile-time validation
 * Prevents runtime errors from invalid permission keys
 */

// Create a const assertion for compile-time type checking
export const VALID_PERMISSION_KEYS = PERMISSION_KEYS;
export type ValidPermissionKey = typeof PERMISSION_KEYS[number];

/**
 * Type guard to validate permission keys at runtime
 */
export function isValidPermissionKey(key: string): key is PermissionKey {
  return PERMISSION_KEYS.includes(key as PermissionKey);
}

/**
 * Assert that a permission key is valid, throw error if not
 */
export function assertValidPermissionKey(key: string): asserts key is PermissionKey {
  if (!isValidPermissionKey(key)) {
    throw new Error(`Invalid permission key: ${key}. Valid keys: ${PERMISSION_KEYS.join(', ')}`);
  }
}

/**
 * Safe permission key parser for external input
 */
export function parsePermissionKey(input: unknown): PermissionKey | null {
  if (typeof input !== 'string') return null;
  return isValidPermissionKey(input) ? input : null;
}

/**
 * Permission key categories for better organization
 */
export const PERMISSION_CATEGORIES = {
  PROFILE: PERMISSION_KEYS.filter(key => key.includes('Profile')),
  SCHEDULE: PERMISSION_KEYS.filter(key => key.includes('Schedule')),
  TASK: PERMISSION_KEYS.filter(key => key.includes('Task')),
  INVENTORY: PERMISSION_KEYS.filter(key => key.startsWith('inventory.')),
  ADMIN: PERMISSION_KEYS.filter(key => key.includes('admin.') || key.includes('manage')),
} as const;

/**
 * Get permission category for a given permission key
 */
export function getPermissionCategory(key: PermissionKey): keyof typeof PERMISSION_CATEGORIES | 'OTHER' {
  for (const [category, keys] of Object.entries(PERMISSION_CATEGORIES)) {
    if (keys.includes(key)) {
      return category as keyof typeof PERMISSION_CATEGORIES;
    }
  }
  return 'OTHER';
}

/**
 * Permission key validation schema for form validation
 */
export const permissionKeySchema = {
  validate: isValidPermissionKey,
  message: `Must be one of: ${PERMISSION_KEYS.join(', ')}`
};
