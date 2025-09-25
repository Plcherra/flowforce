
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { type CompanyRole, type CreateRoleData } from '@/hooks/useCompanyRoles';
import { Shield, Users, Crown, UserCheck, Star, Settings, Eye, Users as UsersIcon } from 'lucide-react';

const AVAILABLE_ICONS = [
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'UserCheck', label: 'User Check', icon: UserCheck },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Crown', label: 'Crown', icon: Crown },
  { value: 'Star', label: 'Star', icon: Star },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'Eye', label: 'Eye', icon: Eye },
];

const AVAILABLE_PERMISSIONS = [
  { key: 'viewOwnProfile', label: 'View Own Profile', category: 'Profile' },
  { key: 'viewTeamProfiles', label: 'View Team Profiles', category: 'Profile' },
  { key: 'editOwnProfile', label: 'Edit Own Profile', category: 'Profile' },
  { key: 'editTeamProfiles', label: 'Edit Team Profiles', category: 'Profile' },
  { key: 'viewOwnSchedules', label: 'View Own Schedules', category: 'Scheduling' },
  { key: 'viewTeamSchedules', label: 'View Team Schedules', category: 'Scheduling' },
  { key: 'editSchedules', label: 'Edit Schedules', category: 'Scheduling' },
  { key: 'viewOwnTasks', label: 'View Own Tasks', category: 'Tasks' },
  { key: 'viewTeamTasks', label: 'View Team Tasks', category: 'Tasks' },
  { key: 'editTasks', label: 'Edit Tasks', category: 'Tasks' },
  { key: 'viewOwnExpenses', label: 'View Own Expenses', category: 'Expenses' },
  { key: 'viewTeamExpenses', label: 'View Team Expenses', category: 'Expenses' },
  { key: 'approveExpenses', label: 'Approve Expenses', category: 'Expenses' },
  { key: 'approveTimeOff', label: 'Approve Time Off', category: 'Time Off' },
  { key: 'manageUsers', label: 'Manage Users', category: 'Administration' },
  { key: 'systemSettings', label: 'System Settings', category: 'Administration' },
  { key: 'createForms', label: 'Create Forms', category: 'Forms' },
  { key: 'manageForms', label: 'Manage Forms', category: 'Forms' },
  { key: 'approveFormSubmissions', label: 'Approve Form Submissions', category: 'Forms' },
  { key: 'managePositions', label: 'Manage Positions', category: 'HR' },
  { key: 'viewAIInsights', label: 'View AI Insights', category: 'Analytics' },
  { key: 'manageInventory', label: 'Manage Inventory', category: 'Inventory' },
  { key: 'managePayments', label: 'Manage Payments', category: 'Payments' },
];

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: CompanyRole;
  onSave: (data: CreateRoleData) => void;
  isLoading?: boolean;
}

export default function RoleManagementDialog({
  open,
  onOpenChange,
  role,
  onSave,
  isLoading = false
}: RoleManagementDialogProps) {
  const [formData, setFormData] = useState<CreateRoleData>({
    name: role?.name || '',
    description: role?.description || '',
    color: role?.color || '#3b82f6',
    icon: role?.icon || 'Users',
    hierarchy_level: role?.hierarchy_level || 1,
    permissions: role?.permissions || {},
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handlePermissionChange = (permissionKey: string, enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionKey]: enabled,
      },
    }));
  };

  const getIconComponent = (iconName: string) => {
    const iconConfig = AVAILABLE_ICONS.find(i => i.value === iconName);
    return iconConfig?.icon || Users;
  };

  const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {role ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            Configure the role settings and permissions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList>
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Role Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hierarchy">Hierarchy Level</Label>
                  <Input
                    id="hierarchy"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.hierarchy_level}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      hierarchy_level: parseInt(e.target.value) || 1 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this role's responsibilities"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Badge style={{ backgroundColor: formData.color, color: 'white' }}>
                      Preview
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const IconComponent = getIconComponent(formData.icon);
                            return <IconComponent className="h-4 w-4" />;
                          })()}
                          <span>{formData.icon}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.map((iconOption) => {
                        const IconComponent = iconOption.icon;
                        return (
                          <SelectItem key={iconOption.value} value={iconOption.value}>
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{iconOption.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, permissions]) => (
                  <div key={category} className="space-y-3">
                    <h4 className="font-medium text-gray-900">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissions.map((permission) => (
                        <div key={permission.key} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <Label htmlFor={permission.key} className="text-sm font-medium">
                              {permission.label}
                            </Label>
                          </div>
                          <Switch
                            id={permission.key}
                            checked={formData.permissions[permission.key] || false}
                            onCheckedChange={(checked) => handlePermissionChange(permission.key, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (role ? 'Update Role' : 'Create Role')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
