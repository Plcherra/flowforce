import type { Tables } from '@/integrations/supabase/public-types';
import type { Company } from '@/hooks/useCompany';
import type { SystemSettings as SystemSettingsModel } from '@/types/system-settings';
import { DEFAULT_APPEARANCE } from './systemSettingsDefaults';
import { normalizeAdminConfig } from './normalizers/admin';
import { normalizeGeneral } from './normalizers/general';
import { normalizeIntegrations } from './normalizers/integrations';
import { normalizeLocalization } from './normalizers/localization';
import { normalizeNotifications } from './normalizers/notifications';
import { normalizeSecurity } from './normalizers/security';

export type SystemSettingsRow = Tables<'system_settings'>;

export const normalizeSystemSettingsRow = (
  row: SystemSettingsRow,
  company: Company | null,
): SystemSettingsModel => ({
  id: row.id,
  companyId: row.company_id,
  general: normalizeGeneral(row.general, company),
  security: normalizeSecurity(row.security),
  localization: normalizeLocalization(row.localization, company),
  notifications: normalizeNotifications(row.notifications),
  integrations: normalizeIntegrations(row.integrations),
  appearance: {
    ...DEFAULT_APPEARANCE,
    ...(row.appearance as SystemSettingsModel['appearance']),
  },
  adminConfig: normalizeAdminConfig(row.admin_config, company),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
