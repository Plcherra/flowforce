import type { SecuritySettings } from '@/types/system-settings';
import { DEFAULT_SECURITY } from '../systemSettingsDefaults';
import { asBoolean, asNumber, isRecord } from './helpers';

export const normalizeSecurity = (value: unknown): SecuritySettings => {
  const source = isRecord(value) ? value : {};
  const policySource = isRecord(source.passwordPolicy) ? source.passwordPolicy : {};

  return {
    twoFactorRequired: asBoolean(source.twoFactorRequired, DEFAULT_SECURITY.twoFactorRequired),
    enforceForAdmins: asBoolean(source.enforceForAdmins, DEFAULT_SECURITY.enforceForAdmins),
    sessionTimeout: asNumber(source.sessionTimeout, DEFAULT_SECURITY.sessionTimeout),
    trustedDeviceWindow: asNumber(
      source.trustedDeviceWindow,
      DEFAULT_SECURITY.trustedDeviceWindow,
    ),
    passwordPolicy: {
      minLength: asNumber(policySource.minLength, DEFAULT_SECURITY.passwordPolicy.minLength),
      requireUppercase: asBoolean(
        policySource.requireUppercase,
        DEFAULT_SECURITY.passwordPolicy.requireUppercase,
      ),
      requireLowercase: asBoolean(
        policySource.requireLowercase,
        DEFAULT_SECURITY.passwordPolicy.requireLowercase,
      ),
      requireNumber: asBoolean(
        policySource.requireNumber,
        DEFAULT_SECURITY.passwordPolicy.requireNumber,
      ),
      requireSpecial: asBoolean(
        policySource.requireSpecial,
        DEFAULT_SECURITY.passwordPolicy.requireSpecial,
      ),
    },
  };
};
