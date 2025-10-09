import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProfileSummary {
  userId: string;
  companyId: string | null;
  company_id: string | null;
  role: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  employeeId: string | null;
  first_name: string | null;
  last_name: string | null;
  locationIds: string[];
}

interface ProfileContextValue {
  profile: ProfileSummary | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<ProfileSummary | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, company_id, role, first_name, last_name, email, employee_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    userId: data.id,
    companyId: data.company_id ?? null,
    company_id: data.company_id ?? null,
    role: data.role ?? null,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    email: data.email ?? null,
    employeeId: data.employee_id ?? null,
    first_name: data.first_name ?? null,
    last_name: data.last_name ?? null,
    locationIds: [], // TODO: populate once profile/location relationship is defined
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const refreshProfile = useMemo(
    () => async () => {
      if (!user?.id) {
        setProfile(null);
        setResolvedUserId(null);
        setError(null);
        return;
      }
      setLoading(true);
      try {
        const result = await fetchProfile(user.id);
        setProfile(result);
        setResolvedUserId(user.id);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        setError(message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setProfile(null);
      setResolvedUserId(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (resolvedUserId === user.id && profile) {
      return;
    }

    refreshProfile().catch(() => {
      /* handled in refreshProfile */
    });
  }, [authLoading, profile, refreshProfile, resolvedUserId, user?.id]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      loading: authLoading || loading,
      error,
      refreshProfile,
      refetchProfile: refreshProfile,
    }),
    [authLoading, error, loading, profile, refreshProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
