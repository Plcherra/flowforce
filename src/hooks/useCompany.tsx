import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Tables } from "@/integrations/supabase/public-types";
import { appEnv } from "@/lib/env";
import {
  CompanyRole,
  Position,
  CompanyConfig,
  CompanySettings,
} from "@/types/common";
import { handleError } from "@/utils/errorHandler";
import { logger } from "@/utils/logger";

type CompanyRow = Tables<"companies">;

export const DEMO_COMPANY: Company = {
  id: "demo-company",
  name: "Blank Template",
  industry: "Technology",
  size: "1-10",
  description: "Demo workspace used when backend company linking fails.",
  website: "https://connectflow-demo.local",
  phone: "555-0000",
  logo_url: undefined,
  primary_color: "#3b82f6",
  secondary_color: "#1e40af",
  currency: "USD",
  template_id: null,
  template_name: null,
  enabled_sections: [],
  custom_roles: [],
  positions: [],
  template_config: {
    enabled_sections: [],
  },
  timezone: "UTC",
  working_hours: {
    start: "09:00",
    end: "17:00",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  } as unknown as CompanySettings["working_hours"],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: "",
};

const isPolicyRecursionError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: string })?.message?.toLowerCase() ?? "";
  const errorString = String(error).toLowerCase();
  return (
    message.includes("infinite recursion detected in policy") ||
    errorString.includes("infinite recursion detected in policy") ||
    (message.includes("recursion") && message.includes("policy"))
  );
};

export const getDemoCompany = (ownerId?: string): Company => {
  const now = new Date().toISOString();
  return {
    ...DEMO_COMPANY,
    enabled_sections: [...DEMO_COMPANY.enabled_sections],
    custom_roles: DEMO_COMPANY.custom_roles.map((role) => ({
      ...role,
      permissions: { ...(role.permissions || {}) },
    })),
    positions: DEMO_COMPANY.positions.map((position) => ({
      ...position,
      permissions: { ...(position.permissions || {}) },
    })),
    template_config: { ...DEMO_COMPANY.template_config },
    working_hours: { ...DEMO_COMPANY.working_hours },
    created_at: now,
    updated_at: now,
    created_by: ownerId ?? DEMO_COMPANY.created_by,
  };
};

const parseJSONValue = <T,>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  if (typeof value === "object") {
    return value as T;
  }

  return fallback;
};

const readMetadataCompanyId = (
  user: { user_metadata?: Record<string, unknown> } | null,
) => {
  const metadata = user?.user_metadata;
  return typeof metadata?.active_company_id === "string"
    ? metadata.active_company_id
    : typeof metadata?.company_id === "string"
      ? metadata.company_id
      : null;
};

