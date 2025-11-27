// @ts-nocheck
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRightLeft, 
  Clock, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { ShiftSwap, TimeOffRequest } from '@/types/scheduling-unified';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PersonalAvailabilityPanel } from './availability/PersonalAvailabilityPanel';
import { TeamAvailabilityPanel } from './availability/TeamAvailabilityPanel';
import { useProfile } from '@/hooks/useProfile';
import {
  fetchShiftSwaps,
  fetchTimeOffRequests,
  updateShiftSwapStatus,
  updateTimeOffStatus,
} from '@/repositories/shiftSwapsRepository';

export function StaffShiftManagement() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? null;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const shiftSwapsQuery = useQuery({
    queryKey: ['shift-swaps', companyId],
    enabled: Boolean(companyId),
    queryFn: () => fetchShiftSwaps({ companyId: companyId!, limit: 50 }),
  });

  const timeOffQuery = useQuery({
    queryKey: ['timeoff-requests', companyId],
    enabled: Boolean(companyId),
    queryFn: () => fetchTimeOffRequests({ companyId: companyId!, limit: 50 }),
  });

  const shiftSwaps = (shiftSwapsQuery.data ?? []) as unknown as ShiftSwap[];
  const timeOffRequests = (timeOffQuery.data ?? []) as unknown as TimeOffRequest[];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const loading = shiftSwapsQuery.isLoading || timeOffQuery.isLoading;

  const filteredShiftSwaps = useMemo(() => {
    if (!normalizedSearch) return shiftSwaps;
    return shiftSwaps.filter((swap) => {
      const parts = [
        swap.requesting_user?.first_name,
        swap.requesting_user?.last_name,
        swap.target_user?.first_name,
        swap.target_user?.last_name,
        swap.schedule?.title,
        swap.reason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return parts.includes(normalizedSearch);
    });
  }, [shiftSwaps, normalizedSearch]);

  const filteredTimeOffRequests = useMemo(() => {
    if (!normalizedSearch) return timeOffRequests;
    return timeOffRequests.filter((request) => {
      const parts = [
        request.user?.first_name,
        request.user?.last_name,
        request.type,
        request.reason,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return parts.includes(normalizedSearch);
    });
  }, [timeOffRequests, normalizedSearch]);

  const getDisplayName = (user?: { first_name?: string | null; last_name?: string | null }) => {
    const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
    return name || 'Team member';
  };

  const getInitials = (user?: { first_name?: string | null; last_name?: string | null }) => {
    const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.trim();
    return initials || 'TM';
  };

  const handleSwapAction = async (swapId: string, action: 'approve' | 'reject') => {
    if (!companyId) return;
    try {
      await updateShiftSwapStatus({
        swapId,
        status: action === 'approve' ? 'approved' : 'rejected',
        actorId: profile?.id,
      });
      await queryClient.invalidateQueries({ queryKey: ['shift-swaps', companyId] });
      toast({
        title: `Shift swap ${action}d`,
        description: 'Staff have been notified of the decision',
      });
    } catch {
      toast({
        title: 'Error processing request',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleTimeOffAction = async (requestId: string, action: 'approve' | 'reject') => {
    if (!companyId) return;
    try {
      await updateTimeOffStatus({
        requestId,
        action,
        actorId: profile?.id,
      });
      await queryClient.invalidateQueries({ queryKey: ['timeoff-requests', companyId] });
      toast({
        title: `Time off request ${action === 'approve' ? 'approved' : 'denied'}`,
        description: 'Employee has been notified',
      });
    } catch {
      toast({
        title: 'Error processing request',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const getSwapTypeIcon = (type: string) => {
    switch (type) {
      case 'swap': return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
      case 'claim': return <Plus className="h-4 w-4 text-green-500" />;
      case 'give_away': return <Users className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Connect your company profile to manage shift swaps and time off requests.
        </CardContent>
      </Card>
    );
  }

  if (shiftSwapsQuery.isError || timeOffQuery.isError) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Unable to load staff requests right now. Please try again in a moment.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">
            Manage shift swaps, time off requests, and staff availability
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="swaps" className="space-y-6">
        <TabsList>
          <TabsTrigger value="swaps" className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Shift Swaps ({shiftSwaps.filter(s => s.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="timeoff" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Time Off ({timeOffRequests.filter(r => r.status === 'requested').length})
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Availability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swaps" className="space-y-4">
          {filteredShiftSwaps.length > 0 ? (
            filteredShiftSwaps.map((swap) => (
              <Card key={swap.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getSwapTypeIcon(swap.swap_type)}
                        <Badge variant="outline" className="capitalize">
                          {swap.swap_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                       <div className="flex items-center gap-2">
                         <Avatar className="h-8 w-8">
                           <AvatarFallback>{getInitials(swap.requesting_user)}</AvatarFallback>
                         </Avatar>
                         <span className="font-medium text-sm">{getDisplayName(swap.requesting_user)}</span>
                         
                         {swap.target_user && (
                           <>
                             <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                             <Avatar className="h-8 w-8">
                               <AvatarFallback>{getInitials(swap.target_user)}</AvatarFallback>
                             </Avatar>
                             <span className="font-medium text-sm">{getDisplayName(swap.target_user)}</span>
                           </>
                         )}
                       </div>
                    </div>

                    <div className="flex items-center gap-3">
                     <div className="text-right text-sm">
                       <div className="font-medium">{swap.schedule?.title || 'Shift details'}</div>
                       <div className="text-muted-foreground">
                         {swap.schedule?.start_time
                           ? `${format(new Date(swap.schedule.start_time), 'MMM d, HH:mm')} - ${format(
                               new Date(swap.schedule.end_time),
                               'HH:mm',
                             )}`
                           : 'Timing to be confirmed'}
                       </div>
                     </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusIcon(swap.status)}
                        <Badge 
                          variant={
                            swap.status === 'approved' ? 'default' : 
                            swap.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                          className="capitalize"
                        >
                          {swap.status}
                        </Badge>
                      </div>

                      {swap.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSwapAction(swap.id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSwapAction(swap.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {swap.reason && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                      <strong>Reason:</strong> {swap.reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">
                  {normalizedSearch ? 'No shift swaps match your search' : 'No Shift Swap Requests'}
                </h3>
                <p className="text-muted-foreground">
                  {normalizedSearch ? 'Try a different name or role filter.' : 'All shift swap requests are up to date'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-4">
          {filteredTimeOffRequests.length > 0 ? (
            filteredTimeOffRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <Avatar className="h-10 w-10">
                         <AvatarFallback>{getInitials(request.user)}</AvatarFallback>
                       </Avatar>
                       
                       <div>
                         <div className="font-medium">{getDisplayName(request.user)}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </div>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {request.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <Badge 
                          variant={
                            request.status === 'approved' ? 'default' : 
                            request.status === 'denied' ? 'destructive' : 
                            'secondary'
                          }
                          className="capitalize"
                        >
                          {request.status}
                        </Badge>
                      </div>

                      {request.status === 'requested' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleTimeOffAction(request.id, 'approve')}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTimeOffAction(request.id, 'reject')}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {request.reason && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                      <strong>Reason:</strong> {request.reason}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">
                  {normalizedSearch ? 'No time off requests match your search' : 'No Time Off Requests'}
                </h3>
                <p className="text-muted-foreground">
                  {normalizedSearch ? 'Try adjusting your search keywords.' : 'All time off requests are processed'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <PersonalAvailabilityPanel />
          <TeamAvailabilityPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
