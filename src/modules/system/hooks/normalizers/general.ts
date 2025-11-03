import type { Company } from '@/hooks/useCompany';
import type { GeneralSettings } from '@/types/system-settings';
import { DEFAULT_GENERAL } from '../systemSettingsDefaults';
import { asString, isRecord } from './helpers';

export const normalizeGeneral = (value: unknown, company: Company | null): GeneralSettings => {
  const source = isRecord(value) ? value : {};
  const general: GeneralSettings = {
    companyName: asString(source.companyName) ?? DEFAULT_GENERAL.companyName,
    contactEmail: asString(source.contactEmail),
    contactPhone: asString(source.contactPhone),
    website: asString(source.website),
    companyDescription: asString(source.companyDescription),
    address: asString(source.address),
    logoUrl: asString(source.logoUrl),
  };

  if (company) {
    general.companyName = company.name ?? general.companyName;
    general.companyDescription = company.description ?? general.companyDescription;
    general.website = company.website ?? general.website;
    general.contactPhone = company.phone ?? general.contactPhone;
    general.logoUrl = company.logo_url ?? general.logoUrl;
  }

  return general;
};
