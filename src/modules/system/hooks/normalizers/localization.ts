import type { Company } from "@/hooks/useCompany";
import type { LocalizationSettings } from "@/types/system-settings";
import { DEFAULT_LOCALIZATION } from "../systemSettingsDefaults";
import { asString, isRecord } from "./helpers";

export const normalizeLocalization = (
  value: unknown,
  company: Company | null,
): LocalizationSettings => {
  const source = isRecord(value) ? value : {};
  const regionalSource = isRecord(source.regionalFormats)
    ? source.regionalFormats
    : {};
  const localization: LocalizationSettings = {
    timezone: asString(source.timezone) ?? DEFAULT_LOCALIZATION.timezone,
    language: asString(source.language) ?? DEFAULT_LOCALIZATION.language,
    currency: asString(source.currency) ?? DEFAULT_LOCALIZATION.currency,
    regionalFormats: {
      date:
        asString(regionalSource.date) ??
        DEFAULT_LOCALIZATION.regionalFormats.date,
      time:
        asString(regionalSource.time) ??
        DEFAULT_LOCALIZATION.regionalFormats.time,
      number:
        asString(regionalSource.number) ??
        DEFAULT_LOCALIZATION.regionalFormats.number,
    },
  };

  if (company) {
    localization.timezone = company.timezone ?? localization.timezone;
    if (company.currency) {
      localization.currency = company.currency;
    }
  }

  return localization;
};
