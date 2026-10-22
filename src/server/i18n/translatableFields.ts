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
  form_submissions: {},
  tasks: {
    title: {},
    description: {},
  },
  task_comments: {
    comment: {},
  },
  reminders: {
    title: {},
    description: {},
  },
  custom_reports: {
    name: {},
    description: {},
  },
  employee_report: {
    notes: {},
  },
  schedules: {
    title: {},
    notes: {},
  },
  time_off_requests: {
    reason: {},
    notes: {},
  },
  announcements: {
    title: {},
    content: {},
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
  if (
    sourceTable === "form_submissions" &&
    /^submission_data\.[A-Za-z0-9_-]+$/.test(fieldPath)
  ) {
    return {};
  }
  return null;
}
