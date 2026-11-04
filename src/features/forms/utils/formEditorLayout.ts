export type FormSectionLayout = {
  title: string;
  fieldCount: number;
};

export type FormEditorLayout = {
  ownerOnly: boolean;
  sections: FormSectionLayout[];
};

const SECTIONS_KEY = "formSections";
const OWNER_KEY = "ownerOnly";

function settingsRecord(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }
  return { ...(settings as Record<string, unknown>) };
}

export function readFormEditorLayout(settings: unknown): FormEditorLayout {
  const record = settingsRecord(settings);
  const raw = record[SECTIONS_KEY];
  const sections: FormSectionLayout[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const title = (item as { title?: unknown }).title;
      const fieldCount = (item as { fieldCount?: unknown }).fieldCount;
      if (typeof title !== "string" || !title.trim()) continue;
      if (typeof fieldCount !== "number" || !Number.isInteger(fieldCount) || fieldCount < 1) {
        continue;
      }
      sections.push({ title, fieldCount });
    }
  }
  return {
    ownerOnly: record[OWNER_KEY] === true,
    sections,
  };
}

export function mergeFormEditorLayout(
  settings: unknown,
  layout: FormEditorLayout,
): Record<string, unknown> {
  return {
    ...settingsRecord(settings),
    [OWNER_KEY]: layout.ownerOnly,
    [SECTIONS_KEY]: layout.sections,
  };
}

export function splitFieldsByLayout<T>(
  fields: T[],
  sections: FormSectionLayout[],
): Array<{ title: string; fields: T[] }> {
  const total = sections.reduce((sum, section) => sum + section.fieldCount, 0);
  if (!sections.length || total !== fields.length) {
    return [{ title: "", fields }];
  }
  let index = 0;
  return sections.map((section) => {
    const slice = fields.slice(index, index + section.fieldCount);
    index += section.fieldCount;
    return { title: section.title, fields: slice };
  });
}
