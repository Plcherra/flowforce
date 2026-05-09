import { useState } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  UserInfo,
  CompanyInfo,
  Branding,
  OnboardingRole,
} from "@/types/onboarding";
import { BusinessTemplate, OnboardingPosition } from "@/types/templates";
import { logger } from "@/utils/logger";

interface RegistrationData {
  userInfo: UserInfo;
  companyInfo: CompanyInfo;
  branding: Branding;
  template: BusinessTemplate;
  enabledSections: string[];
  customRoles: OnboardingRole[];
  positions: OnboardingPosition[];
}

interface RegistrationError {
  type: "auth" | "validation" | "database" | "network";
  message: string;
  details?: string;
}

type JsonRecord = Record<string, unknown>;

const OWNER_ROLE = "owner";
const NO_ROW_ERROR_CODES = new Set(["PGRST116"]);

const normalizeText = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeWebsite = (value: string | null | undefined) => {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const createCompanySlug = (companyName: string) => {
  const slug = companyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `company-${Date.now().toString(36)}`;
};

const isColumnShapeError = (error: unknown) => {
  const candidate = error as { code?: string; message?: string } | null;
  const message = candidate?.message?.toLowerCase() ?? "";
  return (
    candidate?.code === "42703" ||
    candidate?.code === "PGRST204" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
};

const getCompanySelectId = (row: unknown) => {
  if (row && typeof row === "object" && "id" in row) {
    const id = (row as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
};

const getRejectedColumn = (error: unknown) => {
  const message =
    (error as { message?: string } | null)?.message?.toLowerCase() ?? "";
  const patterns = [
    /'([^']+)' column/,
    /column "([^"]+)"/,
    /column ([a-z0-9_]+) /,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};

const withoutKey = <T extends JsonRecord>(payload: T, key: string) => {
  const next = { ...payload };
  delete next[key];
  return next;
};

const writeWithColumnFallback = async <T extends JsonRecord>(
  payload: T,
  write: (nextPayload: T) => Promise<{ data: unknown; error: unknown }>,
) => {
  let nextPayload = { ...payload } as T;
  let lastError: unknown = null;

  while (Object.keys(nextPayload).length > 0) {
    const result = await write(nextPayload);

    if (!result.error) {
      return result.data;
    }

    lastError = result.error;
    const rejectedColumn = getRejectedColumn(result.error);

    if (!isColumnShapeError(result.error) || !rejectedColumn) {
      throw result.error;
    }

    if (!(rejectedColumn in nextPayload)) {
      throw result.error;
    }

    nextPayload = withoutKey(nextPayload, rejectedColumn) as T;
  }

  throw lastError;
};

export function useCompanyRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RegistrationError | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const transformRolesForDatabase = (roles: OnboardingRole[]) => {
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description || "",
      color: role.color,
      icon: role.icon,
      hierarchy_level: role.hierarchy_level,
      permissions: role.permissions || {},
      is_system_role: role.is_system_role || false,
    }));
  };

  const transformPositionsForDatabase = (positions: OnboardingPosition[]) => {
    return positions.map((position) => ({
      id: position.id,
      name: position.name,
      description: position.description || "",
      roleId: position.roleId,
      permissions: position.permissions || {},
    }));
  };

  const validateRegistrationData = (
    data: RegistrationData,
  ): RegistrationError | null => {
    // Validate user info
    if (
      !data.userInfo.email ||
      !data.userInfo.password ||
      !data.userInfo.firstName ||
      !data.userInfo.lastName
    ) {
      return {
        type: "validation",
        message: "Please fill in all required user information fields.",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.userInfo.email)) {
      return {
        type: "validation",
        message: "Please enter a valid email address.",
      };
    }

    // Validate password strength
    if (data.userInfo.password.length < 8) {
      return {
        type: "validation",
        message: "Password must be at least 8 characters long.",
      };
    }

    // Validate company info
    if (!data.companyInfo.name || !data.companyInfo.industry) {
      return {
        type: "validation",
        message: "Please fill in all required company information fields.",
      };
    }

    return null;
  };

  const createCompanyPayload = (
    data: RegistrationData,
    userId?: string | null,
    companyId?: string | null,
  ) => {
    const transformedRoles = transformRolesForDatabase(data.customRoles);
    const transformedPositions = transformPositionsForDatabase(data.positions);
    const now = new Date().toISOString();

    return {
      ...(companyId ? { id: companyId } : {}),
      name: data.companyInfo.name.trim(),
      slug: createCompanySlug(data.companyInfo.name),
      website: normalizeWebsite(data.companyInfo.website),
      phone: normalizeText(data.companyInfo.phone),
      industry: normalizeText(data.companyInfo.industry),
      size: normalizeText(data.companyInfo.size),
      description: normalizeText(data.companyInfo.description),
      logo_url: null,
      primary_color: data.branding.primaryColor,
      secondary_color: data.branding.secondaryColor,
      template_id: data.template.id,
      template_name: data.template.name,
      enabled_sections: data.enabledSections,
      template_config: {
        industry: data.template.industry,
        defaultRoles: data.template.defaultRoles,
        customFields: data.template.customFields,
        suggestedPositions: data.template.suggestedPositions,
      },
      custom_roles: transformedRoles,
      positions: transformedPositions,
      registration_complete: true,
      created_by: userId || null,
      owner_id: userId || null,
      updated_at: now,
    };
  };

  const saveCompany = async (data: RegistrationData, userId: string) => {
    const payload = createCompanyPayload(data, userId);

    const companyRow = await writeWithColumnFallback(
      payload,
      async (nextPayload) => {
        const query = (supabase.from("companies") as any)
          .insert(nextPayload)
          .select("id")
          .single();

        return query;
      },
    );

    return getCompanySelectId(companyRow);
  };

  const getProfileById = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      const code = (error as { code?: string }).code;
      if (!code || !NO_ROW_ERROR_CODES.has(code)) {
        throw error;
      }
    }

    return data ?? null;
  };

  const saveProfile = async (
    data: RegistrationData,
    userId: string,
    companyId: string | null,
  ) => {
    const now = new Date().toISOString();
    const ownerPhone =
      normalizeText(data.userInfo.phone) ??
      normalizeText(data.companyInfo.phone);
    const corePayload = {
      id: userId,
      company_id: companyId,
      first_name: data.userInfo.firstName.trim(),
      last_name: data.userInfo.lastName.trim(),
      role: OWNER_ROLE,
      phone: ownerPhone,
      updated_at: now,
    };
    const extraPayload = {
      email: data.userInfo.email.trim().toLowerCase(),
      is_company_admin: true,
      employment_status: "active",
      updated_at: now,
    };

    const existingProfile = await getProfileById(userId);

    if (existingProfile) {
      await writeWithColumnFallback(corePayload, async (payload) =>
        (supabase.from("profiles") as any)
          .update(payload)
          .eq("id", userId)
          .select("id")
          .single(),
      );
    } else {
      await writeWithColumnFallback(corePayload, async (payload) =>
        (supabase.from("profiles") as any)
          .insert(payload)
          .select("id")
          .single(),
      );
    }

    await writeWithColumnFallback(extraPayload, async (payload) =>
      (supabase.from("profiles") as any)
        .update(payload)
        .eq("id", userId)
        .select("id")
        .single(),
    ).catch((error) => {
      logger.warn("Unable to save optional profile onboarding fields", {
        error,
        tags: ["warning"],
      });
    });
  };

  const updateUserMetadata = async (
    data: RegistrationData,
    companyId: string | null,
  ) => {
    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: data.userInfo.firstName.trim(),
        last_name: data.userInfo.lastName.trim(),
        phone: normalizeText(data.userInfo.phone),
        role: OWNER_ROLE,
        company_id: companyId,
        active_company_id: companyId,
        company_name: data.companyInfo.name.trim(),
        company_slug: createCompanySlug(data.companyInfo.name),
      },
    });

    if (error) {
      logger.warn("Unable to update user metadata after onboarding", {
        error,
        tags: ["warning"],
      });
    }
  };

  const createCompanyWithUser = async (data: RegistrationData) => {
    const email = data.userInfo.email.trim().toLowerCase();
    const firstName = data.userInfo.firstName.trim();
    const lastName = data.userInfo.lastName.trim();
    const companySlug = createCompanySlug(data.companyInfo.name);
    const personalPhone = normalizeText(data.userInfo.phone);
    const companyPhone = normalizeText(data.companyInfo.phone);
    const companyWebsite = normalizeWebsite(data.companyInfo.website);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: data.userInfo.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName,
          last_name: lastName,
          firstName,
          lastName,
          phone: personalPhone,
          personal_phone: personalPhone,
          role: OWNER_ROLE,
          company_name: data.companyInfo.name.trim(),
          company_slug: companySlug,
          company_website: companyWebsite,
          website: companyWebsite,
          company_phone: companyPhone,
          company_industry: normalizeText(data.companyInfo.industry),
          company_size: normalizeText(data.companyInfo.size),
          company_description: normalizeText(data.companyInfo.description),
          company_data: {
            name: data.companyInfo.name.trim(),
            slug: companySlug,
            website: companyWebsite,
            phone: companyPhone,
            logo_url: null,
          },
          onboarding_template_id: data.template.id,
          onboarding_template_name: data.template.name,
        },
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error("Supabase did not return a user id after signup.");
    }

    if (!authData.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: data.userInfo.password,
      });

      if (signInError) {
        throw new Error(
          "Account was created, but FlowForce could not save onboarding data until email confirmation is complete.",
        );
      }
    }

    const companyId = await saveCompany(data, userId);
    if (!companyId) {
      throw new Error(
        "Company was created, but Supabase did not return an id.",
      );
    }

    await saveProfile(data, userId, companyId);
    await updateUserMetadata(data, companyId);

    return { userId, companyId };
  };

  const handleRegistrationError = (error: unknown): RegistrationError => {
    logger.error("Registration error", { error, tags: ["error"] });
    const details =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : undefined;
    const message = details ?? "";

    if (
      message.includes("email") ||
      message.includes("User already registered")
    ) {
      return {
        type: "validation",
        message:
          "An account with this email already exists. Please use a different email or sign in.",
        details,
      };
    }

    if (
      message.includes("password") ||
      message.includes("weak") ||
      message.includes("guess")
    ) {
      return {
        type: "validation",
        message:
          "Your password is too weak or common. Please create a stronger, more unique password.",
        details,
      };
    }

    if (message.includes("rate_limit") || message.includes("58 seconds")) {
      return {
        type: "auth",
        message:
          "Too many registration attempts. Please wait about a minute before trying again.",
        details,
      };
    }

    if (message.includes("role")) {
      return {
        type: "database",
        message:
          "There was an issue setting up your company roles. Please check your role configuration.",
        details,
      };
    }

    if (message.includes("position")) {
      return {
        type: "database",
        message:
          "There was an issue setting up your company positions. Please check your position configuration.",
        details,
      };
    }

    if (message.includes("network") || message.includes("fetch")) {
      return {
        type: "network",
        message: "Network error. Please check your connection and try again.",
        details,
      };
    }

    return {
      type: "database",
      message:
        details ||
        "There was an error setting up your company. Please try again.",
      details,
    };
  };

  const register = async (data: RegistrationData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate input data
      const validationError = validateRegistrationData(data);
      if (validationError) {
        throw new Error(validationError.message);
      }

      // Create user and company in a single flow
      await createCompanyWithUser(data);

      // Success feedback
      toast({
        title: "Welcome to FlowForce!",
        description: `${data.companyInfo.name} has been set up successfully. Welcome to your new workspace!`,
      });

      // Navigate to dashboard
      navigate("/app/dashboard");
    } catch (error: any) {
      const registrationError = handleRegistrationError(error);
      setError(registrationError);

      toast({
        title: "Registration Failed",
        description: registrationError.message,
        variant: "destructive",
      });

      throw registrationError;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    register,
    isLoading,
    error,
    clearError,
  };
}
