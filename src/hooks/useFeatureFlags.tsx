import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlag,
} from "@/config/featureFlags";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { applyBillingToFeatureFlags } from "@/services/billing/billingPlans";
import { DEFAULT_ADMIN_CONFIG } from "@/features/system/hooks/systemSettingsDefaults";
import type { TenantManagementSettings } from "@/types/system-settings";

const readTenantManagement = (
  value: unknown,
): Partial<TenantManagementSettings> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const adminConfig = value as Record<string, unknown>;
  const tenantManagement = adminConfig.tenantManagement;
  if (
    !tenantManagement ||
    typeof tenantManagement !== "object" ||
    Array.isArray(tenantManagement)
  ) {
    return null;
  }

  return tenantManagement as Partial<TenantManagementSettings>;
};

// Hook to access feature flags throughout the application
export function useFeatureFlags() {
  const { user } = useAuth();
  const tenantManagementQuery = useQuery({
    queryKey: ["billing-feature-flags", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile?.company_id) {
        return null;
      }

      const { data: settings, error: settingsError } = await supabase
        .from("system_settings" as any)
        .select("admin_config")
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (settingsError) {
        return null;
      }

      return readTenantManagement((settings as any)?.admin_config);
    },
    staleTime: 1000 * 60 * 5,
  });

  const flags = useMemo(() => {
    return applyBillingToFeatureFlags(
      DEFAULT_FEATURE_FLAGS,
      tenantManagementQuery.data ??
        DEFAULT_ADMIN_CONFIG.tenantManagement ??
        null,
    );
  }, [tenantManagementQuery.data]);

  const isEnabled = useMemo(() => {
    return (path: string) => getFeatureFlag(flags, path);
  }, [flags]);

  return {
    ...flags,
    isEnabled,
  };
}

// Convenience hook for checking a single feature flag
export function useFeatureFlag(path: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(path);
}
