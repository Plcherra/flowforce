import { NextRequest, NextResponse } from "next/server";

import { isAppLanguage } from "@/i18n/resolveLanguage";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import {
  translateStoredFields,
  userCanAccessCompany,
} from "@/server/i18n/contentTranslationRuntime";
import { translatableFieldRule } from "@/server/i18n/translatableFields";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getBearerToken = (request: NextRequest) => {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
};

export async function POST(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const companyId = body?.companyId;
  const sourceTable = body?.sourceTable;
  const sourceId = body?.sourceId;
  const sourceLocale = body?.sourceLocale;
  const viewerLocale = body?.viewerLocale;
  const fields = body?.fields;

  if (typeof companyId !== "string" || !UUID.test(companyId)) {
    return NextResponse.json({ error: "Missing company" }, { status: 400 });
  }
  if (typeof sourceTable !== "string" || typeof sourceId !== "string" || !UUID.test(sourceId)) {
    return NextResponse.json({ error: "Missing record" }, { status: 400 });
  }
  if (!isAppLanguage(sourceLocale) || !isAppLanguage(viewerLocale)) {
    return NextResponse.json({ error: "Missing language" }, { status: 400 });
  }
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > 8) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const parsedFields: Array<{ fieldPath: string; text: string }> = [];
  for (const field of fields) {
    if (
      !field ||
      typeof field.fieldPath !== "string" ||
      typeof field.text !== "string" ||
      !translatableFieldRule(sourceTable, field.fieldPath)
    ) {
      return NextResponse.json({ error: "Field is not translatable" }, { status: 400 });
    }
    parsedFields.push({ fieldPath: field.fieldPath, text: field.text });
  }

  const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userResult?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userCanAccessCompany(supabaseAdmin, userResult.user.id, companyId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const translated = await translateStoredFields(supabaseAdmin, {
      companyId,
      sourceTable,
      sourceId,
      sourceLocale,
      viewerLocale,
      fields: parsedFields,
    });
    return NextResponse.json({ sourceLocale, fields: translated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Translation failed" },
      { status: 500 },
    );
  }
}
