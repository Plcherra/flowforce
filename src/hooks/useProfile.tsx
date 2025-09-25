
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'> & {
  position?: {
    id: string;
    name: string;
    role: string;
    description?: string;
  };
  company?: {
    id: string;
    name: string;
    primary_color?: string;
    secondary_color?: string;
    registration_complete?: boolean;
  };
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      
      // Use optimized query that works with new RLS policies - fetch without company join to avoid issues
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          *,
          position:positions(
            id,
            name,
            role,
            description
          )
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        // Only create profile if it doesn't exist (not due to RLS)
        if (fetchError.code === 'PGRST116') {
          await createProfile();
          return;
        }
        throw fetchError;
      }

      if (!data) {
        // Profile doesn't exist, create one
        await createProfile();
        return;
      }
      setProfile(data);
      setRetryCount(0);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Only retry if we haven't exceeded max retries
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        // Exponential backoff: 1s, 2s, 4s
        setTimeout(() => {
          fetchProfile();
        }, Math.pow(2, retryCount) * 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, retryCount]);

  const createProfile = async () => {
    if (!user) return;

    try {
      // Create profile with data that satisfies new RLS policies
      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || 'New',
          last_name: user.user_metadata?.last_name || 'User',
          employee_id: `EMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          role: 'staff', // Use 'staff' instead of 'employee' to match enum
          employment_status: 'active'
        })
        .select(`
          *,
          position:positions(
            id,
            name,
            role,
            description
          ),
          company:companies(
            id,
            name,
            primary_color,
            secondary_color,
            registration_complete
          )
        `)
        .single();

      if (insertError) throw insertError;
      setProfile(data);
      setError(null);
      setRetryCount(0);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to create profile: ${errorMessage}`);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Force refresh profile every 30 seconds to catch updates
  useEffect(() => {
    // Smart refresh: reduced frequency and visibility-aware
    const interval = setInterval(() => {
      // Only refetch if document is visible and not already loading
      if (!loading && user?.id && document.visibilityState === 'visible') {
        fetchProfile();
      }
    }, 5 * 60 * 1000); // 5 minutes instead of 30 seconds for better performance

    return () => clearInterval(interval);
  }, [loading, user?.id, fetchProfile]);

  return { 
    profile, 
    loading, 
    error,
    refetchProfile: fetchProfile,
    retryCount 
  };
}
