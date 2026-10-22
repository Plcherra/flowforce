import { TranslatedRecord } from "@/features/i18n/TranslatedRecord";

import type { EmployeeNoteTranslation } from "@/features/analytics/reportContentFields";

export function EmployeeReportNote({
  notes,
  translation,
}: {
  notes: string;
  translation: EmployeeNoteTranslation | null;
}) {
  return (
    <TranslatedRecord
      sourceLocale={translation?.sourceLocale ?? null}
      fields={[
        {
          id: "notes",
          as: "p",
          className: "mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line",
          original: notes,
          translated: translation?.notes ?? notes,
        },
      ]}
    />
  );
}
