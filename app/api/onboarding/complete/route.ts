import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { verifyOnboardingSetup } from "../../_server/onboardingSetup";
import { ensureProductCompanyRoles } from "../../_server/productRolesSetup";
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

const publicErrorDetails = (error: unknown) => {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as {
    code?: unknown;
    details?: unknown;
    hint?: unknown;
    message?: unknown;
  };

  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    details:
      typeof candidate.details === "string" ? candidate.details : undefined,
    hint: typeof candidate.hint === "string" ? candidate.hint : undefined,
    message:
      typeof candidate.message === "string" ? candidate.message : undefined,
  };
};

const jsonError = (
  message: string,
  status = 400,
  details?: unknown,
  requestId?: string,
) => NextResponse.json({ message, details, requestId }, { status });

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = randomUUID();

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
      return jsonError(
        "Missing required onboarding fields.",
        400,
        undefined,
        requestId,
      );
    }

    const { data: userResult, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userResult?.user) {
      logger.warn("Unable to verify onboarding user", {
        error: userError,
        requestId,
        context: { userId },
      });
      return jsonError(
        "Unable to verify account before onboarding.",
        401,
        publicErrorDetails(userError),
        requestId,
      );
    }

    if (userResult.user.email?.toLowerCase() !== email) {
      return jsonError(
        "Onboarding email does not match created account.",
        403,
        undefined,
        requestId,
      );
    }

    const templateName = readString(template, "name");
    const templateId = readString(template, "id");
    const ownerPhone =
      normalizeText(userInfo.phone) ?? normalizeText(companyInfo.phone);
    const companyPayload = {
      name: companyName,
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
      ownerid: userId,
      ownerprofile: {
        first_name: firstName,
        last_name: lastName,
        email,
        phone: ownerPhone,
      },
    };

    const { data: companyId, error: setupError } = await supabaseAdmin.rpc(
      "create_company_with_setup",
      {
        companydata: companyPayload,
        custom_roles: customRoles,
        positionsdata: positions,
        owneruser_id: userId,
      },
    );

    if (setupError || !companyId) {
      logger.error("Unable to complete onboarding setup RPC", {
        error: setupError,
        requestId,
        context: { userId, companyName },
      });
      return jsonError(
        "Unable to complete company workspace setup.",
        500,
        {
          stage: "create_company_with_setup",
          ...publicErrorDetails(setupError),
        },
        requestId,
      );
    }

    await ensureProductCompanyRoles(supabaseAdmin, {
      companyId,
      userId,
    });

    const setupStatus = await verifyOnboardingSetup(supabaseAdmin, {
      companyId,
      userId,
    });

    if (!setupStatus.ok) {
      logger.error("Onboarding setup verification failed", {
        requestId,
        context: { userId, companyId, setupStatus },
      });
      return jsonError(
        "Company workspace setup is incomplete after onboarding.",
        500,
        {
          stage: "verify_onboarding_setup",
          missing: setupStatus.missing,
          counts: setupStatus.counts,
        },
        requestId,
      );
    }

    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .select("slug")
      .eq("id", companyId)
      .single();

    if (companyError) {
      logger.warn("Unable to read onboarding company metadata", {
        error: companyError,
        requestId,
        context: { userId, companyId },
      });
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
          company_slug: company?.slug ?? null,
        },
      });

    if (metadataError) {
      logger.warn("Unable to update onboarding user metadata", {
        error: metadataError,
        requestId,
        context: { userId, companyId },
      });
    }

    return NextResponse.json({ companyId, requestId, setup: setupStatus });
  } catch (error) {
    logger.error("Unexpected onboarding completion error", {
      error,
      requestId,
    });
    return jsonError(
      "Unexpected onboarding completion error.",
      500,
      undefined,
      requestId,
    );
  }
}
