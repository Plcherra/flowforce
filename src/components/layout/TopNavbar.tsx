import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, LogOut, Search, Settings, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCan } from '@/hooks/useCan';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { getRoleBadgeColor, getRoleIcon, getRoleLabel } from '@/data/navigationData';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function TopNavbar() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { can } = useCan();
  const navigate = useNavigate();
  const [addNewOpen, setAddNewOpen] = useState(false);

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <>
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

        {/* Right side - Global Add New + User Profile and Actions */}
        <div className="flex items-center space-x-4">
          {/* Global Add New Button */}
          <Button
            onClick={() => setAddNewOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add New</span>
          </Button>

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
              <Button variant="ghost" className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-muted text-sm">
                      {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {/* Role icon overlay */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                    {getRoleIcon(profile?.role || 'staff') && React.cloneElement(getRoleIcon(profile?.role || 'staff'), { 
                      className: "h-2.5 w-2.5 text-primary-foreground" 
                    })}
                  </div>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-foreground">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
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
                    <AvatarFallback className="bg-muted">
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

      {/* Add New Modal */}
      <Dialog open={addNewOpen} onOpenChange={setAddNewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Item</DialogTitle>
            <DialogDescription>
              Create new item (contextual actions will be added later).
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p className="text-center">
              This modal will provide context-aware quick actions based on your current page.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setAddNewOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
