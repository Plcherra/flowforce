import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PermissionButton, 
  MultiPermissionButton,
  PermissionGuard, 
  MultiPermissionGuard,
  RouteGuard,
  withPermission 
} from '@/components/permissions';
import { useCan, useCanCheck, useCanMultiple, useAllPermissions } from '@/hooks/useCan';
import { UserPlus, Settings, Shield, Users, Eye, Edit } from 'lucide-react';

/**
 * Examples showing how to use the permission system
 */
export function PermissionExamples() {
  const { can, canAny, canAll, getSource, permissions } = useCan();
  const canManageUsers = useCanCheck('manageUsers');
  const canViewOrEdit = useCanMultiple(['viewTeamProfiles', 'editTeamProfiles'], 'any');
  const allPermissions = useAllPermissions();

  return (
    <div className="space-y-6 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Permission System Examples</h1>
        <p className="text-muted-foreground mt-2">
          Demonstrating different ways to use the permission system
        </p>
      </div>

      {/* Hook Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>1. Hook Usage Examples</CardTitle>
          <CardDescription>
            Different ways to check permissions using hooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">useCan Hook</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={can('manageUsers') ? 'default' : 'secondary'}>
                    Manage Users: {can('manageUsers') ? 'Yes' : 'No'}
                  </Badge>
                  <Badge variant="outline">
                    Source: {getSource('manageUsers')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={can('viewTeamProfiles') ? 'default' : 'secondary'}>
                    View Team: {can('viewTeamProfiles') ? 'Yes' : 'No'}
                  </Badge>
                  <Badge variant="outline">
                    Source: {getSource('viewTeamProfiles')}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Specialized Hooks</h4>
              <div className="space-y-2">
                <Badge variant={canManageUsers ? 'default' : 'secondary'}>
                  useCanCheck: {canManageUsers ? 'Yes' : 'No'}
                </Badge>
                <Badge variant={canViewOrEdit ? 'default' : 'secondary'}>
                  useCanMultiple (ANY): {canViewOrEdit ? 'Yes' : 'No'}
                </Badge>
                <Badge variant={canAll(['viewTeamProfiles', 'editTeamProfiles']) ? 'default' : 'secondary'}>
                  canAll (View & Edit): {canAll(['viewTeamProfiles', 'editTeamProfiles']) ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>2. Permission Buttons</CardTitle>
          <CardDescription>
            Buttons that respect permissions with different behaviors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <PermissionButton 
              permission="manageUsers"
              variant="default"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </PermissionButton>

            <PermissionButton 
              permission="systemSettings"
              variant="outline"
              hideWhenDenied={true}
            >
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </PermissionButton>

            <MultiPermissionButton
              permissions={['viewTeamProfiles', 'editTeamProfiles']}
              strategy="any"
              variant="secondary"
            >
              <Users className="h-4 w-4 mr-2" />
              Team Management
            </MultiPermissionButton>

            <MultiPermissionButton
              permissions={['manageUsers', 'systemSettings']}
              strategy="all"
              variant="destructive"
              tooltipMessage="You need both User Management AND System Settings permissions"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin Panel
            </MultiPermissionButton>
          </div>
        </CardContent>
      </Card>

      {/* Permission Guards */}
      <Card>
        <CardHeader>
          <CardTitle>3. Permission Guards</CardTitle>
          <CardDescription>
            Conditional rendering based on permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PermissionGuard 
            permission="manageUsers"
            fallback={<p className="text-muted-foreground">You cannot manage users</p>}
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">✓ You can manage users!</p>
            </div>
          </PermissionGuard>

          <MultiPermissionGuard 
            permissions={['viewTeamProfiles', 'editTeamProfiles']}
            strategy="any"
            fallback={<p className="text-muted-foreground">You cannot view or edit team profiles</p>}
          >
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">✓ You can work with team profiles!</p>
            </div>
          </MultiPermissionGuard>

          <MultiPermissionGuard 
            permissions={['manageUsers', 'systemSettings', 'viewAIInsights']}
            strategy="all"
            fallback={<p className="text-muted-foreground">You need all admin permissions</p>}
          >
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-purple-800">✓ You have full admin access!</p>
            </div>
          </MultiPermissionGuard>
        </CardContent>
      </Card>

      {/* HOC Example */}
      <Card>
        <CardHeader>
          <CardTitle>4. Higher-Order Component (HOC)</CardTitle>
          <CardDescription>
            Using withPermission HOC to wrap components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtectedComponent />
          <ConditionalComponent />
        </CardContent>
      </Card>

      {/* All Permissions Display */}
      <Card>
        <CardHeader>
          <CardTitle>5. All Permissions Status</CardTitle>
          <CardDescription>
            Complete overview of current user permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(allPermissions).map(([permission, hasPermission]) => (
              <div key={permission} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm font-medium">{permission}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={hasPermission ? 'default' : 'secondary'}>
                    {hasPermission ? 'Yes' : 'No'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getSource(permission as any)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Example components using withPermission HOC
const BaseProtectedComponent: React.FC<any> = ({ hasPermission, permissionSource, canCheck }) => (
  <div className={`p-4 border rounded-lg ${hasPermission ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
    <h4 className="font-semibold">Protected Component</h4>
    <p>Permission Status: {hasPermission ? '✓ Allowed' : '✗ Denied'}</p>
    <p>Source: {permissionSource}</p>
    <p>Can also check other permissions: {canCheck('viewTeamProfiles') ? 'Can view team' : 'Cannot view team'}</p>
  </div>
);

const ProtectedComponent = withPermission({
  permissionKey: 'manageUsers',
  renderWhenDenied: true
})(BaseProtectedComponent);

const BaseConditionalComponent: React.FC<any> = () => (
  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <h4 className="font-semibold">Conditional Component</h4>
    <p>This only shows when you have systemSettings permission</p>
  </div>
);

const ConditionalComponent = withPermission({
  permissionKey: 'systemSettings',
  fallback: <p className="text-muted-foreground">System settings component hidden - no permission</p>
})(BaseConditionalComponent);