import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ModuleNotificationOverride,
  NotificationsSettings,
} from "@/types/system-settings";
import { DEFAULT_NOTIFICATIONS } from "./systemSettingsDefaults";
import type { SystemSettingsHook } from "./useSystemSettings";

type ChannelKey = NotificationsSettings["deliveryChannels"][number];

export function useSystemNotifications(source: SystemSettingsHook) {
  const { settings, updateSettings, loading, error, canEdit } = source;
  const base = settings?.notifications ?? DEFAULT_NOTIFICATIONS;

  const [channels, setChannels] = useState<ChannelKey[]>(base.deliveryChannels);
  const [digestEnabled, setDigestEnabled] = useState(base.digestEnabled);
  const [digestHour, setDigestHour] = useState(base.digestHour.toString());
  const [reminderWindow, setReminderWindow] = useState(
    base.escalations.reminderWindowMinutes.toString(),
  );
  const [moduleOverrides, setModuleOverrides] = useState<
    Record<string, ModuleNotificationOverride>
  >(base.moduleOverrides);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  useEffect(() => {
    setChannels(base.deliveryChannels);
    setDigestEnabled(base.digestEnabled);
    setDigestHour(base.digestHour.toString());
    setReminderWindow(base.escalations.reminderWindowMinutes.toString());
    setModuleOverrides(base.moduleOverrides);
  }, [base]);

  const toggleChannel = useCallback((channel: ChannelKey) => {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((item) => item !== channel)
        : [...prev, channel],
    );
  }, []);

  const toggleModuleChannel = useCallback(
    (
      moduleKey: string,
      channelKey: keyof ModuleNotificationOverride,
      value: boolean,
    ) => {
      setModuleOverrides((prev) => {
        const existing = prev[moduleKey] ?? {
          email: true,
          in_app: true,
          sms: false,
          push: false,
        };
        return {
          ...prev,
          [moduleKey]: {
            ...existing,
            [channelKey]: value,
          },
        };
      });
    },
    [],
  );

  const dirty = useMemo(() => {
    const sortedChannels = [...channels].sort();
    const sortedBase = [...base.deliveryChannels].sort();
    return (
      JSON.stringify(sortedChannels) !== JSON.stringify(sortedBase) ||
      digestEnabled !== base.digestEnabled ||
      digestHour !== base.digestHour.toString() ||
      reminderWindow !== base.escalations.reminderWindowMinutes.toString() ||
      JSON.stringify(moduleOverrides) !== JSON.stringify(base.moduleOverrides)
    );
  }, [
    channels,
    base,
    digestEnabled,
    digestHour,
    moduleOverrides,
    reminderWindow,
  ]);

  const save = useCallback(async () => {
    if (!dirty) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: NotificationsSettings = {
        deliveryChannels: [...channels],
        digestEnabled,
        digestHour: Number(digestHour) || base.digestHour,
        moduleOverrides,
        escalations: {
          criticalModules: base.escalations.criticalModules,
          reminderWindowMinutes:
            Number(reminderWindow) || base.escalations.reminderWindowMinutes,
        },
      };

      await updateSettings({ notifications: payload });
    } catch (err) {
      setSaveError(err as Error);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [
    dirty,
    channels,
    digestEnabled,
    digestHour,
    moduleOverrides,
    reminderWindow,
    base,
    updateSettings,
  ]);

  const reset = useCallback(() => {
    setChannels(base.deliveryChannels);
    setDigestEnabled(base.digestEnabled);
    setDigestHour(base.digestHour.toString());
    setReminderWindow(base.escalations.reminderWindowMinutes.toString());
    setModuleOverrides(base.moduleOverrides);
    setSaveError(null);
  }, [base]);

  return {
    loading,
    globalError: error,
    canEdit,
    channels,
    digestEnabled,
    digestHour,
    reminderWindow,
    moduleOverrides,
    setDigestHour,
    setReminderWindow,
    setDigestEnabled,
    toggleChannel,
    toggleModuleChannel,
    setModuleOverrides,
    saving,
    saveError,
    save,
    reset,
    dirty,
  };
}
