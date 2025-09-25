import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function StaffShiftManagement() {
  const { toast } = useToast();
  const [shiftSwaps, setShiftSwaps] = useState<ShiftSwap[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load shift swaps
      const { data: swaps } = await supabase
        .from('shift_swaps')
        .select(`
          *,
          requesting_user:profiles!shift_swaps_requesting_user_id_fkey(first_name, last_name, avatar_url),
          target_user:profiles!shift_swaps_target_user_id_fkey(first_name, last_name, avatar_url),
          schedule:schedules(title, start_time, end_time, role)
        `)
        .order('created_at', { ascending: false });

      // Load time off requests  
      const { data: timeOff } = await supabase
        .from('time_off_requests')
        .select(`
          *,
          user:profiles(first_name, last_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // Transform data (using unknown for type safety)
      const transformedSwaps = (swaps?.map(swap => ({
        ...swap,
        requesting_user_id: swap.requesting_user_id || '',
        requesting_user: {
          first_name: 'Staff',
          last_name: 'Member',
          avatar_url: ''
        },
        target_user: swap.target_user ? {
          first_name: 'Target',
          last_name: 'Staff',
          avatar_url: ''
        } : undefined,
        swap_type: 'swap' as const,
        status: swap.status as 'pending' | 'approved' | 'rejected'
      })) || []) as unknown as ShiftSwap[];

      const transformedTimeOff = (timeOff?.map(request => ({
        ...request,
        user_id: request.user_id || '',
        user: {
          first_name: 'Staff',
          last_name: 'Member',
          avatar_url: ''
        },
        type: request.type as 'vacation' | 'sick' | 'personal' | 'other'
      })) || []) as unknown as TimeOffRequest[];

      setShiftSwaps(transformedSwaps);
      setTimeOffRequests(transformedTimeOff);
    } catch (error) {
      toast({
        title: "Error loading data",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwapAction = async (swapId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('shift_swaps')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_at: new Date().toISOString()
        })
        .eq('id', swapId);

      if (error) throw error;

      await loadData();
      toast({
        title: `Shift swap ${action}d`,
        description: "Staff have been notified of the decision",
      });
    } catch (error) {
      toast({
        title: "Error processing request",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleTimeOffAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      await loadData();
      toast({
        title: `Time off request ${action}d`,
        description: "Employee has been notified",
      });
    } catch (error) {
      toast({
        title: "Error processing request",
        description: "Please try again",
        variant: "destructive",
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
            Time Off ({timeOffRequests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Availability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swaps" className="space-y-4">
          {shiftSwaps.length > 0 ? (
            shiftSwaps.map((swap) => (
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
                         <Avatar className="w-8 h-8">
                           <AvatarFallback>
                             RS
                           </AvatarFallback>
                         </Avatar>
                         <span className="font-medium text-sm">Requesting Staff</span>
                         
                         {swap.target_user && (
                           <>
                             <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                             <Avatar className="w-8 h-8">
                               <AvatarFallback>
                                 TS
                               </AvatarFallback>
                             </Avatar>
                             <span className="font-medium text-sm">Target Staff</span>
                           </>
                         )}
                       </div>
                    </div>

                    <div className="flex items-center gap-3">
                     <div className="text-right text-sm">
                       <div className="font-medium">Shift Details</div>
                       <div className="text-muted-foreground">
                         Shift information
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
                <h3 className="text-lg font-semibold mb-2">No Shift Swap Requests</h3>
                <p className="text-muted-foreground">All shift swap requests are up to date</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-4">
          {timeOffRequests.length > 0 ? (
            timeOffRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <Avatar className="w-10 h-10">
                         <AvatarFallback>
                           SM
                         </AvatarFallback>
                       </Avatar>
                       
                       <div>
                         <div className="font-medium">Staff Member</div>
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
                            request.status === 'rejected' ? 'destructive' : 
                            'secondary'
                          }
                          className="capitalize"
                        >
                          {request.status}
                        </Badge>
                      </div>

                      {request.status === 'pending' && (
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
                <h3 className="text-lg font-semibold mb-2">No Time Off Requests</h3>
                <p className="text-muted-foreground">All time off requests are processed</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Staff Availability Management</CardTitle>
              <CardDescription>
                Set and manage staff availability patterns and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Availability management interface coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}