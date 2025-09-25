
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

type TimeEntry = Tables<'time_entries'>;

export function useTimeEntries() {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTimeEntries();
    } else {
      setTimeEntries([]);
      setLoading(false);
    }
  }, [user]);

  const fetchTimeEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error) {
      console.error('Error fetching time entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTimeEntry = async (entryData: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert(entryData)
        .select()
        .single();

      if (error) throw error;
      setTimeEntries(prev => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating time entry:', error);
      return { data: null, error };
    }
  };

  const getLastEntry = () => {
    return timeEntries.length > 0 ? timeEntries[0] : null;
  };

  const isClockedIn = () => {
    const lastEntry = getLastEntry();
    return lastEntry?.entry_type === 'clock_in';
  };

  return {
    timeEntries,
    loading,
    createTimeEntry,
    getLastEntry,
    isClockedIn,
    refetchTimeEntries: fetchTimeEntries
  };
}
