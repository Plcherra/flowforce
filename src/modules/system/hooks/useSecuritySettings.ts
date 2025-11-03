import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SecuritySettings } from '@/types/system-settings';
import { DEFAULT_SECURITY } from './systemSettingsDefaults';
import type { SystemSettingsHook } from './useSystemSettings';

export function useSecuritySettings(source: SystemSettingsHook) {
  const { settings, updateSettings, loading, error, canEdit } = source;
  const base = settings?.security ?? DEFAULT_SECURITY;

  const [state, setState] = useState<SecuritySettings>(base);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  useEffect(() => {
    setState(base);
  }, [base]);

  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(base), [state, base]);

  const save = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettings({ security: state });
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

  const updatePasswordPolicy = useCallback(
    (key: keyof SecuritySettings['passwordPolicy'], value: boolean | number) => {
      setState((prev) => ({
        ...prev,
        passwordPolicy: {
          ...prev.passwordPolicy,
          [key]: value,
        },
      }));
    },
    [],
  );

  const updateTokenAccess = useCallback(
    (key: keyof SecuritySettings['apiTokenAccess'], value: boolean | number | string | null) => {
      setState((prev) => ({
        ...prev,
        apiTokenAccess: {
          ...prev.apiTokenAccess,
          [key]: value,
        },
      }));
    },
    [],
  );

  const updateRowLevelSecurity = useCallback(
    (
      key: keyof SecuritySettings['rowLevelSecurity'],
      value: boolean,
    ) => {
      setState((prev) => ({
        ...prev,
        rowLevelSecurity: {
          ...prev.rowLevelSecurity,
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
    dirty,
    saving,
    saveError,
    save,
    reset,
    updatePasswordPolicy,
    updateTokenAccess,
    updateRowLevelSecurity,
  };
}
