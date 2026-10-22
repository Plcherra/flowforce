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
};

export function translatableFieldRule(
  sourceTable: string,
  fieldPath: string,
): TranslatableFieldRule | null {
  return TRANSLATABLE_FIELDS[sourceTable]?.[fieldPath] ?? null;
}
