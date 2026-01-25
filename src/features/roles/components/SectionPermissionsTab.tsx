import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useCompanyRoles, type CompanyRole } from '@/hooks/useCompanyRoles';
import { usePositions, type Position, type PositionAssignment } from '@/hooks/usePositions';
import { PERMISSION_KEYS, type PermissionKey } from '@/hooks/useUserPermissions';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { logger } from '@/utils/logger';
import {
  BarChart3,
  CalendarCheck,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  Users
} from 'lucide-react';

type RoleKey = 'owner' | 'admin' | 'manager' | 'supervisor' | 'staff';
type ModuleId =
  | 'workspace'
  | 'team'
  | 'scheduling'
  | 'operations'
  | 'hr'
  | 'finance'
  | 'analytics'
  | 'system';

interface ModuleConfig {
  id: ModuleId;
  label: string;
  description: string;
  icon: LucideIcon;
  permissions: PermissionKey[];
  sections?: string[];
  defaults: Record<RoleKey, boolean>;
  risk: 'low' | 'medium' | 'high';
}

interface RoleMetadata {
  id?: string;
  name: string;
  basePermissions: Record<string, boolean>;
  isSystemFallback?: boolean;
}

interface Suggestion {
  id: string;
  role: RoleKey;
  moduleId: ModuleId;
  recommendation: boolean;
  reason: string;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
}

type AssignmentRecord = PositionAssignment & {
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
  };
};

const ROLE_ORDER: RoleKey[] = ['owner', 'admin', 'manager', 'supervisor', 'staff'];

const ROLE_LABELS: Record<RoleKey, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
  staff: 'Staff'
};

const ROLE_ACCENTS: Record<RoleKey, string> = {
  owner: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-rose-100 text-rose-800 border-rose-200',
  manager: 'bg-blue-100 text-blue-800 border-blue-200',
  supervisor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  staff: 'bg-gray-100 text-gray-800 border-gray-200'
};

const ROLE_MODULES: ModuleConfig[] = [
  {
    id: 'workspace',
    label: 'Workspace Essentials',
    description: 'Dashboard, messaging, tasks, and goal tracking.',
    icon: LayoutDashboard,
    permissions: ['viewOwnProfile', 'viewOwnTasks', 'viewTeamTasks'],
    sections: ['dashboard', 'messages', 'tasks', 'goals'],
    defaults: {
      owner: true,
      admin: true,
      manager: true,
      supervisor: true,
      staff: true
    },
    risk: 'low'
  },
  {
    id: 'team',
    label: 'Team Visibility',
    description: 'Directory, position management, and user oversight.',
    icon: Users,
    permissions: ['viewTeamProfiles', 'manageUsers', 'managePositions', 'directory.view', 'directory.manage'],
    sections: ['staff-roles'],
    defaults: {
      owner: true,
      admin: true,
      manager: true,
      supervisor: false,
      staff: false
    },
    risk: 'medium'
  },
  {
    id: 'scheduling',
    label: 'Scheduling & Time',
    description: 'Shift planning, approvals, and time tracking.',
    icon: CalendarCheck,
    permissions: ['viewOwnSchedules', 'viewTeamSchedules', 'editSchedules', 'approveTimeOff', 'schedule.view', 'schedule.edit'],
    sections: ['scheduling', 'shift-management'],
    defaults: {
      owner: true,
      admin: true,
      manager: true,
      supervisor: true,
      staff: false
    },
    risk: 'medium'
  },
  {
    id: 'operations',
    label: 'Operations & Inventory',
    description: 'Inventory, prep, waste, and purchasing controls.',
    icon: Package,
    permissions: [
      'inventory.view',
      'inventory.create',
      'inventory.edit',
      'inventory.delete',
      'inventory.adjust',
      'inventory.import',
      'inventory.export',
      'inventory.purchasing.view',
      'inventory.purchasing.manage',
      'inventory.counts.view',
      'inventory.counts.create',
      'inventory.counts.edit',
      'inventory.counts.approve',
      'inventory.waste.view',
      'inventory.waste.create',
      'inventory.prep.view',
      'inventory.prep.edit',
      'manageInventory'
    ],
    sections: ['inventory', 'cookbook', 'production'],
    defaults: {
      owner: true,
      admin: true,
      manager: true,
      supervisor: true,
      staff: false
    },
    risk: 'medium'
  },
  {
    id: 'hr',
    label: 'HR & Learning',
    description: 'Learning center, certifications, and form workflows.',
    icon: GraduationCap,
    permissions: ['createForms', 'manageForms', 'approveFormSubmissions', 'approveExpenses', 'viewOwnProfile'],
    sections: ['learning', 'certifications', 'recognition'],
    defaults: {
      owner: true,
      admin: true,
      manager: true,
      supervisor: true,
      staff: false
    },
    risk: 'low'
  },
  {
    id: 'finance',
    label: 'Finance & Billing',
    description: 'Expense approvals, billing, and payment access.',
    icon: DollarSign,
    permissions: ['viewOwnExpenses', 'viewTeamExpenses', 'approveExpenses', 'managePayments', 'billing.view', 'billing.manage'],
    sections: ['expenses'],
    defaults: {
      owner: true,
      admin: true,
      manager: true,
      supervisor: false,
      staff: false
    },
    risk: 'high'
  },
  {
    id: 'analytics',
    label: 'Analytics & AI Insights',
    description: 'Reports, dashboards, and AI-driven recommendations.',
    icon: BarChart3,
    permissions: ['reports.view', 'reports.export', 'viewAIInsights'],
    sections: ['analytics', 'reports'],
    defaults: {
      owner: true,
      admin: true,
      manager: true,
      supervisor: false,
      staff: false
    },
    risk: 'medium'
  },
  {
    id: 'system',
    label: 'System Administration',
    description: 'Critical organization settings and access policies.',
    icon: Settings,
    permissions: ['systemSettings', 'admin.roles', 'admin.permissions', 'admin.settings'],
    sections: [],
    defaults: {
      owner: true,
      admin: true,
      manager: false,
      supervisor: false,
      staff: false
    },
    risk: 'high'
  }
];

