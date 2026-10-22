import { TranslatedRecord } from "@/features/i18n/TranslatedRecord";

import type { TimeOffTextTranslation } from "../scheduleTextFields";

export function TimeOffCopy({
  reason,
  notes,
  translation,
}: {
  reason?: string | null;
  notes?: string | null;
  translation: TimeOffTextTranslation | null;
}) {
  const fields = [
    reason
      ? {
          id: "reason",
          as: "div" as const,
          original: reason,
          translated: translation?.reason ?? reason,
        }
      : null,
    notes
      ? {
          id: "notes",
          as: "div" as const,
          className: "mt-1",
          original: notes,
          translated: translation?.notes ?? notes,
        }
      : null,
  ].filter((field): field is NonNullable<typeof field> => Boolean(field));

  if (fields.length === 0) return null;

  return (
    <TranslatedRecord
      sourceLocale={translation?.sourceLocale ?? null}
      fields={fields}
    />
  );
}
