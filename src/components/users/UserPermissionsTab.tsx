import { useState, useEffect } from 'react';
import { Shield, RotateCcw, Save, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useCompanyRoles } from '@/hooks/useCompanyRoles';
import { 
  useUserPermissionOverrides, 
  useUserEffectivePermissions, 
  useSaveUserPermissions,
  useUpdateUserRole,
  PERMISSION_KEYS,
  type PermissionKey,
  type PermissionValue 
} from '@/hooks/useUserPermissions';
import type { Tables } from '@/integrations/supabase/public-types';

type Profile = Tables<'profiles'>;

interface UserPermissionsTabProps {
  user: Profile;
}

// Permission descriptions for better UX
const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  // Profile permissions
  viewOwnProfile: 'View own profile information',
  viewTeamProfiles: 'View team member profiles',
  editOwnProfile: 'Edit own profile information',
  editTeamProfiles: 'Edit team member profiles',
  
  // Schedule permissions
  'schedule.view': 'View schedules',
  'schedule.edit': 'Edit schedules',
  'schedule.create': 'Create new schedules',
  'schedule.delete': 'Delete schedules',
  viewOwnSchedules: 'View own schedules',
  viewTeamSchedules: 'View team schedules',
  editSchedules: 'Create and edit schedules',
  
  // Task permissions
  viewOwnTasks: 'View own tasks',
  viewTeamTasks: 'View team tasks',
  editTasks: 'Create and edit tasks',
  
  // Expense permissions
  viewOwnExpenses: 'View own expenses',
  viewTeamExpenses: 'View team expenses',
  approveExpenses: 'Approve expense reports',
  approveTimeOff: 'Approve time-off requests',
  
  // User management permissions
  manageUsers: 'Manage user accounts',
  systemSettings: 'Access system settings',
  
  // Form permissions
  createForms: 'Create forms',
  manageForms: 'Manage all forms',
  approveFormSubmissions: 'Approve form submissions',
  
  // General permissions
  managePositions: 'Manage positions and departments',
  viewAIInsights: 'View AI insights and analytics',
  managePayments: 'Manage payments and billing',
  
  // Directory permissions
  'directory.view': 'View employee directory',
  'directory.manage': 'Manage employee directory',
  
  // Inventory permissions - granular
  'inventory.view': 'View inventory',
  'inventory.create': 'Create inventory items',
  'inventory.edit': 'Edit inventory items',
  'inventory.delete': 'Delete inventory items',
  'inventory.adjust': 'Adjust inventory quantities',
  'inventory.import': 'Import inventory data',
  'inventory.export': 'Export inventory data',
  'inventory.purchasing.view': 'View purchasing information',
  'inventory.purchasing.manage': 'Manage purchase orders',
  'inventory.counts.view': 'View inventory counts',
  'inventory.counts.create': 'Create inventory counts',
  'inventory.counts.edit': 'Edit inventory counts',
  'inventory.waste.view': 'View waste tracking',
  'inventory.waste.create': 'Create waste entries',
  'inventory.prep.view': 'View prep & PAR levels',
  'inventory.prep.edit': 'Edit prep & PAR levels',
  
  // Reports permissions
  'reports.view': 'View reports',
  'reports.export': 'Export reports',
  
  // Billing permissions
  'billing.view': 'View billing information',
  'billing.manage': 'Manage billing and payments',
  
  // Admin Console permissions
  'admin.roles': 'Manage user roles',
  'admin.permissions': 'Manage permissions',
  'admin.settings': 'Manage system settings',
  
  // Legacy permissions (maintain compatibility)
  manageInventory: 'Manage inventory (legacy)'
};

