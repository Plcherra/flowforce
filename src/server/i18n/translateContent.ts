import { createHash } from "node:crypto";

import { APP_LANGUAGES, type AppLanguage } from "@/i18n/resolveLanguage";

export const CONTENT_TRANSLATION_MODEL = "gpt-4o-mini";
export const CONTENT_TRANSLATION_PROMPT_KEY = "content_translation";

export type ContentFieldKind =
  | "text"
  | "name"
  | "company"
  | "email"
  | "phone"
  | "url"
  | "sku"
  | "money"
  | "date"
  | "number"
  | "boolean"
  | "file"
  | "id";

export interface ContentTranslationRow {
  locale: AppLanguage;
  sourceHash: string;
  translatedText: string;
}

export interface ContentTranslationCache {
  read(input: {
    sourceTable: string;
    sourceId: string;
    fieldPath: string;
  }): Promise<ContentTranslationRow[]>;
  replace(input: {
    companyId: string;
    sourceTable: string;
    sourceId: string;
    fieldPath: string;
    sourceLocale: AppLanguage;
    sourceHash: string;
    rows: Array<{ locale: AppLanguage; translatedText: string }>;
  }): Promise<void>;
}

export interface ContentModelClient {
  translate(input: {
    text: string;
    sourceLocale: AppLanguage;
    targetLocale: AppLanguage;
  }): Promise<{ text: string; inputTokens?: number; outputTokens?: number }>;
}

export interface ContentBudgetGate {
  allowed(): Promise<boolean>;
}

export interface ContentUsageEvent {
  promptKey: typeof CONTENT_TRANSLATION_PROMPT_KEY;
  model: typeof CONTENT_TRANSLATION_MODEL;
  status: "succeeded" | "failed" | "budget_blocked";
  inputTokens: number;
  outputTokens: number;
}

export interface TranslateContentInput {
  companyId: string;
  sourceTable: string;
  sourceId: string;
  fieldPath: string;
  sourceLocale: AppLanguage;
  viewerLocale: AppLanguage;
  text: string;
  fieldKind?: ContentFieldKind;
  cache: ContentTranslationCache;
  model: ContentModelClient;
  budget: ContentBudgetGate;
  recordUsage?: (event: ContentUsageEvent) => Promise<void>;
}

export interface TranslateContentResult {
  text: string;
  locale: AppLanguage;
  sourceHash: string;
  cached: boolean;
}

const SKIPPED_KINDS = new Set<ContentFieldKind>([
  "name",
  "company",
  "email",
  "phone",
  "url",
  "sku",
  "money",
  "date",
  "number",
  "boolean",
  "file",
  "id",
]);

export function sourceHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function isNonTranslatable(text: string): boolean {
  const value = text.trim();
  if (!value) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  if (/^(https?:\/\/|www\.)\S+$/i.test(value)) return true;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  ) {
    return true;
  }
  if (/^(true|false|yes|no)$/i.test(value)) return true;
  if (/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(value)) return true;
  if (/^[$€£]\s?\d[\d,]*(?:\.\d+)?$/.test(value)) return true;
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(value)) return true;
  if (
    /^\+?[\d\s().-]{7,}$/.test(value) &&
    (value.match(/\d/g)?.length ?? 0) >= 7
  ) {
    return true;
  }
  if (/^[^\\/\s]+\.[A-Za-z0-9]{1,5}$/.test(value)) return true;
  if (/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(value)) return true;
  return false;
}

function otherLocales(sourceLocale: AppLanguage): AppLanguage[] {
  return APP_LANGUAGES.filter((locale) => locale !== sourceLocale);
}

function textForViewer(
  viewerLocale: AppLanguage,
  sourceLocale: AppLanguage,
  original: string,
  rows: ContentTranslationRow[],
): string {
  if (viewerLocale === sourceLocale) return original;
  return rows.find((row) => row.locale === viewerLocale)?.translatedText ?? original;
}

async function record(
  input: TranslateContentInput,
  status: ContentUsageEvent["status"],
  inputTokens = 0,
  outputTokens = 0,
) {
  if (!input.recordUsage) return;
  await input.recordUsage({
    promptKey: CONTENT_TRANSLATION_PROMPT_KEY,
    model: CONTENT_TRANSLATION_MODEL,
    status,
    inputTokens,
    outputTokens,
  });
}

export async function translateContent(
  input: TranslateContentInput,
): Promise<TranslateContentResult> {
  const original = input.text;
  const hash = sourceHash(original);
  const skipped =
    input.fieldKind !== undefined && SKIPPED_KINDS.has(input.fieldKind);
  if (skipped || isNonTranslatable(original)) {
    return {
      text: original,
      locale: input.viewerLocale,
      sourceHash: hash,
      cached: false,
    };
  }

  const targets = otherLocales(input.sourceLocale);
  const address = {
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    fieldPath: input.fieldPath,
  };
  const existing = await input.cache.read(address);
  const fresh = targets.every((locale) =>
    existing.some((row) => row.locale === locale && row.sourceHash === hash),
  );
  if (fresh) {
    return {
      text: textForViewer(input.viewerLocale, input.sourceLocale, original, existing),
      locale: input.viewerLocale,
      sourceHash: hash,
      cached: true,
    };
  }

  if (!(await input.budget.allowed())) {
    await record(input, "budget_blocked");
    return {
      text: original,
      locale: input.viewerLocale,
      sourceHash: hash,
      cached: false,
    };
  }

  try {
    const translated = [];
    let inputTokens = 0;
    let outputTokens = 0;
    for (const locale of targets) {
      const result = await input.model.translate({
        text: original,
        sourceLocale: input.sourceLocale,
        targetLocale: locale,
      });
      inputTokens += result.inputTokens ?? 0;
      outputTokens += result.outputTokens ?? 0;
      translated.push({ locale, translatedText: result.text });
    }
    await input.cache.replace({
      companyId: input.companyId,
      ...address,
      sourceLocale: input.sourceLocale,
      sourceHash: hash,
      rows: translated,
    });
    await record(input, "succeeded", inputTokens, outputTokens);
    const rows = translated.map((row) => ({ ...row, sourceHash: hash }));
    return {
      text: textForViewer(input.viewerLocale, input.sourceLocale, original, rows),
      locale: input.viewerLocale,
      sourceHash: hash,
      cached: true,
    };
  } catch {
    await record(input, "failed");
    return {
      text: original,
      locale: input.viewerLocale,
      sourceHash: hash,
      cached: false,
    };
  }
}

export function createOpenAiContentModel(options?: {
  fetchImpl?: typeof fetch;
  apiKey?: string;
}): ContentModelClient {
  return {
    async translate({ text, sourceLocale, targetLocale }) {
      const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
      const response = await (options?.fetchImpl ?? fetch)(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: CONTENT_TRANSLATION_MODEL,
            temperature: 0,
            messages: [
              {
                role: "system",
                content: `Translate from ${sourceLocale} to ${targetLocale}. Keep names, emails, phone numbers, URLs, SKUs, amounts, dates, numbers, and ids as written. Return only the translation.`,
              },
              { role: "user", content: text },
            ],
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Translation request failed (${response.status})`);
      }
      const body = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== "string" || content.trim() === "") {
        throw new Error("Translation response was empty");
      }
      return {
        text: content.trim(),
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
      };
    },
  };
}
