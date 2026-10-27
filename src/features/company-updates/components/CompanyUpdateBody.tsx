import { plainUpdateText } from "@/features/company-updates/companyUpdateAccess";
import { TranslatedRecord } from "@/features/i18n/TranslatedRecord";
import type { CompanyUpdate } from "@/types/companyUpdates";

export function CompanyUpdateBody({
  update,
  variant,
}: {
  update: CompanyUpdate;
  variant: "feed" | "compact";
}) {
  const translated = update.contentTranslation;
  const rich = update.richContent;
  const titleClass =
    variant === "feed"
      ? "text-lg font-bold mb-2 leading-tight"
      : "font-semibold text-sm mb-1 line-clamp-2";
  const bodyClass =
    variant === "feed"
      ? "text-foreground leading-relaxed text-sm"
      : "text-xs text-muted-foreground line-clamp-3";
  const fields = [
    {
      id: "title",
      as: variant === "feed" ? ("h2" as const) : ("h3" as const),
      className: titleClass,
      original: update.title,
      translated: translated?.title ?? update.title,
    },
    ...(variant === "feed" && rich
      ? [
          {
            id: "rich",
            html: true,
            className: "prose prose-sm max-w-none dark:prose-invert",
            original: rich,
            translated: translated?.richContent ?? rich,
          },
        ]
      : [
          {
            id: "body",
            as: "p" as const,
            className: bodyClass,
            original: plainUpdateText(update.body),
            translated: plainUpdateText(translated?.body ?? update.body),
          },
        ]),
  ];

  return (
    <TranslatedRecord
      sourceLocale={translated?.sourceLocale ?? null}
      fields={fields}
    />
  );
}
