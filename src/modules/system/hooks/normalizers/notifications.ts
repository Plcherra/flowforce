import type {
  ModuleNotificationOverride,
  NotificationsSettings,
} from '@/types/system-settings';
import {
  DEFAULT_MODULE_OVERRIDE,
  DEFAULT_NOTIFICATIONS,
} from '../systemSettingsDefaults';
import { asBoolean, asNumber, asStringArray, isRecord } from './helpers';

const normalizeModuleOverrides = (value: unknown): Record<string, ModuleNotificationOverride> => {
  if (!isRecord(value)) return {};

  return Object.entries(value).reduce((acc, [moduleKey, moduleValue]) => {
    const overrideSource = isRecord(moduleValue) ? moduleValue : {};
    acc[moduleKey] = {
      email: asBoolean(overrideSource.email, DEFAULT_MODULE_OVERRIDE.email),
      in_app: asBoolean(overrideSource.in_app, DEFAULT_MODULE_OVERRIDE.in_app),
      sms: asBoolean(overrideSource.sms, DEFAULT_MODULE_OVERRIDE.sms),
      push: asBoolean(overrideSource.push, DEFAULT_MODULE_OVERRIDE.push),
    };
    return acc;
  }, {} as Record<string, ModuleNotificationOverride>);
};

export const normalizeNotifications = (value: unknown): NotificationsSettings => {
  const source = isRecord(value) ? value : {};
  const escalationsSource = isRecord(source.escalations) ? source.escalations : {};

  return {
    deliveryChannels: asStringArray(source.deliveryChannels).length
      ? asStringArray(source.deliveryChannels)
      : DEFAULT_NOTIFICATIONS.deliveryChannels,
    digestEnabled: asBoolean(source.digestEnabled, DEFAULT_NOTIFICATIONS.digestEnabled),
    digestHour: asNumber(source.digestHour, DEFAULT_NOTIFICATIONS.digestHour),
    moduleOverrides: normalizeModuleOverrides(source.moduleOverrides),
    escalations: {
      criticalModules: asStringArray(escalationsSource.criticalModules),
      reminderWindowMinutes: asNumber(
        escalationsSource.reminderWindowMinutes,
        DEFAULT_NOTIFICATIONS.escalations.reminderWindowMinutes,
      ),
    },
  };
};
