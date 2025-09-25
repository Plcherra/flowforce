
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { 
  Calendar, 
  Plus, 
  Clock, 
  Check, 
  X, 
  AlertCircle
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { format, parseISO, differenceInDays } from 'date-fns';

type TimeOffRequest = Tables<'time_off_requests'>;

export default function TimeOff() {
  const { profile } = useProfile();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeOffRequests();
  }, []);

  const fetchTimeOffRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching time off requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <Check className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vacation': return 'bg-blue-100 text-blue-800';
      case 'sick': return 'bg-red-100 text-red-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      case 'emergency': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDays = (startDate: string, endDate: string) => {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  };

  const canManageRequests = profile?.role === 'admin' || profile?.role === 'manager';

  return (
    <div>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Off Requests</h1>
            <p className="text-gray-600 mt-1">
              Manage vacation, sick leave, and other time off requests
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Request Time Off
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests.filter(r => r.status === 'approved').length}
              </div>
              <p className="text-xs text-muted-foreground">
                This year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Used</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests
                  .filter(r => r.status === 'approved')
                  .reduce((total, r) => total + calculateDays(r.start_date, r.end_date), 0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Out of 25 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {25 - requests
                  .filter(r => r.status === 'approved')
                  .reduce((total, r) => total + calculateDays(r.start_date, r.end_date), 0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Days remaining
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time Off Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Time Off Requests</CardTitle>
            <CardDescription>
              {canManageRequests ? 'All employee time off requests' : 'Your time off request history'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        {getStatusIcon(request.status)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{request.reason}</h4>
                          <Badge className={getTypeColor(request.type)}>
                            {request.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {format(parseISO(request.start_date), 'MMM d, yyyy')} - {format(parseISO(request.end_date), 'MMM d, yyyy')}
                          <span className="ml-2">
                            ({calculateDays(request.start_date, request.end_date)} day{calculateDays(request.start_date, request.end_date) !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {request.notes && (
                          <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          Requested on {format(parseISO(request.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      {canManageRequests && request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-600">
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-600">
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {requests.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No time off requests</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {canManageRequests ? 'No requests have been submitted yet.' : 'Get started by creating your first time off request.'}
                    </p>
                    <div className="mt-6">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Request Time Off
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
