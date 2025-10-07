import type { User } from '@supabase/supabase-js';

const MANAGER_ALIASES = new Set(['manager', 'owner', 'operations_manager', 'schedule_admin', 'admin', 'gm', 'general_manager']);

export function normaliseRole(role?: string | null): string | null {
  if (!role) return null;
  return String(role).toLowerCase();
}

export function isManagerLikeRole(role?: string | null): boolean {
  const value = normaliseRole(role);
  if (!value) return false;
  if (MANAGER_ALIASES.has(value)) return true;
  if (value.includes('manager')) return true;
  return false;
}

export function canViewScheduleDrafts(user?: User | null, profileRole?: string | null): boolean {
  if (!user) return false;
  if (isManagerLikeRole(profileRole)) return true;

  const metadataRole = normaliseRole(user.user_metadata?.role ?? user.user_metadata?.Role ?? user.user_metadata?.primaryRole);
  if (isManagerLikeRole(metadataRole)) return true;

  const roles = user.user_metadata?.roles as string[] | undefined;
  if (Array.isArray(roles) && roles.some((role) => isManagerLikeRole(role))) {
    return true;
  }

  return false;
}
