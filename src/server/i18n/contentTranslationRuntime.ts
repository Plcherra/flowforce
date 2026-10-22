import type { AppLanguage } from "@/i18n/resolveLanguage";
import { isAppLanguage } from "@/i18n/resolveLanguage";
import { RICH_HTML_INSTRUCTION, sameHtmlTags } from "@/server/i18n/richContent";
import { translatableFieldRule } from "@/server/i18n/translatableFields";
import {
  CONTENT_TRANSLATION_MODEL,
  CONTENT_TRANSLATION_PROMPT_KEY,
  createOpenAiContentModel,
  translateContent,
  type ContentTranslationCache,
  type ContentTranslationRow,
  type ContentUsageEvent,
} from "@/server/i18n/translateContent";

type AdminClient = {
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  auth: {
    getUser: (token: string) => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
};

export interface StoredFieldRequest {
  companyId: string;
  sourceTable: string;
  sourceId: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  fields: Array<{ fieldPath: string; text: string }>;
}

export function createSupabaseContentCache(client: AdminClient): ContentTranslationCache {
  return {
    async read({ sourceTable, sourceId, fieldPath }) {
      const { data, error } = await client
        .from("content_translations")
        .select("locale, source_hash, translated_text")
        .eq("source_table", sourceTable)
        .eq("source_id", sourceId)
        .eq("field_path", fieldPath);
      if (error) throw new Error(error.message);
      return ((data ?? []) as Array<{
        locale: string;
        source_hash: string;
        translated_text: string;
      }>).flatMap((row) => {
        if (!isAppLanguage(row.locale)) return [];
        const mapped: ContentTranslationRow = {
          locale: row.locale,
          sourceHash: row.source_hash,
          translatedText: row.translated_text,
        };
        return [mapped];
      });
    },
    async replace(input) {
      const { error: deleteError } = await client
        .from("content_translations")
        .delete()
        .eq("source_table", input.sourceTable)
        .eq("source_id", input.sourceId)
        .eq("field_path", input.fieldPath);
      if (deleteError) throw new Error(deleteError.message);
      if (input.rows.length === 0) return;
      const { error } = await client.from("content_translations").insert(
        input.rows.map((row) => ({
          company_id: input.companyId,
          source_table: input.sourceTable,
          source_id: input.sourceId,
          field_path: input.fieldPath,
          source_locale: input.sourceLocale,
          source_hash: input.sourceHash,
          locale: row.locale,
          translated_text: row.translatedText,
        })),
      );
      if (error) throw new Error(error.message);
    },
  };
}

export function createContentBudget(
  client: AdminClient,
  companyId: string,
): { allowed: () => Promise<boolean> } {
  return {
    async allowed() {
      const { data: control, error: controlError } = await client
        .from("ai_budget_controls")
        .select("enabled, monthly_token_limit, monthly_cost_limit_usd")
        .eq("company_id", companyId)
        .eq("model", CONTENT_TRANSLATION_MODEL)
        .maybeSingle();
      if (controlError) return false;
      if (!control) return true;
      if (control.enabled === false) return false;
      const monthStart = new Date();
      monthStart.setUTCDate(1);
      monthStart.setUTCHours(0, 0, 0, 0);
      const { data: usage, error: usageError } = await client
        .from("ai_usage_events")
        .select("total_tokens, cost_usd")
        .eq("company_id", companyId)
        .eq("model", CONTENT_TRANSLATION_MODEL)
        .gte("created_at", monthStart.toISOString());
      if (usageError) return false;
      const rows = (usage ?? []) as Array<{
        total_tokens: number | null;
        cost_usd: number | null;
      }>;
      const tokens = rows.reduce((sum, row) => sum + (row.total_tokens ?? 0), 0);
      const cost = rows.reduce((sum, row) => sum + Number(row.cost_usd ?? 0), 0);
      return tokens < Number(control.monthly_token_limit) && cost < Number(control.monthly_cost_limit_usd);
    },
  };
}

function recordUsage(client: AdminClient, companyId: string) {
  return async (event: ContentUsageEvent) => {
    await client.rpc("record_ai_usage_event", {
      p_company_id: companyId,
      p_prompt_key: CONTENT_TRANSLATION_PROMPT_KEY,
      p_model: CONTENT_TRANSLATION_MODEL,
      p_status: event.status,
      p_input_tokens: event.inputTokens,
      p_output_tokens: event.outputTokens,
      p_metadata: { provider: "openai" },
    });
  };
}

export async function userCanAccessCompany(
  client: AdminClient,
  userId: string,
  companyId: string,
): Promise<boolean> {
  const { count: membershipCount, error: membershipError } = await client
    .from("company_members")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("user_id", userId);
  if (!membershipError && (membershipCount ?? 0) > 0) return true;
  const { count: profileCount, error: profileError } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("id", userId)
    .eq("company_id", companyId);
  return !profileError && (profileCount ?? 0) > 0;
}

export async function translateStoredFields(
  client: AdminClient,
  input: StoredFieldRequest,
): Promise<Record<string, string>> {
  const cache = createSupabaseContentCache(client);
  const budget = createContentBudget(client, input.companyId);
  const model = createOpenAiContentModel();
  const usage = recordUsage(client, input.companyId);
  const translated: Record<string, string> = {};
  for (const field of input.fields) {
    const rule = translatableFieldRule(input.sourceTable, field.fieldPath);
    if (!rule) {
      throw new Error(`Field ${input.sourceTable}.${field.fieldPath} is not translatable`);
    }
    const result = await translateContent({
      companyId: input.companyId,
      sourceTable: input.sourceTable,
      sourceId: input.sourceId,
      fieldPath: field.fieldPath,
      sourceLocale: input.sourceLocale,
      viewerLocale: input.viewerLocale,
      text: field.text,
      instruction: rule.richHtml ? RICH_HTML_INSTRUCTION : undefined,
      acceptTranslation: rule.richHtml
        ? (value) => sameHtmlTags(field.text, value)
        : undefined,
      cache,
      model,
      budget,
      recordUsage: async (event) => {
        try {
          await usage(event);
        } catch {
          return undefined;
        }
      },
    });
    translated[field.fieldPath] = result.text;
  }
  return translated;
}
