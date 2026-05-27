import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LocalizationSettings } from "@/types/system-settings";
import { DEFAULT_LOCALIZATION } from "./systemSettingsDefaults";
import type { SystemSettingsHook } from "./useSystemSettings";

export function useLocalizationSettings(source: SystemSettingsHook) {
  const {
    settings,
    company,
    updateSettings,
    loading,
    error,
    canEdit,
    refresh,
  } = source;
  const base = settings?.localization ?? DEFAULT_LOCALIZATION;

  const [state, setState] = useState<LocalizationSettings>(base);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

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
      if (company?.id) {
        const { error: companyError } = await supabase
          .from("companies")
          .update({
            timezone: state.timezone,
            currency: state.currency,
          })
          .eq("id", company.id);

        if (companyError) throw companyError;
      }

      await updateSettings({ localization: state });
      await refresh();
    } catch (err) {
      setSaveError(err as Error);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [company?.id, dirty, refresh, state, updateSettings]);

  const reset = useCallback(() => {
    setState(base);
    setSaveError(null);
  }, [base]);

  const updateRegionalFormat = useCallback(
    (key: keyof LocalizationSettings["regionalFormats"], value: string) => {
      setState((prev) => ({
        ...prev,
        regionalFormats: {
          ...prev.regionalFormats,
          [key]: value,
        },
      }));
    },
    [],
  );

  return {
    loading,
    globalError: error,
    canEdit,
    state,
    setState,
    updateRegionalFormat,
    dirty,
    saving,
    saveError,
    save,
    reset,
  };
}
