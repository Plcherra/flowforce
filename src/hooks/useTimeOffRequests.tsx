
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

type TimeOffRequest = Tables<'time_off_requests'>;

export function useTimeOffRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTimeOffRequests();
    } else {
      setRequests([]);
      setLoading(false);
    }
  }, [user]);

  const fetchTimeOffRequests = async () => {
    if (!user) return;

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

  const createTimeOffRequest = async (requestData: Omit<TimeOffRequest, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;
      setRequests(prev => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating time off request:', error);
      return { data: null, error };
    }
  };

  const updateTimeOffRequest = async (id: string, updates: Partial<TimeOffRequest>) => {
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setRequests(prev => prev.map(r => r.id === id ? data : r));
      return { data, error: null };
    } catch (error) {
      console.error('Error updating time off request:', error);
      return { data: null, error };
    }
  };

  return {
    requests,
    loading,
    createTimeOffRequest,
    updateTimeOffRequest,
    refetchTimeOffRequests: fetchTimeOffRequests
  };
}
