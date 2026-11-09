"use client";

import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import type { FormSubmissionData } from "@/types/api";
import type { FormFieldDataLocal } from "../types/formFill";
import { FormFillList } from "./FormFillList";
import { FormSubmissionsEmpty } from "./FormSubmissionsEmpty";

function sampleField(
  partial: Pick<FormFieldDataLocal, "id" | "label" | "field_type" | "field_order"> &
    Partial<FormFieldDataLocal>,
): FormFieldDataLocal {
  return {
    company_id: "preview",
    created_at: null,
    dependent_fields: null,
    description: null,
    form_id: "preview",
    formula_expression: null,
    is_required: false,
    max_value: null,
    media_config: null,
    min_value: null,
    options: null,
    placeholder: null,
    rating_config: null,
    scan_config: null,
    step_value: null,
    updated_at: null,
    validation_rules: null,
    ...partial,
  };
}

function previewFields(t: (key: string) => string): FormFieldDataLocal[] {
  return [
    sampleField({
      id: "closer",
      label: t("forms.previewCloserLabel"),
      field_type: "text",
      field_order: 1,
      is_required: true,
      placeholder: t("forms.previewCloserPlaceholder"),
    }),
    sampleField({
      id: "machine",
      label: t("forms.previewMachineLabel"),
      field_type: "yes_no",
      field_order: 2,
      is_required: true,
    }),
    sampleField({
      id: "notes",
      label: t("forms.previewNotesLabel"),
      description: t("forms.previewNotesDescription"),
      field_type: "textarea",
      field_order: 3,
    }),
  ];
}

export function FormsPreviewScreen() {
  const screen = useSearchParams().get("screen") ?? "fill";
  const mode = screen === "empty" || screen === "error" ? screen : "fill";
  return <FormsFlowPreview screen={mode} />;
}

export function FormsFlowPreview({ screen }: { screen: "fill" | "empty" | "error" }) {
  const { t } = useTranslation();
  const fields = previewFields(t);
  const form = useForm<FormSubmissionData>({
    defaultValues: { closer: "", machine: "", notes: "" },
  });

  if (screen === "empty") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <FormSubmissionsEmpty onFill={() => undefined} />
      </div>
    );
  }

  if (screen === "error") {
    return (
      <p className="px-4 py-6 text-sm text-destructive" data-testid="form-submissions-error">
        {t("forms.unableToLoadSubmissions")}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Form {...form}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <FormFillList
            title={t("forms.fillFormTitle")}
            description={t("forms.fillFormHelp")}
            fields={fields}
            form={form}
            formulaData={{}}
            translations={new Map()}
            flaggedIds={[]}
            onToggleFlag={() => undefined}
            handoverNote=""
            onHandoverNote={() => undefined}
            makeHandoverTask={false}
            onMakeHandoverTask={() => undefined}
            canMakeHandoverTask={false}
            onExport={() => undefined}
          />
        </form>
      </Form>
    </div>
  );
}
