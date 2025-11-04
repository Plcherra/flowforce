import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  Clock, 
  User, 
  MessageSquare, 
  Flag,
  Calendar,
  Plus,
  Edit
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/public-types';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TaskActivity = Tables<'task_activities'>;
type TaskActivityWithTask = TaskActivity & {
  tasks: {
    id: string;
    company_id: string | null;
    assigned_to: string | null;
    created_by: string;
  };
};

export function TaskActivityFeed() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const isMountedRef = useRef(false);

  const cleanupSubscription = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanupSubscription();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      cleanupSubscription();
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchActivities(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const subscribeToActivities = (taskIds: string[], userId: string) => {
    cleanupSubscription();
    if (taskIds.length === 0) return;

    const formattedIds = taskIds.map((id) => `"${id.replace(/"/g, '""')}"`).join(',');
    const filter = `task_id=in.(${formattedIds})`;

    const channel = supabase
      .channel(`task-activities-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_activities',
          filter,
        },
        () => {
          fetchActivities(userId);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
  };

  const fetchActivities = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const companyId = profileData?.company_id;

      if (!companyId) {
        if (isMountedRef.current) {
          setActivities([]);
          cleanupSubscription();
        }
        return;
      }

      const { data, error } = await supabase
        .from('task_activities')
        .select(`
          *,
          tasks:tasks!inner(id, company_id, assigned_to, created_by)
        `)
        .eq('tasks.company_id', companyId)
        .or(`tasks.assigned_to.eq.${userId},tasks.created_by.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!isMountedRef.current) return;

      const typed = (data ?? []) as TaskActivityWithTask[];
      const allowedTaskIds = Array.from(
        new Set(
          typed
            .map((row) => row.task_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      const sanitized = typed.map(({ tasks, ...rest }) => rest as TaskActivity);

      setActivities(sanitized);
      subscribeToActivities(allowedTaskIds, userId);
    } catch (error) {
      console.error('Error fetching task activities:', error);
      if (isMountedRef.current) {
        setActivities([]);
        cleanupSubscription();
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'task_created':
        return <Plus className="h-4 w-4 text-blue-500" />;
      case 'task_assigned':
        return <User className="h-4 w-4 text-green-500" />;
      case 'task_status_changed':
        return <Flag className="h-4 w-4 text-purple-500" />;
      case 'task_completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'task_commented':
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case 'task_updated':
        return <Edit className="h-4 w-4 text-orange-500" />;
      case 'task_due_changed':
        return <Calendar className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case 'task_created':
        return 'bg-blue-50 border-l-blue-500';
      case 'task_assigned':
        return 'bg-green-50 border-l-green-500';
      case 'task_status_changed':
        return 'bg-purple-50 border-l-purple-500';
      case 'task_completed':
        return 'bg-green-50 border-l-green-600';
      case 'task_commented':
        return 'bg-indigo-50 border-l-indigo-500';
      case 'task_updated':
        return 'bg-orange-50 border-l-orange-500';
      case 'task_due_changed':
        return 'bg-red-50 border-l-red-500';
      default:
        return 'bg-gray-50 border-l-gray-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest updates and changes across all tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground">Activity will appear here as you work on tasks</p>
            </div>
          ) : (
            <div className="space-y-0">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`p-4 border-l-2 ${getActivityColor(activity.action_type)} ${
                    index !== activities.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.action_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">U</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          User Activity
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-2">
                        {activity.description}
                      </p>
                      
                      {activity.metadata && typeof activity.metadata === 'object' && activity.metadata !== null && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {(activity.metadata as any).old_value && (activity.metadata as any).new_value && (
                            <span>
                              Changed from "{(activity.metadata as any).old_value}" to "{(activity.metadata as any).new_value}"
                            </span>
                          )}
                          {(activity.metadata as any).task_title && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {(activity.metadata as any).task_title}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
