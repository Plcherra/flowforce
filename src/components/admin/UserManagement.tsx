
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCan } from '@/hooks/useCan';
import { useCompanyRoles } from '@/hooks/useCompanyRoles';
import { Shield, Users, Crown, UserCheck, Star } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  employee_id: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = useCan();
  const { roles } = useCompanyRoles();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: can('manageUsers'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole, reason }: { userId: string; newRole: string; reason?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as any })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update role: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleRoleChange = async (userId: string, newRole: string, currentRole: string) => {
    if (newRole === currentRole) return;
    
    await updateRoleMutation.mutateAsync({ 
      userId, 
      newRole, 
      reason: `Role changed from ${currentRole} to ${newRole}` 
    });
  };

  const getRoleBadge = (roleName: string) => {
    const role = Array.isArray(roles) 
      ? roles.find(r => r.name.toLowerCase() === roleName.toLowerCase())
      : undefined;
    
    if (role) {
      return (
        <Badge style={{ backgroundColor: role.color + '20', color: role.color }}>
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>{role.name}</span>
          </div>
        </Badge>
      );
    }

    // Fallback for legacy roles
    const legacyColors: Record<string, string> = {
      staff: '#6b7280',
      supervisor: '#10b981',
      manager: '#3b82f6',
      admin: '#ef4444',
      owner: '#8b5cf6',
    };

    const legacyIcons: Record<string, any> = {
      staff: Users,
      supervisor: UserCheck,
      manager: Shield,
      admin: Crown,
      owner: Star,
    };

    const color = legacyColors[roleName] || '#6b7280';
    const IconComponent = legacyIcons[roleName] || Users;
    
    return (
      <Badge style={{ backgroundColor: color + '20', color }}>
        <div className="flex items-center space-x-1">
          <IconComponent className="h-3 w-3" />
          <span>{roleName}</span>
        </div>
      </Badge>
    );
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Users': return Users;
      case 'UserCheck': return UserCheck;
      case 'Shield': return Shield;
      case 'Crown': return Crown;
      case 'Star': return Star;
      default: return Users;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage user roles and permissions</p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>{profiles.length} Users</span>
        </Badge>
      </div>

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {profile.first_name} {profile.last_name}
                    </h3>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                    <p className="text-xs text-gray-500">ID: {profile.employee_id}</p>
                  </div>
                  <div className="text-right">
                    {getRoleBadge(profile.role)}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Select
                    value={profile.role}
                    onValueChange={(newRole) => handleRoleChange(profile.id, newRole, profile.role)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(roles) && roles.map((role) => {
                        const IconComponent = getIconComponent(role.icon);
                        return (
                          <SelectItem key={role.name.toLowerCase()} value={role.name.toLowerCase()}>
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-3 w-3" style={{ color: role.color }} />
                              <span>{role.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