export function UserPermissionsTab({ user }: UserPermissionsTabProps) {
  const { roles } = useCompanyRoles();
  const { data: overrides } = useUserPermissionOverrides(user.id);
  const { data: effectivePermissions } = useUserEffectivePermissions(user.id, user.role_id);
  const savePermissions = useSaveUserPermissions();
  const updateUserRole = useUpdateUserRole();

  const [selectedRoleId, setSelectedRoleId] = useState(user.role_id || '');
  const [permissionOverrides, setPermissionOverrides] = useState<Record<string, PermissionValue>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize permission overrides from existing data
  useEffect(() => {
    const overrideMap: Record<string, PermissionValue> = {};
    
    PERMISSION_KEYS.forEach(key => {
      const override = overrides?.find(o => o.permission_key === key);
      overrideMap[key] = override ? override.permission_value : 'inherit';
    });
    
    setPermissionOverrides(overrideMap);
  }, [overrides]);

  const handleRoleChange = async (roleId: string) => {
    const role = roles?.find(r => r.id === roleId);
    if (!role) return;

    setSelectedRoleId(roleId);
    setHasChanges(true);
  };

  const handlePermissionChange = (key: PermissionKey, value: PermissionValue) => {
    setPermissionOverrides(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleResetToDefaults = () => {
    const resetOverrides: Record<PermissionKey, PermissionValue> = {} as Record<PermissionKey, PermissionValue>;
    PERMISSION_KEYS.forEach(key => {
      resetOverrides[key] = 'inherit';
    });
    setPermissionOverrides(resetOverrides);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Save role change if needed
      if (selectedRoleId !== user.role_id && selectedRoleId) {
        const selectedRole = roles?.find(r => r.id === selectedRoleId);
        if (selectedRole) {
          await updateUserRole.mutateAsync({
            userId: user.id,
            roleId: selectedRoleId,
            role: selectedRole.name.toLowerCase() as 'admin' | 'manager' | 'employee' | 'staff' | 'supervisor' | 'owner'
          });
        }
      }

      // Save permission overrides
      await savePermissions.mutateAsync({
        userId: user.id,
        permissions: permissionOverrides
      });

      setHasChanges(false);
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  const getEffectiveValue = (key: PermissionKey): boolean => {
    const effective = effectivePermissions?.find(p => p.key === key);
    return effective?.effective || false;
  };

  const getPermissionIcon = (value: PermissionValue, effective: boolean) => {
    if (value === 'allow') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (value === 'deny') return <XCircle className="h-4 w-4 text-red-600" />;
    return <Circle className={`h-4 w-4 ${effective ? 'text-green-600' : 'text-muted-foreground'}`} />;
  };

  const selectedRole = roles?.find(r => r.id === selectedRoleId);

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedRoleId} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: role.color }}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={handleResetToDefaults}
              disabled={!hasChanges}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>

          {selectedRole && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{selectedRole.name}</p>
              <p className="text-sm text-muted-foreground">{selectedRole.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Permission Overrides</CardTitle>
          <p className="text-sm text-muted-foreground">
            Override specific permissions for this user. Changes take effect immediately upon saving.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Permission</TableHead>
                  <TableHead className="w-[20%] text-center">Override</TableHead>
                  <TableHead className="w-[20%] text-center">Effective</TableHead>
                  <TableHead className="w-[20%]">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERMISSION_KEYS.map((key) => {
                  const effective = getEffectiveValue(key);
                  const override = permissionOverrides[key];
                  const effectivePermission = effectivePermissions?.find(p => p.key === key);
                  
                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{key}</p>
                          <p className="text-xs text-muted-foreground">
                            {PERMISSION_DESCRIPTIONS[key]}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select 
                          value={override} 
                          onValueChange={(value: PermissionValue) => handlePermissionChange(key, value)}
                        >
                          <SelectTrigger className="w-[120px] mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">Inherit</SelectItem>
                            <SelectItem value="allow">Allow</SelectItem>
                            <SelectItem value="deny">Deny</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getPermissionIcon(override, effective)}
                          <Badge variant={effective ? 'default' : 'secondary'}>
                            {effective ? 'Allow' : 'Deny'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {effectivePermission?.source === 'override' ? 'Override' : 'Role'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || savePermissions.isPending || updateUserRole.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {savePermissions.isPending || updateUserRole.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}