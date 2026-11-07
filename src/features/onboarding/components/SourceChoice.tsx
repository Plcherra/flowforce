import { useTranslation } from "react-i18next";
import type { OrgSource } from "@/features/onboarding/utils/orgTemplates";

export function SourceChoice({
  source,
  onSource,
  name = "org-source",
}: {
  source: OrgSource;
  onSource: (source: OrgSource) => void;
  name?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("onboarding.org.sourceLabel")}>
      {(
        [
          ["template", "onboarding.org.useTemplate"],
          ["scratch", "onboarding.org.startScratch"],
        ] as const
      ).map(([id, key]) => (
        <label
          key={id}
          className="flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <input
            type="radio"
            name={name}
            data-testid={`${name}-${id}`}
            checked={source === id}
            onChange={() => onSource(id)}
          />
          {t(key)}
        </label>
      ))}
    </div>
  );
}
