import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";

type JsonRecord = Record<string, unknown>;

type OnboardingRolePayload = {
  id?: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  hierarchy_level?: number;
  permissions?: Record<string, boolean>;
  is_system_role?: boolean;
};

type OnboardingPositionPayload = {
  id?: string;
  name?: string;
  description?: string;
  roleId?: string;
  permissions?: Record<string, boolean>;
};

const logger = createServerLogger("onboarding-complete");

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeWebsite = (value: unknown) => {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const readObject = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};

const readString = (source: JsonRecord, key: string) => {
  const value = source[key];
  return typeof value === "string" ? value : "";
};

const createCompanySlug = (companyName: string) => {
  const base =
    companyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "company";

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
};

const transformRolesForDatabase = (roles: unknown) => {
  if (!Array.isArray(roles)) return [];

  return roles.map((role: OnboardingRolePayload) => ({
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

const transformPositionsForDatabase = (positions: unknown) => {
  if (!Array.isArray(positions)) return [];

  return positions.map((position: OnboardingPositionPayload) => ({
    id: position.id,
    name: position.name,
    description: position.description || "",
    roleId: position.roleId,
    permissions: position.permissions || {},
  }));
};

const jsonError = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ message, details }, { status });

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = readObject(await request.json());
    const userId = readString(body, "userId");
    const userInfo = readObject(body.userInfo);
    const companyInfo = readObject(body.companyInfo);
    const branding = readObject(body.branding);
    const template = readObject(body.template);
    const enabledSections = Array.isArray(body.enabledSections)
      ? body.enabledSections
      : [];
    const customRoles = transformRolesForDatabase(body.customRoles);
    const positions = transformPositionsForDatabase(body.positions);

    const email = readString(userInfo, "email").trim().toLowerCase();
    const firstName = readString(userInfo, "firstName").trim();
    const lastName = readString(userInfo, "lastName").trim();
    const companyName = readString(companyInfo, "name").trim();
    const companyIndustry = readString(companyInfo, "industry").trim();
    const companySize = readString(companyInfo, "size").trim();

    if (
      !userId ||
      !email ||
      !firstName ||
      !lastName ||
      !companyName ||
      !companyIndustry ||
      !companySize
    ) {
      return jsonError("Missing required onboarding fields.");
    }

    const { data: userResult, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userResult?.user) {
      logger.warn("Unable to verify onboarding user", {
        error: userError,
        context: { userId },
      });
      return jsonError("Unable to verify account before onboarding.", 401);
    }

    if (userResult.user.email?.toLowerCase() !== email) {
      return jsonError("Onboarding email does not match created account.", 403);
    }

    const now = new Date().toISOString();
    const templateName = readString(template, "name");
    const templateId = readString(template, "id");
    const companyPayload = {
      name: companyName,
      slug: createCompanySlug(companyName),
      website: normalizeWebsite(companyInfo.website),
      phone: normalizeText(companyInfo.phone),
      industry: normalizeText(companyIndustry),
      size: normalizeText(companySize),
      description: normalizeText(companyInfo.description),
      logo_url: null,
      primary_color: readString(branding, "primaryColor") || "#3b82f6",
      secondary_color: readString(branding, "secondaryColor") || "#1e40af",
      template_id: null,
      template_name: templateName || null,
      enabled_sections: enabledSections,
      template_config: {
        templateId,
        templateName,
        industry: readString(template, "industry"),
        defaultRoles: Array.isArray(template.defaultRoles)
          ? template.defaultRoles
          : [],
        customFields: readObject(template.customFields),
        suggestedPositions: readObject(template.suggestedPositions),
      },
      custom_roles: customRoles,
      positions,
      registration_complete: true,
      created_by: userId,
      owner_id: userId,
      updated_at: now,
    };

    const { data: existingProfile, error: existingProfileError } =
      await supabaseAdmin
        .from("profiles")
        .select("company_id")
        .eq("id", userId)
        .maybeSingle();

    if (existingProfileError) {
      logger.warn("Unable to check existing onboarding profile", {
        error: existingProfileError,
        context: { userId },
      });
    }

    let companyId = existingProfile?.company_id ?? null;

    if (companyId) {
      const { error: updateCompanyError } = await supabaseAdmin
        .from("companies")
        .update(companyPayload)
        .eq("id", companyId);

      if (updateCompanyError) {
        logger.error("Unable to update onboarding company", {
          error: updateCompanyError,
          context: { userId, companyId },
        });
        return jsonError("Unable to update company workspace.", 500);
      }
    } else {
      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .insert(companyPayload)
        .select("id")
        .single();

      if (companyError || !company?.id) {
        logger.error("Unable to create onboarding company", {
          error: companyError,
          context: { userId, companyName },
        });
        return jsonError(
          "Unable to create company workspace.",
          500,
          companyError,
        );
      }

      companyId = company.id;
    }

    const ownerPhone =
      normalizeText(userInfo.phone) ?? normalizeText(companyInfo.phone);
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        company_id: companyId,
        first_name: firstName,
        last_name: lastName,
        email,
        role: "owner",
        phone: ownerPhone,
        is_company_admin: true,
        employment_status: "active",
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      logger.error("Unable to create onboarding profile", {
        error: profileError,
        context: { userId, companyId },
      });
      return jsonError("Unable to create owner profile.", 500, profileError);
    }

    const { error: metadataError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...userResult.user.user_metadata,
          first_name: firstName,
          last_name: lastName,
          phone: ownerPhone,
          role: "owner",
          company_id: companyId,
          active_company_id: companyId,
          company_name: companyName,
          company_slug: companyPayload.slug,
        },
      });

    if (metadataError) {
      logger.warn("Unable to update onboarding user metadata", {
        error: metadataError,
        context: { userId, companyId },
      });
    }

    return NextResponse.json({ companyId });
  } catch (error) {
    logger.error("Unexpected onboarding completion error", { error });
    return jsonError("Unexpected onboarding completion error.", 500);
  }
}
