import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Building, UserCheck, Globe } from 'lucide-react';
import { WizardFormData } from '../CreateUpdateWizard';

interface RecipientsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

// TODO: Connect to real employee data system
const DEPARTMENTS = [
  { id: 'hr', name: 'Human Resources', count: 0 },
  { id: 'engineering', name: 'Engineering', count: 0 },
  { id: 'sales', name: 'Sales', count: 0 },
  { id: 'marketing', name: 'Marketing', count: 0 },
  { id: 'operations', name: 'Operations', count: 0 },
  { id: 'finance', name: 'Finance', count: 0 }
];

const ROLES = [
  { id: 'admin', name: 'Admin', count: 0 },
  { id: 'manager', name: 'Manager', count: 0 },
  { id: 'employee', name: 'Employee', count: 0 },
  { id: 'contractor', name: 'Contractor', count: 0 }
];

const USERS: any[] = [];

export function RecipientsStep({ formData, updateFormData }: RecipientsStepProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const updateRecipients = (updates: Partial<typeof formData.recipients>) => {
    updateFormData({
      recipients: { ...formData.recipients, ...updates }
    });
  };

  const handleRecipientTypeChange = (type: typeof formData.recipients.type) => {
    updateRecipients({ 
      type, 
      targets: type === 'all' ? [] : formData.recipients.targets 
    });
  };

  const toggleTarget = (targetId: string, category: 'departments' | 'roles' | 'individuals') => {
    const currentTargets = formData.recipients.targets;
    const prefixedId = `${category}:${targetId}`;
    
    const newTargets = currentTargets.includes(prefixedId)
      ? currentTargets.filter(id => id !== prefixedId)
      : [...currentTargets, prefixedId];
    
    updateRecipients({ targets: newTargets });
  };

  const isTargetSelected = (targetId: string, category: string) => {
    return formData.recipients.targets.includes(`${category}:${targetId}`);
  };

  const getRecipientCount = () => {
    if (formData.recipients.type === 'all') {
      return 'All employees (Connect to see actual count)';
    }
    
    let count = 0;
    formData.recipients.targets.forEach(target => {
      const [category, id] = target.split(':');
      if (category === 'departments') {
        const dept = DEPARTMENTS.find(d => d.id === id);
        count += dept?.count || 0;
      } else if (category === 'roles') {
        const role = ROLES.find(r => r.id === id);
        count += role?.count || 0;
      } else if (category === 'individuals') {
        count += 1;
      }
    });
    
    return count > 0 ? `${count} employees` : 'No recipients selected';
  };

  const filteredUsers = USERS.filter((user: any) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Select Recipients</h3>
        <p className="text-muted-foreground">
          Choose who should receive this update
        </p>
      </div>

      {/* Recipient Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'all' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('all')}
        >
          <CardContent className="p-4 text-center">
            <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h4 className="font-semibold">All Employees</h4>
            <p className="text-sm text-muted-foreground">Everyone in company</p>
            {formData.recipients.type === 'all' && (
              <Badge variant="default" className="mt-2">Selected</Badge>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'departments' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('departments')}
        >
          <CardContent className="p-4 text-center">
            <Building className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h4 className="font-semibold">Departments</h4>
            <p className="text-sm text-muted-foreground">Select by department</p>
            {formData.recipients.type === 'departments' && (
              <Badge variant="default" className="mt-2">Selected</Badge>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'roles' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('roles')}
        >
          <CardContent className="p-4 text-center">
            <UserCheck className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h4 className="font-semibold">Roles</h4>
            <p className="text-sm text-muted-foreground">Select by role</p>
            {formData.recipients.type === 'roles' && (
              <Badge variant="default" className="mt-2">Selected</Badge>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${
            formData.recipients.type === 'individuals' ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => handleRecipientTypeChange('individuals')}
        >
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <h4 className="font-semibold">Individuals</h4>
            <p className="text-sm text-muted-foreground">Select specific users</p>
            {formData.recipients.type === 'individuals' && (
              <Badge variant="default" className="mt-2">Selected</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selection Details */}
      {formData.recipients.type !== 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Departments Selection */}
            {formData.recipients.type === 'departments' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Departments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {DEPARTMENTS.map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={isTargetSelected(dept.id, 'departments')}
                          onCheckedChange={() => toggleTarget(dept.id, 'departments')}
                        />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                      <Badge variant="outline">{dept.count} people</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Roles Selection */}
            {formData.recipients.type === 'roles' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Roles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ROLES.map((role) => (
                    <div key={role.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={isTargetSelected(role.id, 'roles')}
                          onCheckedChange={() => toggleTarget(role.id, 'roles')}
                        />
                        <span className="font-medium">{role.name}</span>
                      </div>
                      <Badge variant="outline">{role.count} people</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Individual Users Selection */}
            {formData.recipients.type === 'individuals' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Select Individuals</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 max-h-60 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm">No employees available. Connect your employee system to select recipients.</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={isTargetSelected(user.id, 'individuals')}
                          onCheckedChange={() => toggleTarget(user.id, 'individuals')}
                        />
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.role} • {user.department}
                          </div>
                        </div>
                      </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recipients Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <div className="text-2xl font-semibold">{getRecipientCount()}</div>
                    <p className="text-sm text-muted-foreground">will receive this update</p>
                  </div>
                  
                  {formData.recipients.targets.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selected:</Label>
                      <div className="flex flex-wrap gap-2">
                        {formData.recipients.targets.map((target) => {
                          const [category, id] = target.split(':');
                          let name = '';
                          if (category === 'departments') {
                            name = DEPARTMENTS.find(d => d.id === id)?.name || id;
                          } else if (category === 'roles') {
                            name = ROLES.find(r => r.id === id)?.name || id;
                           } else if (category === 'individuals') {
                             name = USERS.find((u: any) => u.id === id)?.name || id;
                          }
                          return (
                            <Badge key={target} variant="secondary">
                              {name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}