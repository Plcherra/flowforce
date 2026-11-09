"use client";

import { useTranslation } from "react-i18next";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { FormSubmissionData } from "@/types/api";
import type { FormFieldContentTranslation } from "@/features/forms/formFieldContent";
import type { FormFieldDataLocal } from "../types/formFill";
import { FormFieldRenderer } from "./wizard/FormFieldRenderer";
import { FlagIssueControls } from "./FlagIssueControls";
import { HandoverNotesField } from "./HandoverNotesField";

export function FormFillList({
  title,
  description,
  fields,
  form,
  formulaData,
  translations,
  flaggedIds,
  onToggleFlag,
  handoverNote,
  onHandoverNote,
  makeHandoverTask,
  onMakeHandoverTask,
  canMakeHandoverTask,
  onExport,
}: {
  title: string;
  description?: string | null;
  fields: FormFieldDataLocal[];
  form: UseFormReturn<FormSubmissionData>;
  formulaData: Record<string, unknown>;
  translations: Map<string, FormFieldContentTranslation>;
  flaggedIds: string[];
  onToggleFlag: (fieldId: string, flagged: boolean) => void;
  handoverNote: string;
  onHandoverNote: (value: string) => void;
  makeHandoverTask: boolean;
  onMakeHandoverTask: (value: boolean) => void;
  canMakeHandoverTask: boolean;
  onExport: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6" data-testid="form-fill-list">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {fields.map((field) => (
        <FormFieldRenderer
          key={field.id}
          field={field}
          form={form as UseFormReturn<Record<string, unknown>>}
          formulaData={formulaData}
          translation={translations.get(field.id) ?? null}
        />
      ))}
      <FlagIssueControls fields={fields} flaggedIds={flaggedIds} onToggle={onToggleFlag} />
      <HandoverNotesField
        note={handoverNote}
        onNoteChange={onHandoverNote}
        makeTask={makeHandoverTask}
        onMakeTaskChange={onMakeHandoverTask}
        canMakeTask={canMakeHandoverTask}
      />
      <Button type="button" variant="outline" onClick={onExport}>
        {t("forms.downloadPdf")}
      </Button>
    </div>
  );
}
