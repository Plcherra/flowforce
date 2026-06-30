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
  departmentid: string | null;
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
  isReady: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refetchProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);

const ALLOW_PROFILE_PLACEHOLDER = appEnv.DEV;

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
    departmentid: null,
    hire_date: null,
    role_id: null,
    roleId: null,
    locationIds: [],
    position: null,
    isPlaceholder: true,
  };
};

async function fetchProfileFromSupabase(
  user: User,
  companyId: string | null,
): Promise<ProfileDetails | null> {
  const userId = user.id;
  try {
    let query = supabase
      .from("profiles")
      .select(
        "id, company_id, role, first_name, last_name, avatar_url, employee_id, phone",
      )
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
      logger.warn(" Missing profile row", {
        context: { userId, companyId },
      });
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
  user: User,
  companyId: string | null,
  _forceRefresh = false,
): Promise<ProfileDetails | null> {
  return fetchProfileFromSupabase(user, companyId);
}

interface LoadProfileStateOptions {
  user: User | null;
  forceRefresh: boolean;
  background?: boolean;
  lastLoadedKeyRef: MutableRefObject<string | null>;
  setProfile: (profile: ProfileDetails | null) => void;
  setError: (message: string | null) => void;
  setLoading: (value: boolean) => void;
  setIsReady: (value: boolean) => void;
  signal?: { cancelled: boolean };
}

async function loadProfileState({
  user,
  forceRefresh,
  background = false,
  lastLoadedKeyRef,
  setProfile,
  setError,
  setLoading,
  setIsReady,
  signal,
}: LoadProfileStateOptions) {
  if (!user?.id) {
    if (!signal?.cancelled) {
      setProfile(null);
      setError(null);
      setLoading(false);
      setIsReady(true);
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
      setError(
        cachedProfile.isPlaceholder ? "Profile setup is incomplete." : null,
      );
      lastLoadedKeyRef.current = cacheKey;
      setLoading(false);
      setIsReady(true);
      return;
    }
  }

  if (!signal?.cancelled && !background) {
    setLoading(true);
  }

  try {
    const fetchedProfile = await getProfile(
      user,
      activeCompanyId,
      forceRefresh,
    );
    if (signal?.cancelled) return;

    const resolvedProfile =
      fetchedProfile ??
      (ALLOW_PROFILE_PLACEHOLDER ? buildProfilePlaceholder(user) : null);

    if (resolvedProfile) {
      profileCache.set(cacheKey, resolvedProfile);
    } else {
      profileCache.delete(cacheKey);
    }

    setProfile(resolvedProfile);
    setError(fetchedProfile ? null : "Profile setup is incomplete.");
    lastLoadedKeyRef.current = cacheKey;
  } catch (error) {
    if (signal?.cancelled) return;

    const message =
      error instanceof Error ? error.message : "Failed to load profile";

    if (ALLOW_PROFILE_PLACEHOLDER) {
      const placeholder = buildProfilePlaceholder(user);
      profileCache.set(cacheKey, placeholder);
      setProfile(placeholder);
    } else {
      profileCache.delete(cacheKey);
      setProfile(null);
    }

    setError(message);
  } finally {
    if (!signal?.cancelled) {
      setLoading(false);
      setIsReady(true);
    }
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const lastLoadedKeyRef = useRef<string | null>(null);
  const isReadyRef = useRef(false);
  const activeCompanyId = resolveActiveCompanyIdFromUser(user);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setProfile(null);
      setError(null);
      setLoading(false);
      setIsReady(true);
      isReadyRef.current = true;
      lastLoadedKeyRef.current = null;
      return;
    }

    const userChanged = !lastLoadedKeyRef.current?.startsWith(`${user.id}:`);
    if (userChanged) {
      isReadyRef.current = false;
      setIsReady(false);
    }

    const signal = { cancelled: false };

    loadProfileState({
      user,
      forceRefresh: userChanged,
      background: isReadyRef.current,
      lastLoadedKeyRef,
      setProfile,
      setError,
      setLoading,
      setIsReady: (value) => {
        isReadyRef.current = value;
        setIsReady(value);
      },
      signal,
    }).catch(() => {
      // Errors handled inside loadProfileState
    });

    return () => {
      signal.cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when tenant metadata changes
  }, [authLoading, user?.id, activeCompanyId]);

  const refreshProfile = async () => {
    await loadProfileState({
      user,
      forceRefresh: true,
      background: true,
      lastLoadedKeyRef,
      setProfile,
      setError,
      setLoading,
      setIsReady: (value) => {
        isReadyRef.current = value;
        setIsReady(value);
      },
    });
  };

  const safeProfile =
    profile ?? (ALLOW_PROFILE_PLACEHOLDER ? buildProfilePlaceholder(user) : null);
  const contextValue: ProfileContextValue = {
    profile: safeProfile,
    loading: authLoading || (loading && !isReady),
    isReady,
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
