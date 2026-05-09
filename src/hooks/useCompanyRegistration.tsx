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

const OWNER_ROLE = "owner";

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

export function useCompanyRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<RegistrationError | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const completeOnboardingOnServer = async (
    data: RegistrationData,
    userId: string,
  ) => {
    const response = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, userId }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      companyId?: string;
      message?: string;
      details?: { message?: string } | string;
    };

    if (!response.ok) {
      const detailMessage =
        typeof result.details === "string"
          ? result.details
          : result.details?.message;
      throw new Error(
        [result.message, detailMessage].filter(Boolean).join(": ") ||
          "Unable to complete onboarding.",
      );
    }

    if (!result.companyId) {
      throw new Error("Company setup did not return a company id.");
    }

    return result.companyId;
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
        logger.warn(
          "Signup completed without an active session; continuing onboarding data save",
          {
            error: signInError,
            context: { userId },
            tags: ["warning"],
          },
        );
      }
    }

    const companyId = await completeOnboardingOnServer(data, userId);
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

    if (
      message.includes("row-level security") ||
      message.includes("42501") ||
      message.includes("permission denied")
    ) {
      return {
        type: "database",
        message:
          "FlowForce could not finish workspace setup because Supabase permissions are blocking the write. Check the onboarding API service role key and RLS policies.",
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
    } catch (error) {
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
