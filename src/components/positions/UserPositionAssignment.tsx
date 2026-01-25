import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, X } from 'lucide-react';
import { usePositions } from '@/hooks/usePositions';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

interface UserPositionAssignmentProps {
  children?: React.ReactNode;
}

export function UserPositionAssignment({ children }: UserPositionAssignmentProps) {
  const { positions, assignments, assignUserToPosition, removeUserFromPosition, getUserPositions } = usePositions();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .order('first_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      logger.error('Error fetching users:', { error, tags: ['error'] });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignPosition = async (userId: string, positionId: string) => {
    await assignUserToPosition(userId, positionId);
  };

  const handleRemovePosition = async (userId: string, positionId: string) => {
    await removeUserFromPosition(userId, positionId);
  };

  const isUserAssignedToPosition = (userId: string, positionId: string) => {
    return assignments.some(a => 
      a.user_id === userId && 
      a.position_id === positionId && 
      a.is_active
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Positions
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">User Position Assignments</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredUsers.map(user => {
                const userPositions = getUserPositions(user.id);
                
                return (
                  <div
                    key={user.id}
                    className="p-3 sm:p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="text-xs sm:text-sm">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base truncate">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm font-medium">Current Positions:</div>
                      <div className="flex flex-wrap gap-1">
                        {userPositions.length === 0 ? (
                          <span className="text-xs sm:text-sm text-muted-foreground italic">No positions assigned</span>
                        ) : (
                          userPositions.map(position => (
                            <Badge
                              key={position.id}
                              style={{ backgroundColor: position.color, color: 'white' }}
                              className="flex items-center gap-1 text-xs"
                            >
                              {position.name}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-auto p-0 ml-1 text-white hover:text-white hover:bg-white/20"
                                onClick={() => handleRemovePosition(user.id, position.id)}
                              >
                                <X className="h-2 w-2 sm:h-3 sm:w-3" />
                              </Button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs sm:text-sm font-medium">Available Positions:</div>
                      <div className="flex flex-wrap gap-1">
                        {positions
                          .filter(position => !isUserAssignedToPosition(user.id, position.id))
                          .map(position => (
                            <Button
                              key={position.id}
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignPosition(user.id, position.id)}
                              className="text-xs h-7 sm:h-8"
                              style={{ borderColor: position.color, color: position.color }}
                            >
                              <div 
                                className="w-2 h-2 rounded-full mr-1 flex-shrink-0"
                                style={{ backgroundColor: position.color }}
                              />
                              <span className="truncate">{position.name}</span>
                            </Button>
                          ))}
                        {positions.filter(position => !isUserAssignedToPosition(user.id, position.id)).length === 0 && (
                          <span className="text-xs sm:text-sm text-muted-foreground italic">All positions assigned</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}