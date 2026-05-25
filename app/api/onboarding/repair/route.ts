import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../_server/supabaseAdmin";
import { createServerLogger } from "../../_server/utils/logger";

type JsonRecord = Record<string, unknown>;

const logger = createServerLogger("onboarding-repair");

const readMetadataValue = (
  source: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = source?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
};

const normalizeWebsite = (value: string | null) => {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const jsonError = (message: string, status = 400, details?: unknown) =>
  NextResponse.json({ message, details }, { status });

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!token) {
      return jsonError("Missing authenticated session.", 401);
    }

    const { data: userResult, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userResult?.user) {
      return jsonError("Unable to verify session.", 401, userError);
    }

    const user = userResult.user;
    const metadata = user.user_metadata as Record<string, unknown> | undefined;
    const companyName = readMetadataValue(metadata, "company_name");

    if (!companyName) {
      return jsonError(
        "This account does not have enough setup metadata to repair automatically.",
        409,
      );
    }

    const firstName =
      readMetadataValue(metadata, "first_name") ??
      readMetadataValue(metadata, "firstName") ??
      "";
    const lastName =
      readMetadataValue(metadata, "last_name") ??
      readMetadataValue(metadata, "lastName") ??
      "";
    const ownerPhone =
      readMetadataValue(metadata, "phone") ??
      readMetadataValue(metadata, "personal_phone") ??
      readMetadataValue(metadata, "company_phone");

    const companyPayload: JsonRecord = {
      name: companyName,
      website: normalizeWebsite(
        readMetadataValue(metadata, "company_website") ??
          readMetadataValue(metadata, "website"),
      ),
      phone: readMetadataValue(metadata, "company_phone"),
      industry: readMetadataValue(metadata, "company_industry") ?? "Other",
      size: readMetadataValue(metadata, "company_size") ?? "1-10 employees",
      description: readMetadataValue(metadata, "company_description"),
      primary_color: "#3b82f6",
      secondary_color: "#1e40af",
      template_id: readMetadataValue(metadata, "onboarding_template_id"),
      template_name: readMetadataValue(metadata, "onboarding_template_name"),
      enabled_sections: [],
      template_config: {},
      owner_profile: {
        first_name: firstName,
        last_name: lastName,
        email: user.email ?? null,
        phone: ownerPhone,
      },
    };

    const { data: companyId, error: setupError } = await supabaseAdmin.rpc(
      "create_company_with_setup",
      {
        company_data: companyPayload,
        custom_roles: [],
        positions_data: [],
        owner_user_id: user.id,
      },
    );

    if (setupError || !companyId) {
      logger.error("Unable to repair onboarding setup", {
        error: setupError,
        context: { userId: user.id },
      });
      return jsonError("Unable to repair workspace setup.", 500, setupError);
    }

    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("slug")
      .eq("id", companyId)
      .maybeSingle();

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadata,
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

    return NextResponse.json({ companyId });
  } catch (error) {
    logger.error("Unexpected onboarding repair error", { error });
    return jsonError("Unexpected onboarding repair error.", 500);
  }
}
