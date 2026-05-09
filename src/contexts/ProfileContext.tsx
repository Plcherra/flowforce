import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { appEnv } from "@/lib/env";
import { logger } from "@/utils/logger";

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
  isPlaceholder?: boolean;
  position?: {
    id?: string | null;
    name?: string | null;
    role?: string | null;
  } | null;
} & Partial<LegacyProfileFields>;

type ProfileContextValue = {
  profile: ProfileDetails | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refetchProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);

const profileCache = new Map<string, ProfileDetails>();

const buildCacheKey = (userId: string, companyId: string | null | undefined) =>
  `${userId}:${companyId ?? "none"}`;

const readMetadataValue = (
  source: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = source?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
};

const resolveActiveCompanyIdFromUser = (user: User | null) => {
  if (!user) return null;
  const appMeta = user.app_metadata as Record<string, unknown> | undefined;
  const userMeta = user.user_metadata as Record<string, unknown> | undefined;
  return (
    readMetadataValue(appMeta, "active_company_id") ??
    readMetadataValue(appMeta, "company_id") ??
    readMetadataValue(userMeta, "active_company_id") ??
    readMetadataValue(userMeta, "company_id") ??
    null
  );
};

const buildProfilePlaceholder = (user: User | null): ProfileDetails => {
  const fallbackId = user?.id ?? "anonymous-user";
  const companyId = resolveActiveCompanyIdFromUser(user);
  const userMetadata = user?.user_metadata as
    | Record<string, unknown>
    | undefined;
  const placeholderFirstName =
    readMetadataValue(userMetadata, "first_name") ??
    (typeof user?.email === "string" ? user.email.split("@")[0] : "New");
  const placeholderLastName =
    readMetadataValue(userMetadata, "last_name") ?? "Teammate";
  const resolvedRole =
    readMetadataValue(userMetadata, "role") ??
    readMetadataValue(userMetadata, "position_role") ??
    "owner";

  return {
    userId: fallbackId,
    companyId,
    role: resolvedRole,
    id: fallbackId,
    company_id: companyId,
    firstName: placeholderFirstName,
    lastName: placeholderLastName,
    first_name: placeholderFirstName,
    last_name: placeholderLastName,
    email: user?.email ?? null,
    avatar_url: readMetadataValue(userMetadata, "avatar_url"),
    employeeId: null,
    employee_id: null,
    employment_status: null,
    department_id: null,
    hire_date: null,
    role_id: null,
    roleId: null,
    locationIds: [],
    position: null,
    isPlaceholder: true,
  };
};

async function fetchProfileFromSupabase(
  userId: string,
  companyId: string | null,
): Promise<ProfileDetails | null> {
  try {
    let query = supabase
      .from("profiles")
      .select("id, company_id, role, first_name, last_name, avatar_url, employee_id, phone")
      .eq("id", userId);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.error(" Failed to load profile", { error });
      return null;
    }

    if (!data) {
      logger.error(" Missing profile row", { userId, companyId });
      return null;
    }

    return {
      userId: data.id,
      companyId: data.company_id ?? null,
      role: data.role ?? "employee",
      id: data.id,
      company_id: data.company_id ?? null,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      avatar_url: data.avatar_url ?? null,
      employeeId: data.employee_id ?? null,
      employee_id: data.employee_id ?? null,
      role_id: null,
      roleId: null,
      locationIds: [],
      position: null,
      isPlaceholder: false,
    };
  } catch (error) {
    logger.error(" Unexpected profile fetch error", { error });
    return null;
  }
}

async function getProfile(
  userId: string,
  companyId: string | null,
  _forceRefresh = false,
): Promise<ProfileDetails | null> {
  return fetchProfileFromSupabase(userId, companyId);
}

interface LoadProfileStateOptions {
  user: User | null;
  forceRefresh: boolean;
  lastLoadedKeyRef: MutableRefObject<string | null>;
  setProfile: (profile: ProfileDetails | null) => void;
  setError: (message: string | null) => void;
  setLoading: (value: boolean) => void;
  signal?: { cancelled: boolean };
}

async function loadProfileState({
  user,
  forceRefresh,
  lastLoadedKeyRef,
  setProfile,
  setError,
  setLoading,
  signal,
}: LoadProfileStateOptions) {
  if (!user?.id) {
    if (!signal?.cancelled) {
      setProfile(null);
      setError(null);
      setLoading(false);
      lastLoadedKeyRef.current = null;
    }
    return;
  }

  const activeCompanyId = resolveActiveCompanyIdFromUser(user);
  const cacheKey = buildCacheKey(user.id, activeCompanyId);

  if (forceRefresh) {
    profileCache.delete(cacheKey);
  } else if (profileCache.has(cacheKey)) {
    const cachedProfile = profileCache.get(cacheKey);
    if (cachedProfile) {
      setProfile(cachedProfile);
      setError(null);
      lastLoadedKeyRef.current = cacheKey;
      if (!cachedProfile.isPlaceholder) {
        setLoading(false);
        return;
      }
    }
  }

  if (!signal?.cancelled) {
    setLoading(true);
  }

  try {
    const fetchedProfile = await getProfile(
      user.id,
      activeCompanyId,
      forceRefresh,
    );
    if (signal?.cancelled) return;

    const resolvedProfile = fetchedProfile ?? buildProfilePlaceholder(user);
    profileCache.set(cacheKey, resolvedProfile);

    setProfile(resolvedProfile);
    setError(null);
    lastLoadedKeyRef.current = cacheKey;
  } catch (error) {
    if (signal?.cancelled) return;

    const placeholder = buildProfilePlaceholder(user);
    profileCache.set(cacheKey, placeholder);
    setProfile(placeholder);
    const message =
      error instanceof Error ? error.message : "Failed to load profile";
    setError(message);
  } finally {
    if (!signal?.cancelled) {
      setLoading(false);
    }
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    const signal = { cancelled: false };

    loadProfileState({
      user,
      forceRefresh: false,
      lastLoadedKeyRef,
      setProfile,
      setError,
      setLoading,
      signal,
    }).catch(() => {
      // Errors handled inside loadProfileState
    });

    return () => {
      signal.cancelled = true;
    };
  }, [authLoading, user]);

  const refreshProfile = async () => {
    await loadProfileState({
      user,
      forceRefresh: true,
      lastLoadedKeyRef,
      setProfile,
      setError,
      setLoading,
    });
  };

  const safeProfile = profile ?? buildProfilePlaceholder(user);
  const contextValue: ProfileContextValue = {
    profile: safeProfile,
    loading: authLoading || loading,
    error,
    refreshProfile,
    refetchProfile: refreshProfile,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
