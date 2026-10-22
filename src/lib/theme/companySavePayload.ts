type JsonRecord = Record<string, unknown>;

const COMPANY_COLOR_KEYS = new Set([
  "primary_color",
  "secondary_color",
  "primaryColor",
  "secondaryColor",
]);

const DROPPED_APPEARANCE_KEYS = new Set([
  ...COMPANY_COLOR_KEYS,
  "theme",
  "accentColor",
  "logoBackgroundColor",
  "logoPlacement",
  "sidebarBranding",
  "dashboardLayout",
  "preview",
]);

export function buildGeneralCompanyUpdate(input: {
  name: string;
  description: string | null;
  website: string | null;
  phone: string | null;
  logoUrl: string | null;
}) {
  return {
    name: input.name,
    description: input.description,
    website: input.website,
    phone: input.phone,
    logo_url: input.logoUrl,
  };
}

export function buildGeneralAppearanceSave(
  appearance: object | null | undefined,
) {
  const next: JsonRecord = {};
  for (const [key, child] of Object.entries({ ...(appearance ?? {}) })) {
    if (DROPPED_APPEARANCE_KEYS.has(key)) continue;
    next[key] = child;
  }
  return next;
}

export function buildOnboardingCompanyPayload(input: {
  name: string;
  website: string | null;
  phone: string | null;
  industry: string | null;
  size: string | null;
  description: string | null;
  templateName: string;
  templateId: string;
  templateIndustry: string;
  defaultRoles: unknown;
  customFields: JsonRecord;
  suggestedPositions: JsonRecord;
  enabledSections: unknown[];
  customRoles: unknown;
  positions: unknown;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  ownerPhone: string | null;
}) {
  return {
    name: input.name,
    website: input.website,
    phone: input.phone,
    industry: input.industry,
    size: input.size,
    description: input.description,
    logo_url: null,
    template_id: null,
    template_name: input.templateName || null,
    enabled_sections: input.enabledSections,
    template_config: {
      templateId: input.templateId,
      templateName: input.templateName,
      industry: input.templateIndustry,
      defaultRoles: input.defaultRoles,
      customFields: input.customFields,
      suggestedPositions: input.suggestedPositions,
    },
    custom_roles: input.customRoles,
    positions: input.positions,
    registration_complete: true,
    created_by: input.userId,
    owner_id: input.userId,
    owner_profile: {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: input.ownerPhone,
    },
  };
}

export function buildCreateCompanyData(input: {
  name: string;
  industry?: string | null;
  size?: string | null;
  description?: string | null;
  website?: string | null;
  phone?: string | null;
  templateId?: string | null;
  templateName?: string | null;
  enabledSections?: string[];
  templateConfig?: unknown;
}) {
  return {
    name: input.name,
    industry: input.industry,
    size: input.size,
    description: input.description,
    website: input.website,
    phone: input.phone,
    template_id: input.templateId,
    template_name: input.templateName,
    enabled_sections: input.enabledSections ?? [],
    template_config: input.templateConfig,
  };
}
