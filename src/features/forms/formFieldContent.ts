import { sha256Hex } from "@/i18n/sourceHash";
import { isAppLanguage, type AppLanguage } from "@/i18n/resolveLanguage";

import type { StoredFormTranslation } from "./formContentFields";

export const FORM_FIELD_TABLE = "form_fields";
export const FORM_FIELD_TRANSLATION_BATCH = 8;

export const FORM_FIELD_TEXT_PATHS = ["label", "description", "placeholder"] as const;

export interface FormFieldContentTranslation {
  sourceLocale: AppLanguage;
  label: string;
  description: string | null;
  placeholder: string | null;
  optionLabels: string[];
}

export function optionLabelPath(index: number): string {
  return `options.${index}`;
}

export function isOptionLabelPath(fieldPath: string): boolean {
  return /^options\.\d+$/.test(fieldPath);
}

/** Options JSON written by the form builder: a list of strings. */
export function readBuilderOptionLabels(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((option) => (typeof option === "string" ? option : String(option)));
}

export function formFieldTranslationFields(input: {
  label?: string | null;
  description?: string | null;
  placeholder?: string | null;
  options?: unknown;
}): Array<{ fieldPath: string; text: string }> {
  const fields: Array<{ fieldPath: string; text: string }> = [];
  for (const fieldPath of FORM_FIELD_TEXT_PATHS) {
    const text = input[fieldPath];
    if (typeof text === "string" && text.trim()) {
      fields.push({ fieldPath, text });
    }
  }
  readBuilderOptionLabels(input.options).forEach((option, index) => {
    if (option.trim()) {
      fields.push({ fieldPath: optionLabelPath(index), text: option });
    }
  });
  return fields;
}

export function storedOptionValue(option: string): string {
  return option;
}

export function optionLabelForValue(
  options: string[],
  optionLabels: string[],
  value: string,
): string {
  const index = options.indexOf(value);
  if (index < 0) return value;
  return optionLabels[index] ?? value;
}

export function displayAnswer(
  value: unknown,
  options: string[],
  optionLabels: string[],
): unknown {
  if (typeof value === "string") {
    return optionLabelForValue(options, optionLabels, value);
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "string" ? optionLabelForValue(options, optionLabels, item) : item,
    );
  }
  return value;
}

export function presentFormField<
  T extends {
    label?: string | null;
    description?: string | null;
    placeholder?: string | null;
  },
>(field: T, translation: FormFieldContentTranslation | null): T {
  if (!translation) return field;
  return {
    ...field,
    label: translation.label,
    description: translation.description ?? field.description ?? null,
    placeholder: translation.placeholder ?? field.placeholder ?? null,
  };
}

export async function resolveFormFieldTranslation(
  field: {
    id: string;
    label?: string | null;
    description?: string | null;
    placeholder?: string | null;
    options?: unknown;
  },
  rows: StoredFormTranslation[],
  viewerLocale: AppLanguage,
  sourceLocaleHint?: AppLanguage | null,
): Promise<{
  translation: FormFieldContentTranslation | null;
  needsRequest: boolean;
  sourceLocale: AppLanguage | null;
}> {
  const ownRows = rows.filter((row) => row.sourceId === field.id);
  const cachedSource = ownRows.find((row) => isAppLanguage(row.sourceLocale))?.sourceLocale;
  const sourceLocale =
    sourceLocaleHint ?? (isAppLanguage(cachedSource) ? cachedSource : null);
  const parts = formFieldTranslationFields(field);
  const options = readBuilderOptionLabels(field.options);
  if (!sourceLocale || parts.length === 0) {
    return { translation: null, needsRequest: false, sourceLocale };
  }
  if (sourceLocale === viewerLocale) {
    return { translation: null, needsRequest: false, sourceLocale };
  }

  let needsRequest = false;
  const translated = new Map<string, string>();
  for (const part of parts) {
    const hash = await sha256Hex(part.text);
    const row = ownRows.find(
      (item) => item.fieldPath === part.fieldPath && item.locale === viewerLocale,
    );
    if (row && row.sourceHash === hash) {
      translated.set(part.fieldPath, row.translatedText);
    } else {
      needsRequest = true;
    }
  }

  const hasTranslation = parts.some((part) => translated.has(part.fieldPath));
  return {
    translation: hasTranslation
      ? {
          sourceLocale,
          label: translated.get("label") ?? field.label ?? "",
          description: field.description
            ? translated.get("description") ?? field.description
            : null,
          placeholder: field.placeholder
            ? translated.get("placeholder") ?? field.placeholder
            : null,
          optionLabels: options.map(
            (option, index) => translated.get(optionLabelPath(index)) ?? option,
          ),
        }
      : null,
    needsRequest,
    sourceLocale,
  };
}
