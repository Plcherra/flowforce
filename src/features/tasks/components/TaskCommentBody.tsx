import { TranslatedRecord } from "@/features/i18n/TranslatedRecord";

import type { TaskCommentTranslation } from "../taskCommentContent";

export function TaskCommentBody({
  comment,
  translation,
}: {
  comment: string;
  translation: TaskCommentTranslation | null;
}) {
  return (
    <TranslatedRecord
      sourceLocale={translation?.sourceLocale ?? null}
      fields={[
        {
          id: "comment",
          as: "p",
          className: "text-sm",
          original: comment,
          translated: translation?.comment ?? comment,
        },
      ]}
    />
  );
}
