import { TranslatedRecord } from "@/features/i18n/TranslatedRecord";

import type { MessageTranslation } from "../../messageContent";

export function MessageBody({
  content,
  translation,
  className = "mt-1 text-sm text-foreground",
}: {
  content: string;
  translation: MessageTranslation | null;
  className?: string;
}) {
  return (
    <TranslatedRecord
      sourceLocale={translation?.sourceLocale ?? null}
      fields={[
        {
          id: "content",
          as: "p",
          className,
          original: content,
          translated: translation?.content ?? content,
        },
      ]}
    />
  );
}
