import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  employment_status?: string | null;
  role?: string | null;
}

interface UserSelectorProps {
  open: boolean;
  onClose: () => void;
  onUserSelect: (user: User) => void;
}

export function UserSelector({ open, onClose, onUserSelect }: UserSelectorProps) {
  const { user: currentUser } = useAuth();
  const { profile: currentProfile } = useProfile();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open, currentProfile?.role, currentProfile?.id]);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    if (!currentUser) return;

    setLoading(true);
    const includeSelf = currentProfile?.role === 'admin';
    const currentProfileId = currentProfile?.id ?? currentProfile?.userId ?? currentUser.id;
    const selectFields =
      'id, first_name, last_name, email, avatar_url, employment_status, role';

    const applySelfVisibility = (list: User[] | null | undefined) => {
      const entries = list ?? [];
      if (includeSelf || !currentProfileId) {
        return entries;
      }
      return entries.filter((user) => user.id !== currentProfileId);
    };

    try {
      const { data: activeData, error: activeError } = await supabase
        .from('profiles')
        .select(selectFields)
        .eq('employment_status', 'active')
        .order('first_name');

      if (activeError) throw activeError;

      let visibleUsers = applySelfVisibility(activeData);

      if (visibleUsers.length === 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select(selectFields)
          .order('first_name');

        if (fallbackError) throw fallbackError;
        visibleUsers = applySelfVisibility(fallbackData);
      }

      const deduped = Array.from(
        new Map(visibleUsers.map((entry) => [entry.id, entry])).values()
      );

      setUsers(deduped);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    onUserSelect(user);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Start Direct Message
          </DialogTitle>
          <DialogDescription>
            Select a user to start a private conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <ScrollArea className="h-80">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users found matching your search.' : 'No users available.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 rounded-xl hover:bg-primary/10"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {user.first_name[0]}{user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
