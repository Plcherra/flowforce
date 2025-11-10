import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';

export type TaskActivity = Tables<'task_activities'>;

export function useTaskTimeline(taskId: string | null, open: boolean) {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!taskId || !open) {
      setActivities([]);
      return;
    }

    let isMounted = true;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('task_activities')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (isMounted) {
          setActivities(data ?? []);
        }
      } catch (error) {
        console.error('Error fetching task timeline:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivities();

    const channel = supabase
      .channel(`task-timeline-${taskId}`)
      .on(
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_activities',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const newEntry = payload.new as TaskActivity;
          setActivities((prev) => [...prev, newEntry].sort((a, b) => a.created_at.localeCompare(b.created_at)));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [taskId, open]);

  return { activities, loading };
}
