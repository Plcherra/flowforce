import { useCallback, useEffect, useMemo, useState } from "react";
import type { AICopilotSettings } from "@/types/system-settings";
import type { SystemSettingsHook } from "./useSystemSettings";

export function useAICopilotSettings(source: SystemSettingsHook) {
  const { settings, updateSettings, loading, error, canEdit } = source;
  const base = useMemo(
    () =>
      settings?.adminConfig.aiCopilot ?? {
        enabled: false,
        scopes: [],
        restrictedModules: [],
        automationLevel: "suggestion" as AICopilotSettings["automationLevel"],
        lastAuditAt: null,
      },
    [settings?.adminConfig.aiCopilot],
  );

  const [state, setState] = useState<AICopilotSettings>(base);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  useEffect(() => {
    setState(base);
  }, [base]);

  const toggleScope = useCallback((scope: string) => {
    setState((prev) => {
      const set = new Set(prev.scopes);
      if (set.has(scope)) {
        set.delete(scope);
      } else {
        set.add(scope);
      }
      return { ...prev, scopes: Array.from(set) };
    });
  }, []);

  const toggleRestriction = useCallback((scope: string) => {
    setState((prev) => {
      const set = new Set(prev.restrictedModules);
      if (set.has(scope)) {
        set.delete(scope);
      } else {
        set.add(scope);
      }
      return { ...prev, restrictedModules: Array.from(set) };
    });
  }, []);

  const updateAutomationLevel = useCallback(
    (level: AICopilotSettings["automationLevel"]) => {
      setState((prev) => ({ ...prev, automationLevel: level }));
    },
    [],
  );

  const updateEnabled = useCallback((next: boolean) => {
    setState((prev) => ({ ...prev, enabled: next }));
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(base),
    [state, base],
  );

  const save = useCallback(async () => {
    if (!settings || !dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettings({
        admin_config: {
          ...settings.adminConfig,
          aiCopilot: {
            ...state,
            scopes: [...state.scopes],
            restrictedModules: [...state.restrictedModules],
          },
        },
      });
    } catch (err) {
      setSaveError(err as Error);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [settings, state, dirty, updateSettings]);

  const reset = useCallback(() => {
    setState(base);
    setSaveError(null);
  }, [base]);

  return {
    loading,
    globalError: error,
    canEdit,
    state,
    setState,
    toggleScope,
    toggleRestriction,
    updateAutomationLevel,
    updateEnabled,
    dirty,
    saving,
    saveError,
    save,
    reset,
  };
}
