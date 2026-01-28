import { useCallback, useEffect, useMemo, useState } from "react";
import type { LocalizationSettings } from "@/types/system-settings";
import { DEFAULT_LOCALIZATION } from "./systemSettingsDefaults";
import type { SystemSettingsHook } from "./useSystemSettings";

export function useLocalizationSettings(source: SystemSettingsHook) {
  const { settings, updateSettings, loading, error, canEdit } = source;
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
      await updateSettings({ localization: state });
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
