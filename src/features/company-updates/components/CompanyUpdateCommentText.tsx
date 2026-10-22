import { TranslatedRecord } from "@/features/i18n/TranslatedRecord";
import type { UpdateComment } from "@/types/companyUpdates";

export function CompanyUpdateCommentText({
  comment,
  className = "text-xs leading-relaxed",
}: {
  comment: UpdateComment;
  className?: string;
}) {
  const translated = comment.contentTranslation;
  return (
    <TranslatedRecord
      sourceLocale={translated?.sourceLocale ?? null}
      fields={[
        {
          id: "content",
          as: "p",
          className,
          original: comment.content,
          translated: translated?.content ?? comment.content,
        },
      ]}
    />
  );
}