export interface Company {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  description?: string;
  website?: string;
  phone?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  currency: string;
  template_id?: string;
  template_name?: string;
  enabled_sections: string[];
  custom_roles: CompanyRole[];
  positions: Position[];
  template_config: CompanyConfig;
  timezone: string;
  working_hours: CompanySettings["working_hours"];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useCompany() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (user) {
      fetchCompany();
    } else {
      setCompany(null);
      setError(null);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable hook deps
  }, [user]);

  const parseCompanyData = (data: CompanyRow): Company => {
    const enabledSections = parseJSONValue<string[]>(data.enabled_sections, []);
    const customRoles = parseJSONValue<CompanyRole[]>(data.custom_roles, []);
    const positions = parseJSONValue<Position[]>(data.positions, []);
    const templateConfig = parseJSONValue<CompanyConfig>(
      data.template_config,
      DEMO_COMPANY.template_config,
    );
    const workingHours = parseJSONValue<CompanySettings["working_hours"]>(
      data.working_hours,
      DEMO_COMPANY.working_hours,
    );

    return {
      ...data,
      enabled_sections: enabledSections,
      custom_roles: customRoles,
      positions,
      template_config: templateConfig,
      working_hours: workingHours,
    };
  };

  const fetchCompany = async () => {
    if (!user) {
      setCompany(null);
      setError(null);
      setLoading(false);
      return;
    }

    const handleDemoFallback = (reason: string) => {
      const nextError = new Error(reason);
      logger.warn(
        appEnv.DEV
          ? "[useCompany] Falling back to demo company"
          : "[useCompany] Company context unavailable",
        {
          context: { reason },
          tags: ["warning"],
        },
      );

      if (appEnv.DEV) {
        setCompany(getDemoCompany(user?.id));
      } else {
        setCompany(null);
      }

      setError(nextError);
      setLoading(false);
    };

    try {
      setError(null);
      // First get the user's profile to find their company_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id, is_company_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw handleError(profileError, "fetching user profile");
      }

      const companyId = profile?.company_id ?? readMetadataCompanyId(user);

      if (companyId) {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .maybeSingle();

        if (companyError) {
          // Check for recursion error before throwing
          if (isPolicyRecursionError(companyError)) {
            handleDemoFallback("RLS recursion when loading company");
            return;
          }
          throw handleError(companyError, "fetching company data");
        }

        if (companyData) {
          setCompany(parseCompanyData(companyData));
          setError(null);
        } else {
          handleDemoFallback("company row not found");
          return;
        }
      } else {
        handleDemoFallback("profile missing company_id");
        return;
      }
    } catch (error) {
      if (isPolicyRecursionError(error)) {
        handleDemoFallback("RLS recursion when loading company");
        return;
      }
      const handledError = handleError(error, "fetchCompany");
      logger.warn("[useCompany] Failed to load company context", {
        error: handledError,
        tags: ["warning"],
      });
      handleDemoFallback(
        "encountered an unexpected error while loading company",
      );
      return;
    }

    setLoading(false);
  };

  const createCompany = async (companyData: {
    name: string;
    industry?: string;
    size?: string;
    description?: string;
    website?: string;
    phone?: string;
    primary_color?: string;
    secondary_color?: string;
    template_id?: string;
    template_name?: string;
    enabled_sections?: string[];
    custom_roles?: CompanyRole[];
    positions?: Position[];
    template_config?: CompanyConfig;
  }) => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Ensure we have valid arrays for roles and positions
      const validatedRoles = Array.isArray(companyData.custom_roles)
        ? companyData.custom_roles
        : [];
      const validatedPositions = Array.isArray(companyData.positions)
        ? companyData.positions
        : [];

      // Make sure roles have proper structure for the database function
      const formattedRoles = validatedRoles.map((role) => ({
        id: role.id || `role-${Date.now()}-${Math.random()}`,
        name: role.name,
        description: role.description || "",
        color: role.color || "#3b82f6",
        icon: role.icon || "Users",
        hierarchy_level: role.hierarchy_level || 1,
        permissions: role.permissions || {},
        is_system_role: role.is_system_role || false,
      }));

      // Format positions to match expected structure
      const formattedPositions = validatedPositions.map((position) => ({
        id: position.id || `pos-${Date.now()}-${Math.random()}`,
        name: position.name,
        description: position.description || "",
        roleId: position.roleId,
        permissions: position.permissions || {},
      }));

      // Use the improved database function to create company with setup
      const { data, error } = await supabase.rpc("create_company_with_setup", {
        company_data: {
          name: companyData.name,
          industry: companyData.industry,
          size: companyData.size,
          description: companyData.description,
          website: companyData.website,
          phone: companyData.phone,
          primary_color: companyData.primary_color || "#3b82f6",
          secondary_color: companyData.secondary_color || "#1e40af",
          template_id: companyData.template_id,
          template_name: companyData.template_name,
          enabled_sections: companyData.enabled_sections || [],
          template_config: JSON.stringify(companyData.template_config || {}),
        },
        custom_roles: formattedRoles,
        positions_data: formattedPositions,
        owner_user_id: user.id,
      });

      if (error) {
        throw handleError(error, "creating company with setup");
      }

      // Fetch the created company to return it
      const { data: createdCompany, error: fetchError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", data)
        .single();

      if (fetchError) {
        throw handleError(fetchError, "fetching created company");
      }

      const parsedCompany = parseCompanyData(createdCompany);
      setCompany(parsedCompany);
      setError(null);

      // Refresh the company data to ensure everything is properly loaded
      await fetchCompany();

      return parsedCompany;
    } catch (error) {
      throw handleError(error, "creating company");
    }
  };

  const updateCompany = async (updates: Partial<Company>) => {
    if (!company) throw new Error("No company to update");

    try {
      const { data, error } = await supabase
        .from("companies")
        .update({
          ...updates,
          enabled_sections: updates.enabled_sections
            ? JSON.stringify(updates.enabled_sections)
            : undefined,
          custom_roles: updates.custom_roles
            ? JSON.stringify(updates.custom_roles)
            : undefined,
          positions: updates.positions
            ? JSON.stringify(updates.positions)
            : undefined,
          template_config: updates.template_config
            ? JSON.stringify(updates.template_config)
            : undefined,
        })
        .eq("id", company.id)
        .select()
        .single();

      if (error) throw error;
      const parsedCompany = parseCompanyData(data);
      setCompany(parsedCompany);
      setError(null);
      return parsedCompany;
    } catch (error) {
      throw handleError(error, "updating company");
    }
  };

  return {
    company,
    loading,
    error,
    createCompany,
    updateCompany,
    refetchCompany: fetchCompany,
  };
}
