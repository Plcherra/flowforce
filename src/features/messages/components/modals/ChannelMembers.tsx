import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Users, MoreVertical, UserPlus, Crown, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { messagesRepository, type ChannelMemberDetail } from '@/repositories/messagesRepository';

const AvatarPlaceholder = ({ name }: { name: string }) => (
  <AvatarFallback className="bg-muted text-muted-foreground">
    {name.slice(0, 2).toUpperCase() || 'UN'}
  </AvatarFallback>
);

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
  const [members, setMembers] = useState<ChannelMemberDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<{ id: string; name: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!user?.id || !channelId) return;
    setLoading(true);
    try {
      const data = await messagesRepository.listChannelMembers(channelId, user.id);
      setMembers(data);
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
  }, [channelId, toast, user?.id]);

  useEffect(() => {
    if (open && channelId) {
      fetchMembers();
    }
  }, [fetchMembers, open, channelId]);

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      await messagesRepository.updateMemberRole(memberId, newRole);

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

  const requestMemberRemoval = (memberId?: string, memberName?: string) => {
    if (!memberId) return;
    setMemberPendingRemoval({ id: memberId, name: memberName ?? 'this member' });
  };

  const handleConfirmRemoval = async () => {
    if (!memberPendingRemoval) return;

    try {
      await messagesRepository.removeMember(memberPendingRemoval.id);

      toast({
        title: 'Success',
        description: `${memberPendingRemoval.name} has been removed from the channel`,
      });

      setMemberPendingRemoval(null);
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

  const canManageMember = (member: ChannelMemberDetail) => {
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
              {members.map((member, index) => {
                const profile = member.user_profile;
                const firstName = profile?.first_name ?? '';
                const lastName = profile?.last_name ?? '';
                const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown member';
                const email = profile?.email ?? 'Profile not available';
                const initials =
                  (profile?.first_name?.[0] ?? '') + (profile?.last_name?.[0] ?? '');
                const fallbackInitials =
                  initials.trim() || displayName.slice(0, 2).toUpperCase() || 'UN';
                const rowKey = member.id ?? `${member.user_id}-${member.joined_at ?? index}`;
                const canManage = canManageMember(member) && Boolean(member.id);

                return (
                  <div
                    key={rowKey}
                    className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        {profile?.avatar_url ? (
                          <AvatarImage src={profile.avatar_url || undefined} />
                        ) : null}
                        {profile ? (
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {fallbackInitials}
                          </AvatarFallback>
                        ) : (
                          <AvatarPlaceholder name="Unknown" />
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {displayName}
                          </p>
                          {getRoleIcon(member.role)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {email}
                          </p>
                          <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(member.role)}`}>
                            {member.role}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => updateMemberRole(member.id!, 'admin')}>
                              <Crown className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {member.role !== 'moderator' && member.role !== 'admin' && (
                            <DropdownMenuItem onClick={() => updateMemberRole(member.id!, 'moderator')}>
                              <Shield className="h-4 w-4 mr-2" />
                              Make Moderator
                            </DropdownMenuItem>
                          )}
                          {(member.role === 'admin' || member.role === 'moderator') && (
                            <DropdownMenuItem onClick={() => updateMemberRole(member.id!, 'member')}>
                              <UserIcon className="h-4 w-4 mr-2" />
                              Make Member
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => requestMemberRemoval(member.id, displayName)}
                            className="text-destructive"
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              })}
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
      <AlertDialog open={Boolean(memberPendingRemoval)} onOpenChange={(open) => !open && setMemberPendingRemoval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              {`This will remove ${memberPendingRemoval?.name ?? 'this member'} from #${channelName}. They will lose access to the channel history.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleConfirmRemoval}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
