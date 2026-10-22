export interface TranslatableFieldRule {
  richHtml?: boolean;
}

export const TRANSLATABLE_FIELDS: Record<
  string,
  Record<string, TranslatableFieldRule>
> = {
  company_updates: {
    title: {},
    body: {},
    rich_content: { richHtml: true },
  },
  company_update_comments: {
    content: {},
  },
  forms: {
    title: {},
    description: {},
  },
  form_fields: {
    label: {},
    description: {},
    placeholder: {},
  },
};

export function translatableFieldRule(
  sourceTable: string,
  fieldPath: string,
): TranslatableFieldRule | null {
  const table = TRANSLATABLE_FIELDS[sourceTable];
  if (!table) return null;
  if (table[fieldPath]) return table[fieldPath];
  if (sourceTable === "form_fields" && /^options\.\d+$/.test(fieldPath)) {
    return {};
  }
  return null;
}
