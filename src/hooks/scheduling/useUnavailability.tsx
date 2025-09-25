import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type UserUnavailability = Tables<'user_unavailability'>;

export function useUnavailability() {
  const [unavailability, setUnavailability] = useState<UserUnavailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnavailability();
  }, []);

  const fetchUnavailability = async () => {
    try {
      // Fetch unavailability records first
      const { data: unavailabilityData, error } = await supabase
        .from('user_unavailability')
        .select('*')
        .order('start_time');

      if (error) throw error;

      // Fetch user profiles separately to avoid relationship issues
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

          // Merge profile data with unavailability data
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
      setUnavailability([]);
    } finally {
      setLoading(false);
    }
  };

  const createUnavailability = async (data: Omit<UserUnavailability, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: result, error } = await supabase
        .from('user_unavailability')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      setUnavailability(prev => [...prev, result]);
      return { data: result, error: null };
    } catch (error) {
      console.error('Error creating unavailability:', error);
      return { data: null, error };
    }
  };

  return {
    unavailability,
    loading,
    createUnavailability,
    refetchUnavailability: fetchUnavailability
  };
}