const ALL_TRUE_PERMISSIONS = PERMISSION_KEYS.reduce<Record<string, boolean>>((acc, key) => {
  acc[key] = true;
  return acc;
}, {});

function getModuleDefaults(role: RoleKey): Record<ModuleId, boolean> {
  return ROLE_MODULES.reduce((moduleAcc, module) => {
    moduleAcc[module.id] = module.defaults[role];
    return moduleAcc;
  }, {} as Record<ModuleId, boolean>);
}

function createDefaultMatrix(): Record<RoleKey, Record<ModuleId, boolean>> {
  return ROLE_ORDER.reduce((acc, role) => {
    acc[role] = getModuleDefaults(role);
    return acc;
  }, {} as Record<RoleKey, Record<ModuleId, boolean>>);
}

function normalizeRoleName(name?: string | null): RoleKey | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  if (lower.includes('owner')) return 'owner';
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('manager')) return 'manager';
  if (lower.includes('supervisor')) return 'supervisor';
  if (lower.includes('staff') || lower.includes('employee')) return 'staff';
  return undefined;
}

function buildModuleStateFromPermissions(permissions: Record<string, boolean> | null | undefined): Record<ModuleId, boolean> {
  return ROLE_MODULES.reduce((acc, module) => {
    if (module.permissions.length === 0) {
      acc[module.id] = true;
    } else {
      acc[module.id] = module.permissions.every(key => Boolean(permissions?.[key]));
    }
    return acc;
  }, {} as Record<ModuleId, boolean>);
}

function applyModulesToPermissions(
  base: Record<string, boolean>,
  modules: Record<ModuleId, boolean>,
  role: RoleKey
) {
  const updated = { ...base };

  ROLE_MODULES.forEach(module => {
    module.permissions.forEach(permission => {
      updated[permission] = modules[module.id];
    });
  });

  if (role === 'owner') {
    return { ...ALL_TRUE_PERMISSIONS, ...updated };
  }

  return updated;
}

function formatPermissionLabel(key: string) {
  return key
    .replace(/\./g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, str => str.toUpperCase());
}

function getEmployeeDisplayName(record: AssignmentRecord | null | undefined) {
  const profile = record?.profile || record?.profiles;
  if (!profile) return 'Pending assignment';
  const first = profile.first_name || '';
  const last = profile.last_name || '';
  const name = `${first} ${last}`.trim();
  return name || 'Unnamed Employee';
}

