import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormAdvancedTools } from "@/features/forms/components/builder/FormAdvancedTools";
import { editorFieldTypeOptions } from "@/features/forms/utils/formFieldCatalog";
import { useFormSchemaStore } from "@/stores/useFormSchemaStore";
import type { FormFieldType } from "@/types/forms";
import { cn } from "@/lib/utils";

const PRIMARY: FormFieldType[] = [
  "checkbox",
  "text",
  "number",
  "select",
  "image_upload",
  "signature",
];

const OPTION_TYPES = new Set<FormFieldType>(["select", "radio", "checkbox"]);

function typeLabelKey(type: string): string {
  if (type === "number") return "forms.questionNumber";
  if (type === "image_upload") return "forms.questionPhoto";
  return editorFieldTypeOptions.find((item) => item.value === type)?.labelKey ?? "forms.text";
}

export function FormQuestionsStep() {
  const { t } = useTranslation();
  const schema = useFormSchemaStore((state) => state.schema);
  const addField = useFormSchemaStore((state) => state.addField);
  const updateField = useFormSchemaStore((state) => state.updateField);
  const removeField = useFormSchemaStore((state) => state.removeField);
  const reorderField = useFormSchemaStore((state) => state.reorderField);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const dragFrom = useRef<{ sectionId: string; index: number } | null>(null);

  if (!schema) {
    return (
      <p className="text-sm text-muted-foreground">{t("forms.loadAFormSchemaToStartEditing")}</p>
    );
  }

  const rows = schema.sections.flatMap((section) =>
    section.fields.map((field, index) => ({ section, field, index })),
  );
  const sectionId = schema.sections[0]?.id ?? "";
  const extraTypes = editorFieldTypeOptions
    .map((item) => item.value)
    .filter((type) => !PRIMARY.includes(type));

  const addQuestion = (type: FormFieldType) => {
    if (!sectionId) return;
    addField(sectionId, {
      type,
      label: t("forms.newField"),
      options: OPTION_TYPES.has(type) ? [t("forms.option1")] : [],
    });
    setPickerOpen(false);
    setMore(false);
  };

  return (
    <section className="mx-auto w-full max-w-xl space-y-4" data-testid="form-builder-step-questions">
      <h2 className="text-xl font-semibold">{t("forms.builderQuestions")}</h2>
      {pickerOpen ? (
        <div className="space-y-3" data-testid="form-question-picker">
          <h3 className="text-base font-medium">{t("forms.questionPickerTitle")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {PRIMARY.map((type) => (
              <Button
                key={type}
                type="button"
                variant="outline"
                className="min-h-11"
                data-testid={`form-question-type-${type}`}
                onClick={() => addQuestion(type)}
              >
                {t(typeLabelKey(type))}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            data-testid="form-question-more"
            onClick={() => setMore((value) => !value)}
          >
            {t("forms.moreQuestions")}
          </Button>
          {more ? (
            <div className="grid grid-cols-2 gap-2">
              {extraTypes.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  data-testid={`form-question-type-${type}`}
                  onClick={() => addQuestion(type)}
                >
                  {t(typeLabelKey(type))}
                </Button>
              ))}
            </div>
          ) : null}
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setPickerOpen(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      ) : (
        <>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center" data-testid="form-questions-empty">
              <Button
                type="button"
                className="min-h-11"
                data-testid="form-add-question"
                onClick={() => setPickerOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("forms.addFirstQuestion")}
              </Button>
            </div>
          ) : (
            <ul className="space-y-2" data-testid="form-question-list">
              {rows.map(({ section, field, index }) => (
                <li
                  key={field.id}
                  className="space-y-2 rounded-xl border bg-background p-3"
                  data-testid={`form-question-${field.id}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const from = dragFrom.current;
                    dragFrom.current = null;
                    if (!from || from.sectionId !== section.id) return;
                    reorderField(section.id, from.index, index);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground"
                      draggable
                      aria-label={t("forms.drag")}
                      onDragStart={(event) => {
                        dragFrom.current = { sectionId: section.id, index };
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", field.id);
                      }}
                    >
                      <GripVertical className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <Input
                      className="min-h-11"
                      value={field.label}
                      aria-label={t("forms.fieldLabel")}
                      onChange={(event) =>
                        updateField(section.id, field.id, { label: event.target.value })
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 shrink-0"
                      disabled={index === 0}
                      aria-label={t("forms.moveQuestionUp")}
                      onClick={() => reorderField(section.id, index, index - 1)}
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 shrink-0"
                      disabled={index === section.fields.length - 1}
                      aria-label={t("forms.moveQuestionDown")}
                      onClick={() => reorderField(section.id, index, index + 1)}
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 pl-1">
                    <span className="text-xs text-muted-foreground">{t(typeLabelKey(field.type))}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <Switch
                          checked={Boolean(field.required)}
                          aria-label={t("forms.required")}
                          onCheckedChange={(checked) =>
                            updateField(section.id, field.id, { required: checked })
                          }
                        />
                        {t("forms.required")}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        className="min-h-11 text-destructive"
                        onClick={() => removeField(section.id, field.id)}
                      >
                        {t("forms.removeQuestion")}
                      </Button>
                    </div>
                  </div>
                  {OPTION_TYPES.has(field.type) ? (
                    <Textarea
                      value={(field.options ?? []).join("\n")}
                      aria-label={t("forms.optionsOnePerLine")}
                      placeholder={t("forms.optionsOnePerLine")}
                      rows={3}
                      onChange={(event) =>
                        updateField(section.id, field.id, {
                          options: event.target.value
                            .split("\n")
                            .map((option) => option.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {rows.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              data-testid="form-add-question"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("forms.addQuestion")}
            </Button>
          ) : null}
        </>
      )}
      <label
        className={cn(
          "flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3",
          advanced && "border-primary",
        )}
      >
        <span className="text-sm font-medium">{t("forms.advanced")}</span>
        <Switch
          checked={advanced}
          data-testid="form-questions-advanced"
          aria-label={t("forms.advanced")}
          onCheckedChange={setAdvanced}
        />
      </label>
      {advanced ? <FormAdvancedTools /> : null}
    </section>
  );
}
