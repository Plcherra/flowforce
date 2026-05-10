import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  AdminConfigurationSettings,
  BusinessStructureSettings,
} from "@/types/system-settings";
import { DEFAULT_ADMIN_CONFIG } from "./systemSettingsDefaults";
import type { SystemSettingsHook } from "./useSystemSettings";

export function useAdminSettings(source: SystemSettingsHook) {
  const { settings, updateSettings, company, loading, error, canEdit } = source;
  const base = settings?.adminConfig ?? DEFAULT_ADMIN_CONFIG;

  const [state, setState] = useState<AdminConfigurationSettings>(base);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  useEffect(() => {
    setState(base);
  }, [base]);

  const dirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(base),
    [state, base],
  );

  const save = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettings({ admin_config: state });
    } catch (err) {
      setSaveError(err as Error);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [dirty, state, updateSettings]);

  const reset = useCallback(() => {
    setState(base);
    setSaveError(null);
  }, [base]);

  const refreshSnapshot = useCallback(async () => {
    if (!company?.id) {
      return;
    }

    setSyncError(null);
    setSyncing(true);
    try {
      const [companyResult, locationsResult, rolesResult] = await Promise.all([
        supabase
          .from("companies")
          .select("working_hours")
          .eq("id", company.id)
          .single(),
        supabase
          .from("inv_locations")
          .select("id, name, location_type, temperature_controlled, is_active")
          .eq("company_id", company.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("company_roles")
          .select(
            "id, name, description, color, icon, hierarchy_level, permissions, is_system_role, is_active",
          )
          .eq("company_id", company.id),
      ]);

      const workingHours =
        (companyResult.data
          ?.working_hours as BusinessStructureSettings["workingHours"]) ??
        state.businessStructure.workingHours;

      const locationsSnapshot =
        locationsResult.data?.map((item) => ({
          id: item.id,
          name: item.name,
          location_type: item.location_type,
          temperature_controlled: item.temperature_controlled,
          is_active: item.is_active,
        })) ?? state.businessStructure.locations;

      const roleTemplatesSnapshot =
        rolesResult.data?.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description ?? undefined,
          color: role.color ?? "#6b7280",
          icon: role.icon ?? "Users",
          hierarchy_level: role.hierarchy_level ?? 1,
          permissions:
            typeof role.permissions === "object"
              ? (role.permissions as Record<string, boolean>)
              : {},
          is_system_role: Boolean(role.is_system_role),
          is_active: Boolean(role.is_active ?? true),
        })) ?? state.roleTemplates;

      const updated: AdminConfigurationSettings = {
        ...state,
        businessStructure: {
          ...state.businessStructure,
          workingHours,
          locations: locationsSnapshot,
        },
        roleTemplates: roleTemplatesSnapshot,
      };

      setState(updated);
      await updateSettings({ admin_config: updated });
    } catch (err) {
      setSyncError(err as Error);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, [company?.id, state, updateSettings]);

  return {
    loading,
    globalError: error,
    canEdit,
    state,
    setState,
    dirty,
    saving,
    saveError,
    save,
    reset,
    refreshSnapshot,
    syncing,
    syncError,
  };
}
