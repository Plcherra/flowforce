import { useTranslation } from "react-i18next";
import { FormLivePreview } from "@/features/forms/components/editor/FormLivePreview";

export function FormPreviewStep() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4" data-testid="form-builder-step-preview">
      <h2 className="text-xl font-semibold">{t("forms.builderPreview")}</h2>
      <div className="flex h-[32rem] flex-col overflow-hidden rounded-xl border bg-background">
        <FormLivePreview compact />
      </div>
    </section>
  );
}
