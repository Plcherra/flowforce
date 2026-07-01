import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany, type Company } from "@/hooks/useCompany";
import type { Tables } from "@/integrations/supabase/public-types";
import type { SystemSettings as SystemSettingsModel } from "@/types/system-settings";
import { AUDIT_ACTIONS } from "@/services/audit/auditEvents";
import { logAuditEvent } from "@/services/audit/auditService";
import { handleError } from "@/utils/errorHandler";
import {
  DEFAULT_ADMIN_CONFIG,
  DEFAULT_APPEARANCE,
  DEFAULT_GENERAL,
  DEFAULT_INTEGRATIONS,
  DEFAULT_LOCALIZATION,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SECURITY,
  seedSystemSettings,
} from "./systemSettingsDefaults";
import {
  normalizeSystemSettingsRow,
  type SystemSettingsRow,
} from "./systemSettingsNormalizer";

type ProfileRow = Tables<"profiles">;

type PartialUpdate = Record<string, unknown>;

const allowedManagerRoles = ["admin", "owner", "company_admin", "manager"];
const auditKeyMap: Record<string, keyof SystemSettingsModel> = {
  general: "general",
  security: "security",
  localization: "localization",
  notifications: "notifications",
  integrations: "integrations",
  appearance: "appearance",
  admin_config: "adminConfig",
};

const pickAuditValues = (
  current: SystemSettingsModel | null,
  changes: PartialUpdate,
) => {
  if (!current) return null;

  return Object.keys(changes).reduce<Record<string, unknown>>((acc, key) => {
    const modelKey = auditKeyMap[key];
    if (modelKey) {
      acc[key] = current[modelKey];
    }
    return acc;
  }, {});
};

const filterAuditChanges = (changes: PartialUpdate) =>
  Object.entries(changes).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      if (key !== "updated_at") {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );

const ensureDefaults = (
  company: Company,
  companyId: string,
): SystemSettingsRow => {
  const seeded = seedSystemSettings(company);
  return {
    id: `virtual-${companyId}`,
    company_id: companyId,
    ...seeded,
    admin_config: {
      ...seeded.admin_config,
      businessStructure: {
        ...seeded.admin_config.businessStructure,
        workingHours:
          company.working_hours ??
          seeded.admin_config.businessStructure.workingHours,
      },
    },
    created_at: company.created_at ?? new Date().toISOString(),
    updated_at: company.updated_at ?? new Date().toISOString(),
  } as SystemSettingsRow;
};

export interface SystemSettingsHook {
  company: Company | null;
  settings: SystemSettingsModel | null;
  loading: boolean;
  error: Error | null;
  canEdit: boolean;
  role: ProfileRow["role"] | null;
  isCompanyAdmin: boolean;
  missingCompany: boolean;
  linkingCompany: boolean;
  linkCompanyError: Error | null;
  linkCompany: () => Promise<void>;
  refresh: () => Promise<void>;
  updateSettings: (
    changes: PartialUpdate,
  ) => Promise<SystemSettingsModel | null>;
}

