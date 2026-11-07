import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FormBasicsStep({
  title,
  description,
  onTitle,
  onDescription,
}: {
  title: string;
  description: string;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className="mx-auto w-full max-w-xl space-y-5" data-testid="form-builder-step-basics">
      <h2 className="text-xl font-semibold">{t("forms.builderBasics")}</h2>
      <div className="space-y-1.5">
        <Label htmlFor="form-builder-title">{t("forms.formTitle")}</Label>
        <Input
          id="form-builder-title"
          className="min-h-11"
          value={title}
          onChange={(event) => onTitle(event.target.value)}
          placeholder={t("forms.enterFormTitle")}
          aria-label={t("forms.formTitle")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="form-builder-description">{t("tasks.description")}</Label>
        <Textarea
          id="form-builder-description"
          value={description}
          onChange={(event) => onDescription(event.target.value)}
          placeholder={t("forms.describeThePurposeOfThisForm")}
          rows={4}
          aria-label={t("forms.formDescription")}
        />
      </div>
    </section>
  );
}
