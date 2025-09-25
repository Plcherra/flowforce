
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCan } from '@/hooks/useCan';
import { usePermissions } from '@/hooks/usePermissions';
import { UnifiedSectionsManager } from '@/components/sections/UnifiedSectionsManager';
import RoleConfigurationTab from '@/components/roles/RoleConfigurationTab';
import SectionPermissionsTab from '@/components/roles/SectionPermissionsTab';
import { AVAILABLE_SECTIONS } from '@/data/availableSections';
 
import { 
  Layers, 
  Shield, 
  Plus,
  Settings,
  LayoutTemplate,
  Zap,
  Users
} from 'lucide-react';

export default function SectionsPermissions() {
  const { can } = useCan();
  const { hasRole } = usePermissions();
  const [enabledSections, setEnabledSections] = useState<string[]>(
    AVAILABLE_SECTIONS.filter(s => s.enabled).map(s => s.id)
  );

  // Business templates are moved to onboarding; no runtime selection here.

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    setEnabledSections(prev => 
      enabled 
        ? [...prev, sectionId]
        : prev.filter(id => id !== sectionId)
    );
  };

  const handleSaveConfiguration = () => {
    // Here you would save the configuration to the backend
  };

  // Check for broader admin permissions using role checking
  if (!can('systemSettings') && !hasRole(['company_admin', 'owner', 'admin'])) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-sm text-gray-500">
            You don't have permission to access sections and permissions management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sections & Access</h1>
            <p className="text-gray-600 mt-1">
              Manage business templates, navigation sections, and role-based access control
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <LayoutTemplate className="mr-2 h-4 w-4" />
              Import Template
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Section
            </Button>
          </div>
        </div>

        <Tabs defaultValue="sections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sections">Section Management</TabsTrigger>
            <TabsTrigger value="roles">Role Configuration</TabsTrigger>
            <TabsTrigger value="permissions">Permissions Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="mr-2 h-5 w-5" />
                  Section Management
                </CardTitle>
                <CardDescription>
                  Configure which sections are available in your workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
            <UnifiedSectionsManager
              selectedSections={enabledSections}
              onSectionToggle={handleSectionToggle}
            />
                
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveConfiguration}>
                    <Settings className="mr-2 h-4 w-4" />
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Role Configuration
                </CardTitle>
                <CardDescription>
                  Create and manage custom roles for your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RoleConfigurationTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <SectionPermissionsTab />
          </TabsContent>

          <TabsContent value="permissions-old" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Role-Based Access Control
                </CardTitle>
                <CardDescription>
                  Configure what each role can access in the application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {['staff', 'supervisor', 'manager', 'admin', 'owner'].map((role) => (
                    <div key={role} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Badge className={`
                            ${role === 'owner' ? 'bg-purple-100 text-purple-800' :
                              role === 'admin' ? 'bg-red-100 text-red-800' :
                              role === 'manager' ? 'bg-blue-100 text-blue-800' :
                              role === 'supervisor' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'}
                          `}>
                            {role.replace('_', ' ')}
                          </Badge>
                          <span className="font-medium capitalize">{role.replace('_', ' ')} Permissions</span>
                        </div>
                        <Button variant="outline" size="sm">
                          Edit Permissions
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Core Features</h5>
                          <div className="space-y-1 text-gray-600">
                            <div>✓ Dashboard</div>
                            <div>✓ Messages</div>
                            <div>✓ Tasks</div>
                            <div>✓ Profile</div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Management</h5>
                          <div className="space-y-1 text-gray-600">
                            <div>{['supervisor', 'manager', 'admin', 'owner'].includes(role) ? '✓' : '✗'} Team View</div>
                            <div>{['manager', 'admin', 'owner'].includes(role) ? '✓' : '✗'} Approve Requests</div>
                            <div>{['admin', 'owner'].includes(role) ? '✓' : '✗'} User Management</div>
                          </div>
                        </div>

                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">System</h5>
                          <div className="space-y-1 text-gray-600">
                            <div>{['manager', 'admin', 'owner'].includes(role) ? '✓' : '✗'} Analytics</div>
                            <div>{['admin', 'owner'].includes(role) ? '✓' : '✗'} Settings</div>
                            <div>{['admin', 'owner'].includes(role) ? '✓' : '✗'} Templates</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