export function useSystemSettings(
  providedCompanyId?: string,
): SystemSettingsHook {
  const { user } = useAuth();
  const { company, loading: companyLoading, refetchCompany } = useCompany();

  const companyId = providedCompanyId ?? company?.id ?? null;

  const [settings, setSettings] = useState<SystemSettingsModel | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [role, setRole] = useState<ProfileRow["role"] | null>(null);
  const [isCompanyAdmin, setIsCompanyAdmin] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [missingCompany, setMissingCompany] = useState(false);
  const [linkingCompany, setLinkingCompany] = useState(false);
  const [linkCompanyError, setLinkCompanyError] = useState<Error | null>(null);

  const canEdit = useMemo(
    () => (role ? allowedManagerRoles.includes(role) : false) || isCompanyAdmin,
    [role, isCompanyAdmin],
  );

  useEffect(() => {
    if (!user) {
      setRole(null);
      setIsCompanyAdmin(false);
      setPermissionsReady(true);
      return;
    }

    let active = true;
    (async () => {
      try {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("role, is_company_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!active) return;

        setRole(data?.role ?? null);
        setIsCompanyAdmin(Boolean(data?.is_company_admin));
      } catch (err) {
        if (!active) return;
        const handled = handleError(err, "loadSystemSettingsPermissions");
        setError(new Error(handled.message));
        setRole(null);
        setIsCompanyAdmin(false);
      } finally {
        if (active) {
          setPermissionsReady(true);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!companyId) {
      setMissingCompany(true);
      setSettings(null);
      setError(null);
      setFetching(false);
      return;
    }

    setMissingCompany(false);
    setFetching(true);
    try {
      const { data: row, error: _fetchError } = await supabase
        .from("system_settings" as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      let workingRow = row ?? null;

      if (!workingRow && canEdit) {
        const { data: inserted, error: insertError } = await supabase
          .from("system_settings" as any)
          .insert({ company_id: companyId })
          .select()
          .single();

        if (insertError) throw insertError;
        workingRow = inserted;
      }

      if (!workingRow && company) {
        workingRow = ensureDefaults(company, companyId);
      }

      if (workingRow) {
        setSettings(
          normalizeSystemSettingsRow(workingRow as never, company ?? null),
        );
        setError(null);
      } else {
        setSettings(null);
        setError(new Error("Unable to resolve system settings"));
      }
    } catch (err) {
      const handled = handleError(err, "fetchSystemSettings");
      setError(new Error(handled.message));
      setSettings(null);
    } finally {
      setFetching(false);
    }
  }, [companyId, canEdit, company]);

  useEffect(() => {
    if (!permissionsReady || (companyLoading && !companyId)) {
      return;
    }
    void fetchSettings();
  }, [permissionsReady, companyId, fetchSettings, companyLoading]);

  const updateSettings = useCallback(
    async (changes: PartialUpdate) => {
      if (!companyId) {
        throw new Error("Company context is required to update settings");
      }

      const payload: PartialUpdate = {
        ...changes,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from("system_settings" as any)
        .update(payload)
        .eq("company_id", companyId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      const auditChanges = filterAuditChanges(changes);
      await logAuditEvent({
        action: AUDIT_ACTIONS.settingsUpdated,
        tableName: "system_settings",
        recordId: companyId,
        oldValues: pickAuditValues(settings, auditChanges),
        newValues: auditChanges,
      });

      const normalized = normalizeSystemSettingsRow(
        data as SystemSettingsRow,
        null,
      );

      setSettings(normalized);
      return normalized;
    },
    [companyId, settings],
  );

  const refresh = useCallback(async () => {
    await Promise.all([refetchCompany(), fetchSettings()]);
  }, [fetchSettings, refetchCompany]);

  const linkCompany = useCallback(async () => {
    if (!user) {
      throw new Error("Authentication required");
    }

    setLinkingCompany(true);
    setLinkCompanyError(null);
    try {
      let targetCompanyId: string | null = null;

      const { data: existing, error: existingError } = await supabase
        .from("companies")
        .select("id")
        .eq("created_by", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing?.id) {
        targetCompanyId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase.rpc(
          "create_company_with_setup",
          {
            company_data: {
              name: "Demo Workspace",
              industry: null,
              size: null,
              description: "Automatically generated workspace",
              website: null,
              phone: null,
              primary_color: "#3b82f6",
              secondary_color: "#1e40af",
              template_id: null,
              template_name: null,
              enabled_sections: [],
              template_config: JSON.stringify({}),
            },
            custom_roles: [],
            positions_data: [],
            owner_user_id: user.id,
          },
        );

        if (createError) {
          throw createError;
        }

        targetCompanyId =
          typeof created === "string"
            ? created
            : ((created as { id?: string } | null)?.id ?? null);
      }

      if (!targetCompanyId) {
        throw new Error("Unable to determine company to link");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ company_id: targetCompanyId })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setMissingCompany(false);
      await Promise.all([refetchCompany(), fetchSettings()]);
    } catch (err) {
      const handled = handleError(err, "linkCompany");
      setLinkCompanyError(new Error(handled.message));
      throw err;
    } finally {
      setLinkingCompany(false);
    }
  }, [user, fetchSettings, refetchCompany]);

  const loading = companyLoading || fetching || !permissionsReady;

  return {
    company: company ?? null,
    settings,
    loading,
    error,
    canEdit,
    role,
    isCompanyAdmin,
    missingCompany,
    linkingCompany,
    linkCompanyError,
    linkCompany,
    refresh,
    updateSettings,
  };
}
