import { useState } from 'react';
import { User, Settings, Shield, FileText, Crown, Users, UserX } from 'lucide-react';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose 
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UserOverviewTab } from './UserOverviewTab';
import { UserPermissionsTab } from './UserPermissionsTab';
import { UserAuditTab } from './UserAuditTab';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface UserProfileDrawerProps {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileDrawer({ user, open, onOpenChange }: UserProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!user) return null;

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'manager':
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'supervisor':
        return <Users className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'default';
      case 'manager':
      case 'admin':
        return 'secondary';
      case 'supervisor':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {user.first_name[0]}{user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <DrawerTitle className="text-2xl">
                  {user.first_name} {user.last_name}
                </DrawerTitle>
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                    {getRoleIcon(user.role)}
                    <span className="capitalize">{user.role}</span>
                  </Badge>
                  <Badge 
                    variant={user.employment_status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {user.employment_status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
              </div>
            </div>
            <DrawerClose asChild>
              <Button variant="outline" size="sm">
                Close
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-6 pb-6 flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <UserOverviewTab user={user} />
            </TabsContent>

            <TabsContent value="permissions" className="mt-0">
              <UserPermissionsTab user={user} />
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <UserAuditTab user={user} />
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}