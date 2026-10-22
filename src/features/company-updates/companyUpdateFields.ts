import { sha256Hex } from "@/i18n/sourceHash";
import {
  isAppLanguage,
  type AppLanguage,
} from "@/i18n/resolveLanguage";

export const COMPANY_UPDATE_FIELD_PATHS = [
  "title",
  "body",
  "rich_content",
] as const;

export type CompanyUpdateFieldPath = (typeof COMPANY_UPDATE_FIELD_PATHS)[number];

export interface CompanyUpdateContentTranslation {
  sourceLocale: AppLanguage;
  title: string;
  body: string;
  richContent: string | null;
}

export interface StoredContentTranslation {
  sourceId: string;
  fieldPath: string;
  locale: string;
  sourceLocale: string;
  sourceHash: string;
  translatedText: string;
}

const CONTENT_SOURCE_LOCALE = "contentSourceLocale";

export function readContentSourceLocale(value: unknown): AppLanguage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const code = (value as Record<string, unknown>)[CONTENT_SOURCE_LOCALE];
  return isAppLanguage(code) ? code : null;
}

export function withContentSourceLocale(
  settings: unknown,
  sourceLocale: AppLanguage,
): Record<string, unknown> {
  const base =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  base[CONTENT_SOURCE_LOCALE] = sourceLocale;
  return base;
}

export function companyUpdateWriteColumns(
  payload: object,
): Record<string, unknown> {
  const record = payload as Record<string, unknown>;
  const columns: Record<string, unknown> = {};
  const copy = (from: string, to: string) => {
    if (record[from] !== undefined) columns[to] = record[from];
  };
  copy("title", "title");
  copy("body", "body");
  copy("richContent", "rich_content");
  copy("rich_content", "rich_content");
  copy("type", "update_type");
  copy("update_type", "update_type");
  copy("priority", "priority");
  copy("backgroundStyle", "background_style");
  copy("background_style", "background_style");
  copy("publishingSettings", "publishing_settings");
  copy("publishing_settings", "publishing_settings");
  copy("recipients", "recipients");
  copy("assignedEmployees", "assigned_employees");
  copy("assigned_employees", "assigned_employees");
  copy("isPinned", "is_pinned");
  copy("is_pinned", "is_pinned");
  copy("status", "status");
  copy("author_id", "author_id");
  copy("author_name", "author_name");
  copy("author_role", "author_role");
  copy("author_avatar", "author_avatar");
  return columns;
}

export function companyUpdateTouchesContent(payload: object): boolean {
  const record = payload as Record<string, unknown>;
  return ["title", "body", "richContent", "rich_content"].some(
    (key) => record[key] !== undefined,
  );
}

export interface CompanyUpdateTranslationField {
  fieldPath: CompanyUpdateFieldPath;
  text: string;
  richHtml?: boolean;
}

export function companyUpdateTranslationFields(input: {
  title: string;
  body: string;
  richContent?: string | null;
}): CompanyUpdateTranslationField[] {
  const fields: CompanyUpdateTranslationField[] = [
    { fieldPath: "title", text: input.title },
    { fieldPath: "body", text: input.body },
  ];
  if (typeof input.richContent === "string" && input.richContent.trim()) {
    fields.push({
      fieldPath: "rich_content",
      text: input.richContent,
      richHtml: true,
    });
  }
  return fields;
}

export async function saveCompanyUpdateWithoutModel(input: {
  save: () => Promise<void>;
  translate?: () => Promise<unknown>;
}): Promise<void> {
  await input.save();
  if (!input.translate) return;
  const translate = input.translate;
  void Promise.resolve()
    .then(() => translate())
    .catch(() => undefined);
}

export async function resolveCompanyUpdateTranslation(
  update: {
    id: string;
    title: string;
    body: string;
    richContent?: string | null;
    contentSourceLocale?: AppLanguage | null;
  },
  rows: StoredContentTranslation[],
  viewerLocale: AppLanguage,
): Promise<{
  translation: CompanyUpdateContentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = rows.filter((row) => row.sourceId === update.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))
    ?.sourceLocale;
  const sourceLocale =
    update.contentSourceLocale ??
    (isAppLanguage(cachedSource) ? cachedSource : null);
  const fields = companyUpdateTranslationFields(update);
  if (!sourceLocale || fields.every((field) => field.text.trim() === "")) {
    return {
      translation: null,
      needsRequest: false,
      sourceLocale,
    };
  }
  if (sourceLocale === viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }

  let needsRequest = false;
  const translated: Record<CompanyUpdateFieldPath, string> = {
    title: update.title,
    body: update.body,
    rich_content: update.richContent ?? "",
  };
  for (const field of fields) {
    const hash = await sha256Hex(field.text);
    const row = ownRows.find(
      (item) => item.fieldPath === field.fieldPath && item.locale === viewerLocale,
    );
    if (row && row.sourceHash === hash) {
      translated[field.fieldPath] = row.translatedText;
    } else {
      needsRequest = true;
    }
  }

  const hasTranslation = fields.some((field) => {
    const row = ownRows.find(
      (item) => item.fieldPath === field.fieldPath && item.locale === viewerLocale,
    );
    return Boolean(row && translated[field.fieldPath] === row.translatedText);
  });

  return {
    translation: hasTranslation
      ? {
          sourceLocale,
          title: translated.title,
          body: translated.body,
          richContent: update.richContent ? translated.rich_content : null,
        }
      : null,
    needsRequest,
    sourceLocale,
  };
}
