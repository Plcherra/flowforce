import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { verifyOnboardingSetup } from "../../_server/onboardingSetup";
import {
  applyOnboardingCompanyRoles,
  ensureProductCompanyRoles,
} from "../../_server/productRolesSetup";
import {
  clampPermissionsToProductLevel,
  resolveProductLevel,
} from "@/features/roles/constants/productLevels";
import { supabaseAdmin } from "../../_server/supabaseAdmin"; // pragma: allowlist secret
import { createServerLogger } from "../../_server/utils/logger";
import { buildOnboardingCompanyPayload } from "@/lib/theme/companySavePayload";
import { withBasicOpsPackFlags } from "@/config/packCatalog";

type JsonRecord = Record<string, unknown>;

type OnboardingRolePayload = {
  id?: string;
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  hierarchy_level?: number;
  product_level?: "owner" | "admin" | "manager" | "staff";
  permissions?: Record<string, boolean>;
  is_system_role?: boolean;
  is_active?: boolean;
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

  return roles.map((role: OnboardingRolePayload) => {
    const productLevel = resolveProductLevel({
      product_level: role.product_level,
      name: role.name,
      hierarchy_level: role.hierarchy_level,
    });
    return {
      id: role.id,
      name: role.name,
      description: role.description || "",
      color: role.color,
      icon: role.icon,
      hierarchy_level: role.hierarchy_level,
      product_level: productLevel,
      permissions: clampPermissionsToProductLevel(
        productLevel,
        role.permissions || {},
      ),
      is_system_role: role.is_system_role || false,
      is_active: role.is_active !== false,
    };
  });
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

async function ensureBasicOpsPackFlags(companyId: string) {
  const { data, error } = await supabaseAdmin // pragma: allowlist secret
    .from("system_settings")
    .select("admin_config")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error || !data) {
    logger.warn("Unable to read system settings for basic Ops packs", {
      error,
      context: { companyId },
    });
    return;
  }

  const next = withBasicOpsPackFlags(data.admin_config);
  if (next === data.admin_config) return;

  const { error: updateError } = await supabaseAdmin // pragma: allowlist secret
    .from("system_settings")
    .update({
      admin_config: next,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", companyId);

  if (updateError) {
    logger.warn("Unable to store basic Ops pack flags", {
      error: updateError,
      context: { companyId },
    });
  }
}

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
      await supabaseAdmin.auth.admin.getUserById(userId); // pragma: allowlist secret

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
    const companyPayload = buildOnboardingCompanyPayload({
      name: companyName,
      website: normalizeWebsite(companyInfo.website),
      phone: normalizeText(companyInfo.phone),
      industry: normalizeText(companyIndustry),
      size: normalizeText(companySize),
      description: normalizeText(companyInfo.description),
      templateName,
      templateId,
      templateIndustry: readString(template, "industry"),
      defaultRoles: Array.isArray(template.defaultRoles)
        ? template.defaultRoles
        : [],
      customFields: readObject(template.customFields),
      suggestedPositions: readObject(template.suggestedPositions),
      enabledSections,
      customRoles,
      positions,
      userId,
      firstName,
      lastName,
      email,
      ownerPhone,
    });

    const { data: companyId, error: setupError } = await supabaseAdmin.rpc( // pragma: allowlist secret
      "create_company_with_setup",
      {
        company_data: companyPayload,
        custom_roles: customRoles,
        positions_data: positions,
        owner_user_id: userId,
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

    await applyOnboardingCompanyRoles(supabaseAdmin, { // pragma: allowlist secret
      companyId,
      userId,
      roles: customRoles,
    });

    await ensureProductCompanyRoles(supabaseAdmin, { // pragma: allowlist secret
      companyId,
      userId,
    });

    await ensureBasicOpsPackFlags(companyId);

    const setupStatus = await verifyOnboardingSetup(supabaseAdmin, { // pragma: allowlist secret
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

    const { data: company, error: companyError } = await supabaseAdmin // pragma: allowlist secret
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
      await supabaseAdmin.auth.admin.updateUserById(userId, { // pragma: allowlist secret
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
