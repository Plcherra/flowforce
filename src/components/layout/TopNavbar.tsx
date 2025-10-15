import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, User, LogOut, Bell, Search, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCan } from '@/hooks/useCan';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { getRoleBadgeColor, getRoleIcon, getRoleLabel } from '@/data/navigationData';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';

export function TopNavbar() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { can } = useCan();
  const navigate = useNavigate();

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const getRoleIconWithStyle = (role: string) => {
    const Icon = getRoleIcon(role);
    if (!Icon) return null;
    return React.cloneElement(Icon, { 
      className: "h-3 w-3 absolute -bottom-0.5 -right-0.5 text-white bg-primary rounded-full p-0.5 border border-white" 
    });
  };

  return (
    <nav className="flex items-center justify-between flex-1 px-4">
      <div className="flex items-center space-x-6">
        {/* Search Bar */}
        <div className="hidden md:block relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search anything..."
            className="pl-10 w-80 bg-background border-border"
          />
        </div>
      </div>

      {/* Right side - User Profile and Actions */}
      <div className="flex items-center space-x-4">
          {/* Notifications */}
          <NotificationsPanel />

          {/* Settings (for admins) */}
          {can('systemSettings') && (
            <Button variant="ghost" size="sm" onClick={() => handleNavigation('/app/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
          )}

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-sm">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {/* Role icon overlay */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                    {getRoleIcon(profile?.role || 'staff') && React.cloneElement(getRoleIcon(profile?.role || 'staff'), { 
                      className: "h-2.5 w-2.5 text-white" 
                    })}
                  </div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getRoleLabel(profile?.role || 'staff')}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background border shadow-md">
              <div className="px-3 py-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gray-100 dark:bg-gray-800">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <Badge className={`text-xs ${getRoleBadgeColor(profile?.role || 'staff')}`}>
                      <div className="flex items-center space-x-1">
                        {getRoleIcon(profile?.role || 'staff')}
                        <span>{getRoleLabel(profile?.role || 'staff')}</span>
                      </div>
                    </Badge>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigation('/app/profile')}>
                <User className="h-4 w-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation('/app/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
    </nav>
  );
}
