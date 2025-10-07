import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Tables } from '@/integrations/supabase/types';
import { canViewScheduleDrafts } from '@/utils/authRoles';

// Consolidated scheduling hook that replaces multiple separate hooks
export function useSchedulingConsolidated() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [schedules, setSchedules] = useState<any[]>([]);
  const [unavailability, setUnavailability] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all scheduling data
  const fetchData = async () => {
    if (!user) {
      setSchedules([]);
      setUnavailability([]);
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchSchedules(),
        fetchUnavailability(),
        fetchAssignments()
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch schedules with assignments
  const fetchSchedules = async () => {
    if (!user) return;

    try {
      // Get user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch schedules for the company
      const canSeeDrafts = canViewScheduleDrafts(user);

      let schedulesQuery = supabase
        .from('schedules')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('start_time', { ascending: true });

      if (!canSeeDrafts) {
        schedulesQuery = schedulesQuery.eq('is_published', true);
      }

      const { data: schedulesData, error } = await schedulesQuery;

      if (error) throw error;

      // Fetch assignments separately
      let enrichedSchedules = schedulesData || [];
      
      if (schedulesData && schedulesData.length > 0) {
        const scheduleIds = schedulesData.map(s => s.id);
        
        const { data: assignmentsData } = await supabase
          .from('schedule_assignments')
          .select('*')
          .in('schedule_id', scheduleIds);

        if (assignmentsData && assignmentsData.length > 0) {
          const userIds = [...new Set(assignmentsData.map(a => a.user_id))];
          
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .in('id', userIds);

            const profileMap: Record<string, any> = {};
            profiles?.forEach(profile => {
              profileMap[profile.id] = profile;
            });

            // Group assignments by schedule_id
            const assignmentsBySchedule: Record<string, any[]> = {};
            assignmentsData.forEach(assignment => {
              if (!assignmentsBySchedule[assignment.schedule_id]) {
                assignmentsBySchedule[assignment.schedule_id] = [];
              }
              assignmentsBySchedule[assignment.schedule_id].push({
                ...assignment,
                user: profileMap[assignment.user_id] || null
              });
            });

            // Merge with schedules
            enrichedSchedules = schedulesData.map(schedule => ({
              ...schedule,
              assignments: assignmentsBySchedule[schedule.id] || []
            }));
          }
        }
      }

      setSchedules(enrichedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }
  };

  // Fetch unavailability
  const fetchUnavailability = async () => {
    if (!user) return;

    try {
      const { data: unavailabilityData, error } = await supabase
        .from('user_unavailability')
        .select('*')
        .order('start_time');

      if (error) throw error;

      // Fetch user profiles separately
      if (unavailabilityData && unavailabilityData.length > 0) {
        const userIds = [...new Set(unavailabilityData.map(item => item.created_by))];
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', userIds);

          const profileMap: Record<string, any> = {};
          profiles?.forEach(profile => {
            profileMap[profile.id] = profile;
          });

          const enrichedData = unavailabilityData.map(item => ({
            ...item,
            user: profileMap[item.created_by] || null
          }));

          setUnavailability(enrichedData);
        } else {
          setUnavailability(unavailabilityData);
        }
      } else {
        setUnavailability([]);
      }
    } catch (error) {
      console.error('Error fetching unavailability:', error);
      throw error;
    }
  };

  // Fetch position assignments
  const fetchAssignments = async () => {
    if (!user) return;

    try {
      const { data: assignmentData, error } = await supabase
        .from('position_assignments')
        .select(`
          *,
          position:positions(*)
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Fetch user profiles separately
      if (assignmentData && assignmentData.length > 0) {
        const userIds = [...new Set(assignmentData.map(a => a.user_id))];
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .in('id', userIds);

          const profileMap: Record<string, any> = {};
          profiles?.forEach(profile => {
            profileMap[profile.id] = profile;
          });

          const enrichedData = assignmentData.map(assignment => ({
            ...assignment,
            profile: profileMap[assignment.user_id] || null
          }));

          setAssignments(enrichedData);
        } else {
          setAssignments(assignmentData);
        }
      } else {
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }
  };

  // CRUD operations
  const createSchedule = async (scheduleData: any) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('User must be associated with a company');
      }

      const { data, error } = await supabase
        .from('schedules')
        .insert({
          ...scheduleData,
          company_id: profile.company_id,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchSchedules(); // Refresh data
      
      toast({
        title: "Success",
        description: "Schedule created successfully"
      });
      
      return { data, error: null };
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create schedule',
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const updateSchedule = async (id: string, updates: any) => {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchSchedules(); // Refresh data
      
      toast({
        title: "Success",
        description: "Schedule updated successfully"
      });
      
      return { data, error: null };
    } catch (error) {
      console.error('Error updating schedule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update schedule',
        variant: "destructive"
      });
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
      
      toast({
        title: "Success",
        description: "Schedule deleted successfully"
      });
      
      return { error: null };
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete schedule',
        variant: "destructive"
      });
      return { error };
    }
  };

  // Auto-fetch when user changes
  useEffect(() => {
    fetchData();
  }, [user]);

  return {
    // Data
    schedules,
    unavailability,
    assignments,
    loading,
    error,
    
    // Actions
    fetchData,
    fetchSchedules,
    fetchUnavailability,
    fetchAssignments,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    
    // Helpers
    refetchAll: fetchData,
    refetchSchedules: fetchSchedules
  };
}
