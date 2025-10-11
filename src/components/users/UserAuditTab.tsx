import { useState } from 'react';
import { FileText, Search, Calendar, User, Clock, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuditLogs, type AuditLog } from '@/hooks/useAuditLogs';
import type { Tables } from '@/integrations/supabase/public-types';

type Profile = Tables<'profiles'>;

interface UserAuditTabProps {
  user: Profile;
}

export function UserAuditTab({ user }: UserAuditTabProps) {
  const { data: allAuditLogs, isLoading, error } = useAuditLogs();
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // Filter audit logs for this specific user
  const userAuditLogs = allAuditLogs?.filter(log => 
    log.user_id === user.id || log.performed_by === user.id
  ) || [];

  // Apply additional filters
  const filteredLogs = userAuditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_profile?.first_name + ' ' + log.user_profile?.last_name).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  // Get unique actions for filter dropdown
  const uniqueActions = Array.from(new Set(userAuditLogs.map(log => log.action)));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create')) return 'default';
    if (action.includes('update')) return 'secondary';
    if (action.includes('delete')) return 'destructive';
    return 'outline';
  };

  const getActionDescription = (log: AuditLog) => {
    const actionParts = log.action.split('_');
    const action = actionParts[0];
    const target = log.table_name.replace('_', ' ');
    
    switch (action) {
      case 'created':
        return `Created ${target}`;
      case 'updated':
        return `Updated ${target}`;
      case 'deleted':
        return `Deleted ${target}`;
      default:
        return log.action.replace('_', ' ');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading audit logs: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{userAuditLogs.length}</p>
                <p className="text-sm text-muted-foreground">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {userAuditLogs.filter(log => log.performed_by === user.id).length}
                </p>
                <p className="text-sm text-muted-foreground">Actions Performed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {userAuditLogs.length > 0 ? 
                    new Date(Math.max(...userAuditLogs.map(log => new Date(log.created_at).getTime())))
                      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'Never'
                  }
                </p>
                <p className="text-sm text-muted-foreground">Last Activity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Log
          </CardTitle>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {action.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 w-full bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {getActionDescription(log)}
                          </Badge>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {log.performed_by_profile ? 
                                `${log.performed_by_profile.first_name[0]}${log.performed_by_profile.last_name[0]}` 
                                : 'SY'
                              }
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {log.performed_by_profile ? 
                              `${log.performed_by_profile.first_name} ${log.performed_by_profile.last_name}`
                              : 'System'
                            }
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(log.created_at)}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.table_name} • Record ID: {log.record_id?.slice(0, 8)}...
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                
                {filteredLogs.length === 0 && !isLoading && (
                  <TableCaption>
                    {searchTerm || actionFilter !== 'all' 
                      ? 'No activities match your filters.'
                      : 'No activity recorded for this user.'
                    }
                  </TableCaption>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}