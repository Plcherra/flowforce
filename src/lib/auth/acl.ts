// src/lib/auth/acl.ts
// Centralized Role-Based Access Control for ConnectFlow (Co-Pilot)

export type Role = 'owner' | 'manager' | 'supervisor' | 'prep_lead' | 'employee';

export interface UserIdentity {
  id: string;
  role: Role;
  locations?: string[]; // location IDs the user can act on
}

// Canonical action keys (stable across UI + API)
export type Action =
  | 'rules.manage'
  | 'schedule.generate'
  | 'schedule.assign'
  | 'schedule.publish'
  | 'schedule.swap.approve'
  | 'availability.request'
  | 'availability.approve'
  | 'onboarding.assign_training'
  | 'onboarding.view_progress'
  | 'inventory.update_counts'
  | 'prep.create_task'
  | 'prep.complete_task'
  | 'reports.view';

export interface Scope {
  locationId?: string; // optional scope; undefined = org-wide
}

// Declarative permissions matrix
const PERMISSIONS: Record<Role, Partial<Record<Action, boolean>>> = {
  owner: {
    'rules.manage': true,
    'schedule.generate': true,
    'schedule.assign': true,
    'schedule.publish': true,
    'schedule.swap.approve': true,
    'availability.request': true,
    'availability.approve': true,
    'onboarding.assign_training': true,
    'onboarding.view_progress': true,
    'inventory.update_counts': true,
    'prep.create_task': true,
    'prep.complete_task': true,
    'reports.view': true,
  },
  manager: {
    'rules.manage': false,
    'schedule.generate': true,
    'schedule.assign': true,
    'schedule.publish': true,
    'schedule.swap.approve': true,
    'availability.request': true,
    'availability.approve': true,
    'onboarding.assign_training': true,
    'onboarding.view_progress': true,
    'inventory.update_counts': true,
    'prep.create_task': true,
    'prep.complete_task': true,
    'reports.view': true,
  },
  supervisor: {
    'rules.manage': false,
    'schedule.generate': true,
    'schedule.assign': true,
    'schedule.publish': false,
    'schedule.swap.approve': true,
    'availability.request': true,
    'availability.approve': true,
    'onboarding.assign_training': true,
    'onboarding.view_progress': true,
    'inventory.update_counts': true,
    'prep.create_task': true,
    'prep.complete_task': true,
    'reports.view': true,
  },
  prep_lead: {
    'rules.manage': false,
    'schedule.generate': false,
    'schedule.assign': false,
    'schedule.publish': false,
    'schedule.swap.approve': false,
    'availability.request': true,
    'availability.approve': false,
    'onboarding.assign_training': false,
    'onboarding.view_progress': true,
    'inventory.update_counts': true,
    'prep.create_task': true,
    'prep.complete_task': true,
    'reports.view': true,
  },
  employee: {
    'rules.manage': false,
    'schedule.generate': false,
    'schedule.assign': false,
    'schedule.publish': false,
    'schedule.swap.approve': false,
    'availability.request': true,
    'availability.approve': false,
    'onboarding.assign_training': false,
    'onboarding.view_progress': true, // view their own progress
    'inventory.update_counts': false,
    'prep.create_task': false,
    'prep.complete_task': true,
    'reports.view': true,
  },
};

/**
 * Check if a user has permission to attempt an action.
 * Business rules still enforced by Co-Pilot PolicyEngine.
 */
export function can(user: UserIdentity | null | undefined, action: Action, _scope?: Scope): boolean {
  if (!user) return false;
  return !!PERMISSIONS[user.role]?.[action];
}

// Convenience helpers
export const isOwner = (u?: UserIdentity | null) => u?.role === 'owner';
export const isManager = (u?: UserIdentity | null) => u?.role === 'manager';
export const isSupervisor = (u?: UserIdentity | null) => u?.role === 'supervisor';
export const isPrepLead = (u?: UserIdentity | null) => u?.role === 'prep_lead';
export const isEmployee = (u?: UserIdentity | null) => u?.role === 'employee';

// Export ACL matrix for UI toggles
export const ACL = Object.freeze(PERMISSIONS);