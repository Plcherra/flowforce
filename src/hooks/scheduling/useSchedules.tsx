// TODO: Remove once all scheduling consumers migrate to useSchedulingConsolidated.
// Deprecated: prefer '@/hooks/scheduling/useSchedulingConsolidated'.
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import type { Tables } from '@/integrations/supabase/types';
import { canViewScheduleDrafts } from '@/utils/authRoles';

type Schedule = Tables<'schedules'>;

export function useSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSchedules();
    } else {
      setSchedules([]);
      setLoading(false);
    }
  }, [user]);

  const fetchSchedules = async () => {
    if (!user) return;

    try {
      const canSeeDrafts = canViewScheduleDrafts(user);

      let query = supabase
        .from('schedules')
        .select(`
          *,
          position:positions(id, name, role),
          assignments:schedule_assignments(
            id,
            user_id,
            status,
            assigned_at
          )
        `)
        .order('start_time', { ascending: true });

      if (!canSeeDrafts) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch user profiles separately to avoid the relationship issue
      const scheduleIds = data?.map(s => s.id) || [];
      const assignmentProfiles: Record<string, any> = {};
      
      if (scheduleIds.length > 0) {
        const { data: assignments } = await supabase
          .from('schedule_assignments')
          .select(`
            id,
            user_id,
            schedule_id,
            status,
            assigned_at
          `)
          .in('schedule_id', scheduleIds);

        if (assignments) {
          const userIds = [...new Set(assignments.map(a => a.user_id))];
          
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .in('id', userIds);

            if (profiles) {
              profiles.forEach(profile => {
                assignmentProfiles[profile.id] = profile;
              });
            }
          }

          // Merge the profile data with assignments
          const enrichedSchedules = data?.map(schedule => ({
            ...schedule,
            assignments: schedule.assignments?.map((assignment: any) => ({
              ...assignment,
              user: assignmentProfiles[assignment.user_id] || null
            })) || []
          }));

          setSchedules(enrichedSchedules || []);
        } else {
          setSchedules(data || []);
        }
      } else {
        setSchedules(data || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (scheduleData: Omit<Schedule, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
    try {
      // Get user's company_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('User must be associated with a company');
      }

      const { data, error } = await supabase
        .from('schedules')
        .insert({
          ...scheduleData,
          company_id: profile.company_id,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSchedules(); // Refresh to get relations
      return { data, error: null };
    } catch (error) {
      console.error('Error creating schedule:', error);
      return { data: null, error };
    }
  };

  const updateSchedule = async (id: string, updates: Partial<Schedule>) => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchSchedules();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating schedule:', error);
      return { data: null, error };
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSchedules(prev => prev.filter(s => s.id !== id));
      return { error: null };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return { error };
    }
  };

  const assignUserToShift = async (scheduleId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_assignments')
        .insert({
          schedule_id: scheduleId,
          user_id: userId,
          assigned_by: user.id,
          status: 'assigned'
        });

      if (error) throw error;
      await fetchSchedules();
      return { error: null };
    } catch (error) {
      console.error('Error assigning user to shift:', error);
      return { error };
    }
  };

  const unassignUserFromShift = async (scheduleId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('schedule_assignments')
        .delete()
        .eq('schedule_id', scheduleId)
        .eq('user_id', userId);

      if (error) throw error;
      await fetchSchedules();
      return { error: null };
    } catch (error) {
      console.error('Error unassigning user from shift:', error);
      return { error };
    }
  };

  const publishSchedule = async (id: string) => {
    return updateSchedule(id, { is_published: true });
  };

  const unpublishSchedule = async (id: string) => {
    return updateSchedule(id, { is_published: false });
  };

  return {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    assignUserToShift,
    unassignUserFromShift,
    publishSchedule,
    unpublishSchedule,
    refetchSchedules: fetchSchedules
  };
}
