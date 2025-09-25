import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, MoreVertical, UserPlus, Crown, Shield, User as UserIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ChannelMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_profile: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface ChannelMembersProps {
  open: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  isAdmin?: boolean;
}

export function ChannelMembers({ open, onClose, channelId, channelName, isAdmin = false }: ChannelMembersProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && channelId) {
      fetchMembers();
    }
  }, [open, channelId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          user_profile:profiles!channel_members_user_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('channel_id', channelId)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load channel members',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('channel_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });

      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Error updating member role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member role',
        variant: 'destructive',
      });
    }
  };

  const removeMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this channel?`)) return;

    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${memberName} has been removed from the channel`,
      });

      fetchMembers(); // Refresh the list
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'moderator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canManageMember = (member: ChannelMember) => {
    return isAdmin && member.user_id !== user?.id;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Channel Members
          </DialogTitle>
          <DialogDescription>
            Manage members in #{channelName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found.
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user_profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {member.user_profile.first_name[0]}{member.user_profile.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {member.user_profile.first_name} {member.user_profile.last_name}
                        </p>
                        {getRoleIcon(member.role)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {member.user_profile.email}
                        </p>
                        <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {canManageMember(member) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role !== 'admin' && (
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'admin')}>
                            <Crown className="h-4 w-4 mr-2" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {member.role !== 'moderator' && member.role !== 'admin' && (
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'moderator')}>
                            <Shield className="h-4 w-4 mr-2" />
                            Make Moderator
                          </DropdownMenuItem>
                        )}
                        {(member.role === 'admin' || member.role === 'moderator') && (
                          <DropdownMenuItem onClick={() => updateMemberRole(member.id, 'member')}>
                            <UserIcon className="h-4 w-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => removeMember(member.id, `${member.user_profile.first_name} ${member.user_profile.last_name}`)}
                          className="text-destructive"
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
          {isAdmin && (
            <Button size="sm" variant="outline" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Members
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}