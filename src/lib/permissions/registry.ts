import { z } from 'zod';

/**
 * Shared RBAC schema definitions used across admin and user contexts.
 * Centralizing the permission catalogue ensures a single source of truth
 * for available keys, labels, and descriptions.
 */

export type PermissionValue = 'inherit' | 'allow' | 'deny';

export const PermissionCategorySchema = z.enum([
  'Profile',
  'Scheduling',
  'Tasks',
  'Expenses',
  'User Management',
  'Forms',
  'General',
  'Directory',
  'Inventory',
  'Reports',
  'Billing',
  'Admin',
  'Legacy',
]);

export type PermissionCategory = z.infer<typeof PermissionCategorySchema>;

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  category: PermissionCategory;
  module?: string;
  legacy?: boolean;
}

export const PERMISSION_DEFINITIONS = [
  // Profile
  {
    key: 'viewOwnProfile',
    label: 'View Own Profile',
    description: 'View own profile information',
    category: 'Profile',
  },
  {
    key: 'viewTeamProfiles',
    label: 'View Team Profiles',
    description: 'View team member profiles',
    category: 'Profile',
  },
  {
    key: 'editOwnProfile',
    label: 'Edit Own Profile',
    description: 'Edit own profile information',
    category: 'Profile',
  },
  {
    key: 'editTeamProfiles',
    label: 'Edit Team Profiles',
    description: 'Edit team member profiles',
    category: 'Profile',
  },

  // Scheduling
  {
    key: 'schedule.view',
    label: 'Schedules: View',
    description: 'View company schedules',
    category: 'Scheduling',
  },
  {
    key: 'schedule.edit',
    label: 'Schedules: Edit',
    description: 'Edit existing schedules',
    category: 'Scheduling',
  },
  {
    key: 'schedule.create',
    label: 'Schedules: Create',
    description: 'Create new schedules',
    category: 'Scheduling',
  },
  {
    key: 'schedule.delete',
    label: 'Schedules: Delete',
    description: 'Delete schedules',
    category: 'Scheduling',
  },
  {
    key: 'viewOwnSchedules',
    label: 'View Own Schedules',
    description: 'View own schedules',
    category: 'Scheduling',
  },
  {
    key: 'viewTeamSchedules',
    label: 'View Team Schedules',
    description: 'View schedules for team members',
    category: 'Scheduling',
  },
  {
    key: 'editSchedules',
    label: 'Edit Schedules',
    description: 'Create and edit schedules',
    category: 'Scheduling',
  },

  // Tasks
  {
    key: 'viewOwnTasks',
    label: 'View Own Tasks',
    description: 'View own tasks',
    category: 'Tasks',
  },
  {
    key: 'viewTeamTasks',
    label: 'View Team Tasks',
    description: 'View tasks assigned to team members',
    category: 'Tasks',
  },
  {
    key: 'editTasks',
    label: 'Edit Tasks',
    description: 'Create and edit tasks',
    category: 'Tasks',
  },

  // Expenses & Time Off
  {
    key: 'viewOwnExpenses',
    label: 'View Own Expenses',
    description: 'View own expense reports',
    category: 'Expenses',
  },
  {
    key: 'viewTeamExpenses',
    label: 'View Team Expenses',
    description: 'View expense reports submitted by the team',
    category: 'Expenses',
  },
  {
    key: 'approveExpenses',
    label: 'Approve Expenses',
    description: 'Approve expense submissions',
    category: 'Expenses',
  },
  {
    key: 'approveTimeOff',
    label: 'Approve Time Off',
    description: 'Approve time-off requests',
    category: 'Expenses',
  },

  // User management
  {
    key: 'manageUsers',
    label: 'Manage Users',
    description: 'Manage user accounts and assignments',
    category: 'User Management',
  },
  {
    key: 'systemSettings',
    label: 'System Settings',
    description: 'Configure system-wide settings',
    category: 'User Management',
  },

  // Forms
  {
    key: 'createForms',
    label: 'Create Forms',
    description: 'Create custom forms',
    category: 'Forms',
  },
  {
    key: 'manageForms',
    label: 'Manage Forms',
    description: 'Manage published forms',
    category: 'Forms',
  },
  {
    key: 'approveFormSubmissions',
    label: 'Approve Form Submissions',
    description: 'Approve or reject form submissions',
    category: 'Forms',
  },

  // General / HR
  {
    key: 'managePositions',
    label: 'Manage Positions',
    description: 'Manage positions and departments',
    category: 'General',
  },
  {
    key: 'viewAIInsights',
    label: 'View AI Insights',
    description: 'Access AI-generated analytics and guidance',
    category: 'General',
  },
  {
    key: 'managePayments',
    label: 'Manage Payments',
    description: 'Manage payment workflows',
    category: 'General',
  },

  // Directory
  {
    key: 'directory.view',
    label: 'Directory: View',
    description: 'View the employee directory',
    category: 'Directory',
  },
  {
    key: 'directory.manage',
    label: 'Directory: Manage',
    description: 'Manage directory visibility and entries',
    category: 'Directory',
  },

  // Inventory core
  {
    key: 'inventory.view',
    label: 'Inventory: View',
    description: 'View inventory data',
    category: 'Inventory',
    module: 'Core',
  },
  {
    key: 'inventory.create',
    label: 'Inventory: Create',
    description: 'Create inventory items',
    category: 'Inventory',
    module: 'Core',
  },
  {
    key: 'inventory.edit',
    label: 'Inventory: Edit',
    description: 'Edit inventory items',
    category: 'Inventory',
    module: 'Core',
  },
  {
    key: 'inventory.delete',
    label: 'Inventory: Delete',
    description: 'Delete inventory items',
    category: 'Inventory',
    module: 'Core',
  },
  {
    key: 'inventory.adjust',
    label: 'Inventory: Adjust',
    description: 'Adjust inventory quantities',
    category: 'Inventory',
    module: 'Core',
  },
  {
    key: 'inventory.import',
    label: 'Inventory: Import',
    description: 'Import inventory data',
    category: 'Inventory',
    module: 'Core',
  },
  {
    key: 'inventory.export',
    label: 'Inventory: Export',
    description: 'Export inventory data',
    category: 'Inventory',
    module: 'Core',
  },

  // Inventory purchasing
  {
    key: 'inventory.purchasing.view',
    label: 'Purchasing: View',
    description: 'View purchasing information',
    category: 'Inventory',
    module: 'Purchasing',
  },
  {
    key: 'inventory.purchasing.manage',
    label: 'Purchasing: Manage',
    description: 'Create and manage purchase orders',
    category: 'Inventory',
    module: 'Purchasing',
  },

  // Inventory counts
  {
    key: 'inventory.counts.view',
    label: 'Counts: View',
    description: 'View inventory counts',
    category: 'Inventory',
    module: 'Counts',
  },
  {
    key: 'inventory.counts.create',
    label: 'Counts: Create',
    description: 'Create new inventory counts',
    category: 'Inventory',
    module: 'Counts',
  },
  {
    key: 'inventory.counts.edit',
    label: 'Counts: Edit',
    description: 'Edit existing inventory counts',
    category: 'Inventory',
    module: 'Counts',
  },
  {
    key: 'inventory.counts.approve',
    label: 'Counts: Approve',
    description: 'Review and approve submitted inventory counts',
    category: 'Inventory',
    module: 'Counts',
  },

  // Inventory waste
  {
    key: 'inventory.waste.view',
    label: 'Waste: View',
    description: 'View waste tracking information',
    category: 'Inventory',
    module: 'Waste',
  },
  {
    key: 'inventory.waste.create',
    label: 'Waste: Create',
    description: 'Record waste entries',
    category: 'Inventory',
    module: 'Waste',
  },

  // Inventory prep
  {
    key: 'inventory.prep.view',
    label: 'Prep: View',
    description: 'View prep and PAR data',
    category: 'Inventory',
    module: 'Prep',
  },
  {
    key: 'inventory.prep.edit',
    label: 'Prep: Edit',
    description: 'Edit prep plans and PAR levels',
    category: 'Inventory',
    module: 'Prep',
  },

  // Reports
  {
    key: 'reports.view',
    label: 'Reports: View',
    description: 'View analytics reports',
    category: 'Reports',
  },
  {
    key: 'reports.export',
    label: 'Reports: Export',
    description: 'Export analytics reports',
    category: 'Reports',
  },

  // Billing
  {
    key: 'billing.view',
    label: 'Billing: View',
    description: 'View billing information',
    category: 'Billing',
  },
  {
    key: 'billing.manage',
    label: 'Billing: Manage',
    description: 'Manage billing, subscriptions, and invoices',
    category: 'Billing',
  },

  // Admin console
  {
    key: 'admin.roles',
    label: 'Admin: Roles',
    description: 'Manage user roles',
    category: 'Admin',
  },
  {
    key: 'admin.permissions',
    label: 'Admin: Permissions',
    description: 'Manage permission policies',
    category: 'Admin',
  },
  {
    key: 'admin.settings',
    label: 'Admin: Settings',
    description: 'Access company-wide settings',
    category: 'Admin',
  },

  // Legacy compatibility
  {
    key: 'manageInventory',
    label: 'Manage Inventory (Legacy)',
    description: 'Legacy inventory permission retained for compatibility',
    category: 'Legacy',
    legacy: true,
  },
] as const satisfies ReadonlyArray<PermissionDefinition>;

export type PermissionKey = (typeof PERMISSION_DEFINITIONS)[number]['key'];

export const PERMISSION_KEYS = PERMISSION_DEFINITIONS.map(
  (definition) => definition.key,
) as readonly PermissionKey[];

export const PERMISSIONS_BY_CATEGORY = PERMISSION_DEFINITIONS.reduce(
  (acc, definition) => {
    const category = definition.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category]!.push(definition);
    return acc;
  },
  {} as Record<PermissionCategory, PermissionDefinition[]>,
);

export function getPermissionDefinition(key: PermissionKey): PermissionDefinition | undefined {
  return PERMISSION_DEFINITIONS.find((definition) => definition.key === key);
}

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEYS.includes(value as PermissionKey);
}