export default function SectionPermissionsTab() {
  const { toast } = useToast();
  const { roles, isLoading: rolesLoading, updateRole, refetchRoles } = useCompanyRoles();
  const { positions, assignments, updatePosition } = usePositions();

  const [matrix, setMatrix] = useState<Record<RoleKey, Record<ModuleId, boolean>>>(() => createDefaultMatrix());
  const [roleMetadata, setRoleMetadata] = useState<Record<RoleKey, RoleMetadata>>({});
  const [selectedRole, setSelectedRole] = useState<RoleKey>('manager');
  const [dirtyRoles, setDirtyRoles] = useState<Set<RoleKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const rolesArray = useMemo(
    () => (Array.isArray(roles) ? roles : []),
    [roles]
  );
  const rolesFingerprint = useMemo(
    () => rolesArray.map(role => `${role.id}:${JSON.stringify(role.permissions)}`).join('|'),
    [rolesArray]
  );

  const initializeFromRoles = (rolesToUse: CompanyRole[]) => {
    const nextMetadata: Record<RoleKey, RoleMetadata> = {};
    const nextMatrix: Record<RoleKey, Record<ModuleId, boolean>> = createDefaultMatrix();

    ROLE_ORDER.forEach(roleKey => {
      const existingRole = rolesToUse.find(role => normalizeRoleName(role.name) === roleKey);
      if (existingRole) {
        const parsedPermissions: Record<string, boolean> =
          typeof existingRole.permissions === 'string'
            ? JSON.parse(existingRole.permissions)
            : (existingRole.permissions as Record<string, boolean>) || {};

        nextMetadata[roleKey] = {
          id: existingRole.id,
          name: existingRole.name,
          basePermissions: parsedPermissions
        };
        nextMatrix[roleKey] = buildModuleStateFromPermissions(parsedPermissions);
      } else {
        const defaults = getModuleDefaults(roleKey);
        nextMetadata[roleKey] = {
          name: ROLE_LABELS[roleKey],
          basePermissions: roleKey === 'owner'
            ? { ...ALL_TRUE_PERMISSIONS }
            : applyModulesToPermissions({}, defaults, roleKey),
          isSystemFallback: true
        };
        nextMatrix[roleKey] = defaults;
      }
    });

    setRoleMetadata(nextMetadata);
    setMatrix(nextMatrix);
  };

  useEffect(() => {
    if (rolesLoading) return;
    if (dirtyRoles.size > 0) return;
    initializeFromRoles(rolesArray);
  }, [rolesLoading, dirtyRoles.size, rolesArray, rolesFingerprint]);

  const assignmentByRole = useMemo(() => {
    const map = new Map<RoleKey, { positions: Position[]; employees: string[] }>();
    ROLE_ORDER.forEach(role => map.set(role, { positions: [], employees: [] }));

    positions.forEach(position => {
      const normalized = normalizeRoleName(position.role);
      if (!normalized) return;
      const current = map.get(normalized);
      if (current) {
        current.positions.push(position);
      }
    });

    assignments.forEach(assignment => {
      const normalized = normalizeRoleName(assignment?.position?.role);
      if (!normalized) return;
      const current = map.get(normalized);
      if (current) {
        current.employees.push(getEmployeeDisplayName(assignment));
      }
    });

    return map;
  }, [positions, assignments]);

  const updatedPermissions = useMemo(() => {
    return ROLE_ORDER.reduce<Record<RoleKey, Record<string, boolean>>>((acc, roleKey) => {
      const base = roleMetadata[roleKey]?.basePermissions || {};
      const modules = matrix[roleKey] || getModuleDefaults(roleKey);
      acc[roleKey] = applyModulesToPermissions(base, modules, roleKey);
      return acc;
    }, {} as Record<RoleKey, Record<string, boolean>>);
  }, [matrix, roleMetadata]);

  const selectedRolePermissions = useMemo(
    () => updatedPermissions[selectedRole] || {},
    [updatedPermissions, selectedRole]
  );
  const selectedModules = matrix[selectedRole] || getModuleDefaults(selectedRole);
  const selectedAssignments = assignmentByRole.get(selectedRole);

  const activePermissions = useMemo(() => {
    return Object.entries(selectedRolePermissions)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .sort();
  }, [selectedRolePermissions]);

  const activeModules = useMemo(() => {
    return ROLE_MODULES.filter(module => selectedModules?.[module.id]);
  }, [selectedModules]);

  const suggestions = useMemo(() => {
    const results: Suggestion[] = [];

    ROLE_ORDER.forEach(roleKey => {
      const modules = matrix[roleKey];
      if (!modules) return;

      const assignmentInfo = assignmentByRole.get(roleKey);
      const employeeCount = assignmentInfo?.employees.length ?? 0;

      if ((roleKey === 'manager' || roleKey === 'admin') && !modules.analytics) {
        results.push({
          id: `${roleKey}-enable-analytics`,
          role: roleKey,
          moduleId: 'analytics',
          recommendation: true,
          reason: 'Recent performance reviews depend on analytics visibility. Enabling keeps leadership informed.',
          confidence: 0.82,
          risk: 'medium'
        });
      }

      if (roleKey === 'supervisor' && !modules.scheduling && employeeCount > 4) {
        results.push({
          id: `${roleKey}-enable-scheduling`,
          role: roleKey,
          moduleId: 'scheduling',
          recommendation: true,
          reason: `Supervisors oversee ${employeeCount} teammates but cannot adjust schedules. Enable to reduce approval backlog.`,
          confidence: 0.78,
          risk: 'medium'
        });
      }

      if ((roleKey === 'manager' || roleKey === 'supervisor' || roleKey === 'staff') && modules.system) {
        results.push({
          id: `${roleKey}-disable-system`,
          role: roleKey,
          moduleId: 'system',
          recommendation: false,
          reason: 'System administration access exposes sensitive settings. Limit to Admin/Owner to lower breach risk.',
          confidence: 0.91,
          risk: 'high'
        });
      }

      if (roleKey === 'staff' && modules.operations && employeeCount < 3) {
        results.push({
          id: `${roleKey}-disable-operations`,
          role: roleKey,
          moduleId: 'operations',
          recommendation: false,
          reason: 'Only a few staff members are assigned. Offloading inventory access reduces accidental adjustments.',
          confidence: 0.67,
          risk: 'medium'
        });
      }
    });

    return results;
  }, [matrix, assignmentByRole]);

  const visibleSuggestions = suggestions.filter(suggestion => !dismissedSuggestions.has(suggestion.id));
  const dirtySelectedRole = dirtyRoles.has(selectedRole);

  const handleModuleToggle = (roleKey: RoleKey, moduleId: ModuleId, value: boolean) => {
    if (roleKey === 'owner') return;
    setMatrix(prev => ({
      ...prev,
      [roleKey]: {
        ...(prev[roleKey] || getModuleDefaults(roleKey)),
        [moduleId]: value
      }
    }));
    setDirtyRoles(prev => {
      const next = new Set(prev);
      next.add(roleKey);
      return next;
    });
  };

  const handleSuggestionAction = (suggestion: Suggestion, action: 'apply' | 'dismiss') => {
    if (action === 'dismiss') {
      setDismissedSuggestions(prev => {
        const next = new Set(prev);
        next.add(suggestion.id);
        return next;
      });
      return;
    }

    handleModuleToggle(suggestion.role, suggestion.moduleId, suggestion.recommendation);
    setDismissedSuggestions(prev => {
      const next = new Set(prev);
      next.add(suggestion.id);
      return next;
    });

    toast({
      title: 'Suggestion applied',
      description: `${ROLE_LABELS[suggestion.role]} now ${suggestion.recommendation ? 'has' : 'no longer has'} access to ${ROLE_MODULES.find(m => m.id === suggestion.moduleId)?.label}.`
    });
  };

  const handleResetRole = (roleKey: RoleKey) => {
    if (roleKey === 'owner') return;
    setMatrix(prev => ({
      ...prev,
      [roleKey]: getModuleDefaults(roleKey)
    }));
    setDirtyRoles(prev => {
      const next = new Set(prev);
      next.add(roleKey);
      return next;
    });
  };

  const handleResetAll = () => {
    const nextDirty = new Set<RoleKey>();
    ROLE_ORDER.forEach(role => {
      if (role !== 'owner') {
        nextDirty.add(role);
      }
    });
    setMatrix(createDefaultMatrix());
    setDirtyRoles(nextDirty);
  };

  const handleSave = async () => {
    if (dirtyRoles.size === 0) {
      toast({
        title: 'No changes detected',
        description: 'Adjust the role matrix before saving.'
      });
      return;
    }

    setSaving(true);
    try {
      for (const roleKey of dirtyRoles) {
        const metadata = roleMetadata[roleKey];
        const modules = matrix[roleKey] || getModuleDefaults(roleKey);
        const permissionsToPersist = applyModulesToPermissions(metadata?.basePermissions || {}, modules, roleKey);

        if (roleKey !== 'owner' && metadata?.id && !metadata.id.startsWith('temp-')) {
          await updateRole.mutateAsync({
            id: metadata.id,
            permissions: permissionsToPersist
          });
        }

        const impactedPositions = positions.filter(position => normalizeRoleName(position.role) === roleKey);
        if (impactedPositions.length > 0) {
          await Promise.all(
            impactedPositions.map(position =>
              updatePosition(position.id, { permissions: permissionsToPersist })
            )
          );
        }
      }

      await refetchRoles();
      setDirtyRoles(new Set());
      toast({
        title: 'Permissions updated',
        description: 'Role access changes propagated to linked positions and employees.'
      });
    } catch (error) {
      logger.error('Failed to save role matrix', { error, tags: ['error'] });
      toast({
        title: 'Save failed',
        description: 'We could not sync the updated permissions. Please retry.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Role Matrix</CardTitle>
              <CardDescription>
                Toggle module access per role. Changes update live previews and propagate to linked positions.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetAll} disabled={saving}>
                Reset All
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 pr-4 font-medium text-muted-foreground">Module</th>
                {ROLE_ORDER.map(role => {
                  const assignmentInfo = assignmentByRole.get(role);
                  return (
                    <th key={role} className="text-left py-3 px-2 font-medium text-muted-foreground">
                      <button
                        className={cn(
                          'flex w-full flex-col items-start rounded-md border px-3 py-2 text-left transition',
                          selectedRole === role ? 'border-primary bg-primary/10 text-primary' : 'border-transparent hover:border-border',
                          ROLE_ACCENTS[role]
                        )}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                      >
                        <span className="text-sm font-semibold">{ROLE_LABELS[role]}</span>
                        <span className="text-xs font-normal opacity-80">
                          {assignmentInfo?.positions.length || 0} positions · {assignmentInfo?.employees.length || 0} employees
                        </span>
                        {dirtyRoles.has(role) && (
                          <span className="mt-1 text-xs font-semibold text-primary">Unsaved</span>
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROLE_MODULES.map(module => (
                <tr key={module.id} className="border-b last:border-0">
                  <td className="align-top py-4 pr-4">
                    <div className="flex items-start gap-3">
                      <module.icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-gray-900">{module.label}</div>
                        <div className="text-xs text-muted-foreground">{module.description}</div>
                        {module.sections && module.sections.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {module.sections.map(section => (
                              <Badge key={section} variant="outline" className="text-[10px] uppercase tracking-wide">
                                {section.replace(/-/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {ROLE_ORDER.map(role => {
                    const isOwner = role === 'owner';
                    const value = matrix[role]?.[module.id] ?? module.defaults[role];
                    const isHighRisk = module.risk === 'high' && value;
                    return (
                      <td key={role} className="py-4 px-2 align-middle">
                        <div className="flex flex-col items-start gap-2">
                          <Switch
                            checked={value}
                            disabled={isOwner}
                            onCheckedChange={checked => handleModuleToggle(role, module.id, Boolean(checked))}
                          />
                          <div className="text-xs text-muted-foreground">
                            {value ? 'Enabled' : 'Disabled'}
                          </div>
                          {isHighRisk && (
                            <Badge variant="destructive" className="text-[10px]">
                              Elevated Risk
                            </Badge>
                          )}
                          {!value && module.risk === 'high' && role !== 'owner' && (role === 'admin' || role === 'manager') && (
                            <Badge variant="outline" className="text-[10px]">
                              Critical module off
                            </Badge>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Live Permission Preview</CardTitle>
                <CardDescription>
                  Real-time view of permissions granted to the selected role.
                </CardDescription>
              </div>
              {selectedRole !== 'owner' && (
                <Button variant="outline" size="sm" onClick={() => handleResetRole(selectedRole)} disabled={saving}>
                  Reset {ROLE_LABELS[selectedRole]}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('border', ROLE_ACCENTS[selectedRole])}>{ROLE_LABELS[selectedRole]}</Badge>
              {dirtySelectedRole && (
                <Badge variant="secondary">Pending save</Badge>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Active modules
              </p>
              {activeModules.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No modules enabled.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeModules.map(module => (
                    <Badge key={`${selectedRole}-${module.id}`} variant="outline">
                      <module.icon className="mr-1 h-3 w-3" />
                      {module.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Permissions granted ({activePermissions.length})
              </p>
              {activePermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Toggle modules on to grant feature access for this role.
                </p>
              ) : (
                <ScrollArea className="max-h-48 rounded-md border">
                  <div className="flex flex-wrap gap-2 p-3 text-xs">
                    {activePermissions.slice(0, 24).map(permission => (
                      <Badge key={permission} variant="secondary" className="text-[11px]">
                        {formatPermissionLabel(permission)}
                      </Badge>
                    ))}
                    {activePermissions.length > 24 && (
                      <Badge variant="outline" className="text-[11px]">
                        +{activePermissions.length - 24} more
                      </Badge>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Propagation Summary</CardTitle>
              <CardDescription>
                Automatically syncs with positions and employees assigned to {ROLE_LABELS[selectedRole]}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Positions impacted
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {selectedAssignments?.positions.length ?? 0}
                </p>
                {selectedAssignments && selectedAssignments.positions.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {selectedAssignments.positions.slice(0, 3).map(position => (
                      <li key={position.id}>{position.name}</li>
                    ))}
                    {selectedAssignments.positions.length > 3 && (
                      <li>+{selectedAssignments.positions.length - 3} more positions</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-dashed p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Employees affected
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {selectedAssignments?.employees.length ?? 0}
                </p>
                {selectedAssignments && selectedAssignments.employees.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {selectedAssignments.employees.slice(0, 4).map((employee, index) => (
                      <li key={`${employee}-${index}`}>{employee}</li>
                    ))}
                    {selectedAssignments.employees.length > 4 && (
                      <li>+{selectedAssignments.employees.length - 4} more employees</li>
                    )}
                  </ul>
                )}
              </div>

              <div className="rounded-lg border border-dashed p-4 bg-muted/40">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Propagation mode
                </p>
                <p className="mt-1 text-sm text-gray-800">
                  Changes publish instantly through Position Management so team members stay aligned with their role.
                </p>
                {dirtySelectedRole ? (
                  <p className="mt-2 text-xs font-medium text-primary">
                    Pending save – press “Save Changes” to sync updates.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Up to date – last synced with Position Management.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Suggestions
                  </CardTitle>
                  <CardDescription>
                    Performance and risk-based adjustments generated in real time.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visibleSuggestions.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                  No active suggestions. Keep monitoring performance for fresh insights.
                </div>
              ) : (
                visibleSuggestions.map(suggestion => {
                  const module = ROLE_MODULES.find(item => item.id === suggestion.moduleId);
                  return (
                    <div key={suggestion.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={cn('border', ROLE_ACCENTS[suggestion.role])}>
                              {ROLE_LABELS[suggestion.role]}
                            </Badge>
                            {module && (
                              <Badge variant="outline">{module.label}</Badge>
                            )}
                            <Badge variant={suggestion.risk === 'high' ? 'destructive' : 'secondary'}>
                              {suggestion.risk.charAt(0).toUpperCase() + suggestion.risk.slice(1)} risk
                            </Badge>
                            <Badge variant="secondary">
                              {(suggestion.confidence * 100).toFixed(0)}% confidence
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-gray-800">{suggestion.reason}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleSuggestionAction(suggestion, 'apply')}
                          >
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSuggestionAction(suggestion, 'dismiss')}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
