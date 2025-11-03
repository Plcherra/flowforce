import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type LegacyProfileFields = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  employee_id: string | null;
  employment_status: string | null;
  department_id: string | null;
  hire_date: string | null;
  avatar_url: string | null;
  role_id: string | null;
};

type ProfileDetails = {
  userId: string;
  companyId: string | null;
  role: string | null;
  locationIds: string[];
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  employeeId?: string | null;
  roleId?: string | null;
} & Partial<LegacyProfileFields>;

type ProfileContextValue = {
  profile: ProfileDetails | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refetchProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const profileCache = new Map<string, ProfileDetails | null>();

const buildCacheKey = (userId: string, companyId: string | null | undefined) =>
  `${userId}:${companyId ?? 'none'}`;

const readMetadataValue = (source: Record<string, unknown> | undefined, key: string) => {
  const value = source?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const resolveActiveCompanyIdFromUser = (user: User | null) => {
  if (!user) return null;
  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  return (
    readMetadataValue(appMeta, 'active_company_id') ??
    readMetadataValue(appMeta, 'company_id') ??
    readMetadataValue(userMeta, 'active_company_id') ??
    readMetadataValue(userMeta, 'company_id') ??
    null
  );
};

async function fetchProfileFromSupabase(userId: string, companyId: string | null): Promise<ProfileDetails | null> {
  let query = supabase
    .from('profiles')
    .select(
      'id, company_id, role, role_id, first_name, last_name, email, avatar_url, employee_id, employment_status, department_id, hire_date',
    )
    .eq('id', userId);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (import.meta.env.DEV) {
      console.error('[ProfileProvider] Failed to load profile', {
        userId,
        companyId,
        error,
      });
    }
    throw error;
  }

  if (!data) {
    const missingError = new Error(
      companyId
        ? `Profile not found for user ${userId} in company ${companyId}`
        : `Profile not found for user ${userId}`,
    );
    if (import.meta.env.DEV) {
      console.error('[ProfileProvider] Missing profile row', {
        userId,
        companyId,
      });
    }
    throw missingError;
  }

  // NOTE: locationIds are currently unavailable via Supabase relationships in this context.
  // When the relationship is defined, extend this query to populate the array.
  return {
    userId: data.id,
    companyId: data.company_id ?? null,
    role: data.role ?? null,
    id: data.id,
    company_id: data.company_id ?? null,
    firstName: data.first_name ?? null,
    lastName: data.last_name ?? null,
    first_name: data.first_name ?? null,
    last_name: data.last_name ?? null,
    email: data.email ?? null,
    avatar_url: data.avatar_url ?? null,
    employeeId: data.employee_id ?? null,
    employee_id: data.employee_id ?? null,
    employment_status: data.employment_status ?? null,
    department_id: data.department_id ?? null,
    hire_date: data.hire_date ?? null,
    role_id: data.role_id ?? null,
    roleId: data.role_id ?? null,
    locationIds: [],
  };
}

async function getProfile(userId: string, companyId: string | null, forceRefresh = false): Promise<ProfileDetails | null> {
  const cacheKey = buildCacheKey(userId, companyId);
  if (!forceRefresh && profileCache.has(cacheKey)) {
    return profileCache.get(cacheKey) ?? null;
  }

  const profile = await fetchProfileFromSupabase(userId, companyId);
  profileCache.set(cacheKey, profile ?? null);
  return profile;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedCacheKey, setResolvedCacheKey] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (forceRefresh = false) => {
      if (!user?.id) {
        setProfile(null);
        setResolvedCacheKey(null);
        setError(null);
        setLoading(false);
        return;
      }

      const userId = user.id;
      const activeCompanyId = resolveActiveCompanyIdFromUser(user);
      const cacheKey = buildCacheKey(userId, activeCompanyId);

      if (!forceRefresh && profileCache.has(cacheKey)) {
        setProfile(profileCache.get(cacheKey) ?? null);
        setResolvedCacheKey(cacheKey);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextProfile = await getProfile(userId, activeCompanyId, forceRefresh);
        setProfile(nextProfile);
        setResolvedCacheKey(cacheKey);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load profile';
        if (import.meta.env.DEV) {
          console.error('[ProfileProvider] loadProfile error', {
            userId,
            companyId: activeCompanyId,
            error: err,
          });
        }
        profileCache.delete(cacheKey);
        setProfile(null);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setProfile(null);
      setResolvedCacheKey(null);
      setError(null);
      setLoading(false);
      return;
    }

    const activeCompanyId = resolveActiveCompanyIdFromUser(user);
    const cacheKey = buildCacheKey(user.id, activeCompanyId);

    if (resolvedCacheKey === cacheKey) {
      return;
    }

    loadProfile(false).catch(() => {
      // Errors are handled inside loadProfile.
    });
  }, [authLoading, loadProfile, resolvedCacheKey, user]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(true);
  }, [loadProfile]);

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
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
