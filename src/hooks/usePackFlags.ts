import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_PACK_FLAGS,
  PACK_FLAG_OVERRIDE_STORAGE_KEY,
  applyPackFlagOverride,
  isPackEnabled as isPackFlagOn,
  parsePackFlagOverrides,
  readPackFlagsFromAdminConfig,
  type PackFlags,
  type PackId,
} from "@/config/packFlags";
import { supabase as browserClient } from "@/integrations/supabase/client"; // pragma: allowlist secret
import { useAuth } from "@/hooks/useAuth";
import { appEnv } from "@/lib/env";

function readDevPackOverride() {
  if (!appEnv.DEV || typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PACK_FLAG_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    return parsePackFlagOverrides(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function usePackFlags() {
  const { user } = useAuth();
  const [devOverride, setDevOverride] = useState<ReturnType<typeof readDevPackOverride>>(null);
  const [devLoaded, setDevLoaded] = useState(!appEnv.DEV);

  useEffect(() => {
    if (!appEnv.DEV) return;
    setDevOverride(readDevPackOverride());
    setDevLoaded(true);
  }, []);

  const settingsQuery = useQuery({
    queryKey: ["pack-flags", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<PackFlags> => {
      if (!user?.id) return DEFAULT_PACK_FLAGS;

      const { data: profile, error: profileError } = await browserClient
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile?.company_id) return DEFAULT_PACK_FLAGS;

      const { data: settings, error: settingsError } = await browserClient
        .from("system_settings")
        .select("admin_config")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (settingsError || !settings) return DEFAULT_PACK_FLAGS;

      return readPackFlagsFromAdminConfig(settings.admin_config);
    },
  });

  const flags = useMemo(
    () =>
      applyPackFlagOverride(
        settingsQuery.data ?? DEFAULT_PACK_FLAGS,
        appEnv.DEV ? devOverride : null,
      ),
    [devOverride, settingsQuery.data],
  );

  const isReady =
    devLoaded && (!user?.id || settingsQuery.isFetched || settingsQuery.isError);

  const isPackEnabled = useMemo(() => {
    return (pack: PackId) => isPackFlagOn(flags, pack);
  }, [flags]);

  return {
    flags,
    isPackEnabled,
    isReady,
  };
}

export function usePackFlag(pack: PackId): boolean {
  const { isPackEnabled } = usePackFlags();
  return isPackEnabled(pack);
}
