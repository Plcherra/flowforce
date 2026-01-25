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
import { logger } from '@/utils/logger';

interface User {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
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
    const loweredQuery = searchQuery.toLowerCase();
    const filtered = users.filter(user => {
      const fields = [user.first_name, user.last_name, user.email]
        .filter((value): value is string => Boolean(value));
      if (fields.length === 0) {
        return 'unknown user'.includes(loweredQuery);
      }
      return fields.some((value) => value.toLowerCase().includes(loweredQuery));
    });
    setFilteredUsers(filtered);
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    if (!currentUser) return;

    setLoading(true);
    const includeSelf = currentProfile?.role === 'admin';
    const currentProfileId = currentProfile?.id ?? currentProfile?.userId ?? currentUser.id;
    const companyId = currentProfile?.companyId ?? currentProfile?.company_id ?? null;
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
      if (!companyId) {
        throw new Error('Company context required to load users');
      }

      let query = supabase
        .from('profiles')
        .select(selectFields)
        .eq('company_id', companyId)
        .eq('employment_status', 'active')
        .order('first_name');

      const { data: activeData, error: activeError } = await query;

      if (activeError) throw activeError;

      let visibleUsers = applySelfVisibility(activeData);

      if (visibleUsers.length === 0) {
        // Fallback: still filter by company_id
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select(selectFields)
          .eq('company_id', companyId)
          .order('first_name');

        if (fallbackError) throw fallbackError;
        visibleUsers = applySelfVisibility(fallbackData);
      }

      const deduped = Array.from(
        new Map(visibleUsers.map((entry) => [entry.id, entry])).values()
      );

      setUsers(deduped);
    } catch (error) {
      logger.error('Error fetching users:', { error, tags: ['error'] });
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
    onUserSelect({
      ...user,
      first_name: user.first_name ?? 'Unknown',
      last_name: user.last_name ?? '',
      email: user.email ?? 'Profile not available',
    });
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
                {filteredUsers.map((user) => {
                  const firstName = user.first_name ?? undefined;
                  const lastName = user.last_name ?? undefined;
                  const hasProfile = Boolean(firstName || lastName || user.email);
                  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown user';
                  const email = user.email ?? 'Profile not available';
                  const initial = firstName?.[0] ?? lastName?.[0] ?? 'U';
                  const secondInitial = lastName?.[0] ?? firstName?.[1] ?? '';
                  const initials = `${initial}${secondInitial}`.trim() || displayName.slice(0, 2).toUpperCase();
                  const isSelectable = hasProfile;

                  return (
                    <Button
                      key={user.id}
                      variant="ghost"
                      className="w-full justify-start h-auto p-3 rounded-xl hover:bg-primary/10"
                      onClick={() => isSelectable && handleUserSelect(user)}
                      disabled={!isSelectable}
                      title={isSelectable ? undefined : 'Profile not available'}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Avatar className="h-10 w-10">
                          {user.avatar_url ? <AvatarImage src={user.avatar_url || undefined} /> : null}
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {email}
                          </p>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
