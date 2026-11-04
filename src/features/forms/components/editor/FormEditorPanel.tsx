import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { paneScroller } from "@/features/forms/utils/formsSurface";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormFieldType } from "@/types/forms";
import { editorFieldTypeOptions } from "@/features/forms/utils/formFieldCatalog";
import { useFormSchemaStore } from "@/stores/useFormSchemaStore";
import { cn } from "@/lib/utils";

const randomId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export function FormEditorPanel() {
  const { t } = useTranslation();
  const schema = useFormSchemaStore((state) => state.schema);
  const activeSectionId = useFormSchemaStore((state) => state.activeSectionId);
  const activeFieldId = useFormSchemaStore((state) => state.activeFieldId);

  const setActiveSection = useFormSchemaStore(
    (state) => state.setActiveSection,
  );
  const setActiveField = useFormSchemaStore((state) => state.setActiveField);
  const addSection = useFormSchemaStore((state) => state.addSection);
  const addField = useFormSchemaStore((state) => state.addField);
  const updateField = useFormSchemaStore((state) => state.updateField);
  const removeField = useFormSchemaStore((state) => state.removeField);
  const setMetadata = useFormSchemaStore((state) => state.setMetadata);
  const upsertFormula = useFormSchemaStore((state) => state.upsertFormula);
  const removeFormula = useFormSchemaStore((state) => state.removeFormula);

  const activeSection = useMemo(
    () =>
      schema?.sections.find((section) => section.id === activeSectionId) ??
      schema?.sections[0],
    [schema, activeSectionId],
  );

  const activeField = useMemo(() => {
    if (!activeSection) return undefined;
    return (
      activeSection.fields.find((field) => field.id === activeFieldId) ??
      activeSection.fields[0]
    );
  }, [activeSection, activeFieldId]);

  const metadata = schema?.metadata ?? {};
  const ownerOnly = Boolean(metadata.ownerOnly);
  const formulas = schema?.formulas ?? [];
  const allFields = useMemo(
    () =>
      schema?.sections.flatMap((section) =>
        section.fields.map((field) => ({ id: field.id, label: field.label })),
      ) ?? [],
    [schema],
  );

  const handleAddFormula = () => {
    const targetId = activeField?.id ?? allFields[0]?.id ?? "";
    upsertFormula({
      id: randomId(),
      name: t("forms.fieldFormula"),
      expression: "",
      targetFieldId: targetId,
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const templateJSON = event.dataTransfer.getData(
      "application/form-field-template",
    );
    if (!templateJSON || !schema) return;
    const template = JSON.parse(templateJSON) as {
      type: FormFieldType;
      label: string;
    };
    const sectionId = activeSection?.id ?? schema.sections[0]?.id;
    if (!sectionId) return;
    addField(sectionId, {
      type: template.type,
      label: template.label,
    });
  };

  const handleAddQuickField = (type: FormFieldType) => {
    if (!schema) return;
    const sectionId = activeSection?.id ?? schema.sections[0]?.id;
    if (!sectionId) return;
    addField(sectionId, {
      type,
      label: t("forms.newField"),
    });
  };

  if (!schema) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("forms.loadAFormSchemaToStartEditing")}</div>
    );
  }

  return (
    <div
      className="flex h-full flex-col border-x bg-background"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="sticky top-0 z-10 border-b bg-background/95 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <Select
              value={activeSection?.id}
              onValueChange={(value) => setActiveSection(value)}
            >
              <SelectTrigger className="min-w-[200px]">
                <SelectValue placeholder={t("forms.selectSection")} />
              </SelectTrigger>
              <SelectContent>
                {schema.sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSection(t("forms.untitledSection"))}
            >
              {t("forms.addSection")}</Button>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <label className="flex items-center gap-2">
              <Switch
                checked={ownerOnly}
                onCheckedChange={(checked) =>
                  setMetadata({ ...metadata, ownerOnly: checked })
                }
                aria-label={t("forms.restrictFormToOwner")}
              />
              <span>{t("forms.ownerOnly")}</span>
            </label>
            <span className="hidden md:inline">
              {t("forms.dragAFieldHereOrUseQuickAdd")}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddQuickField("text")}
            >
              {t("forms.text")}</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddQuickField("select")}
            >
              {t("forms.dropdown")}</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleAddQuickField("checkbox")}
            >
              {t("forms.checkbox")}</Button>
          </div>
        </div>
      </div>
      <div className={paneScroller}>
        <div className="space-y-4 p-4">
          {schema.sections.map((section) => (
            <div key={section.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "h-7 text-xs",
                    activeSection?.id === section.id
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {t("forms.focusSection")}</Button>
              </div>
              <div className="space-y-2">
                {section.fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(section.id);
                      setActiveField(field.id);
                    }}
                    className={cn(
                      "w-full rounded-lg border bg-muted/40 p-3 text-left transition hover:border-primary",
                      activeField?.id === field.id
                        ? "border-primary bg-primary/10"
                        : "border-transparent",
                    )}
                  >
                    <p className="text-sm font-medium">
                      {field.label || t("forms.untitledField")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.type}
                    </p>
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addField(section.id, {
                      type: "text",
                      label: t("forms.newField"),
                    })
                  }
                >
                  {t("forms.addField2")}</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {activeSection && activeField && (
        <div className="border-t bg-background p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("forms.fieldLabel")}</label>
              <Input
                value={activeField.label}
                onChange={(event) =>
                  updateField(activeSection.id, activeField.id, {
                    label: event.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("forms.fieldType")}</label>
                <Select
                  value={activeField.type}
                  onValueChange={(value) =>
                    updateField(activeSection.id, activeField.id, {
                      type: value as FormFieldType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editorFieldTypeOptions.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("forms.placeholder")}</label>
                <Input
                  value={activeField.placeholder ?? ""}
                  onChange={(event) =>
                    updateField(activeSection.id, activeField.id, {
                      placeholder: event.target.value,
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{t("forms.required")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("forms.usersMustCompleteThisFieldBeforeSubmitting")}</p>
              </div>
              <Switch
                checked={Boolean(activeField.required)}
                onCheckedChange={(checked) =>
                  updateField(activeSection.id, activeField.id, {
                    required: checked,
                  })
                }
              />
            </div>
            {activeField.type === "formula" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("forms.expression")}
                </label>
                <Textarea
                  value={activeField.formula_expression ?? ""}
                  onChange={(event) => {
                    const expression = event.target.value;
                    updateField(activeSection.id, activeField.id, {
                      formula_expression: expression,
                    });
                    const existing = formulas.find(
                      (formula) => formula.targetFieldId === activeField.id,
                    );
                    if (existing) upsertFormula({ ...existing, expression });
                  }}
                  placeholder={t("forms.eGFieldAFieldB")}
                  rows={2}
                />
              </div>
            )}
            {(activeField.type === "select" ||
              activeField.type === "radio" ||
              activeField.type === "checkbox") && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("forms.optionsOnePerLine")}</label>
                <Textarea
                  value={(activeField.options ?? []).join("\n")}
                  onChange={(event) =>
                    updateField(activeSection.id, activeField.id, {
                      options: event.target.value
                        .split("\n")
                        .map((option) => option.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => {
                  removeField(activeSection.id, activeField.id);
                  setActiveField(null);
                }}
              >
                {t("forms.removeField")}</Button>
            </div>
          </div>
        </div>
      )}
      <div className="border-t bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{t("forms.formulas")}</p>
            <p className="text-xs text-muted-foreground">
              {t("forms.useFormulasToComputeValuesAutomatically")}</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleAddFormula}>
            {t("forms.addFormula")}</Button>
        </div>
        <div className="mt-4 space-y-3">
          {formulas.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {t("forms.noFormulasConfiguredYet")}</p>
          )}
          {formulas.map((formula) => (
            <div
              key={formula.id}
              className="space-y-3 rounded-lg border bg-muted/40 p-3"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("schedule.name")}</label>
                  <Input
                    value={formula.name}
                    onChange={(event) =>
                      upsertFormula({ ...formula, name: event.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    {t("forms.targetField")}</label>
                  <Select
                    value={formula.targetFieldId}
                    onValueChange={(value) =>
                      upsertFormula({ ...formula, targetFieldId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("forms.chooseField")} />
                    </SelectTrigger>
                    <SelectContent>
                      {allFields.map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label || t("forms.untitledField")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("forms.expression")}</label>
                <Textarea
                  value={formula.expression}
                    onChange={(event) => {
                      const expression = event.target.value;
                      upsertFormula({ ...formula, expression });
                      const section = schema?.sections.find((item) =>
                        item.fields.some((field) => field.id === formula.targetFieldId),
                      );
                      if (section) {
                        updateField(section.id, formula.targetFieldId, {
                          formula_expression: expression,
                        });
                      }
                    }}
                  placeholder={t("forms.eGFieldAFieldB")}
                  rows={2}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => removeFormula(formula.id)}
                >
                  {t("forms.remove")}</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FormEditorPanel;
