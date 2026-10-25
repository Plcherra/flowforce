import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForms, type FormFieldRow } from "@/features/forms/hooks/useForms";
import { deleteFormRow, updateFormRow } from "@/features/forms/repositories/formsRepository";
import { canKeepForm, shouldDiscardEmptyDraft } from "@/features/forms/utils/formLifecycle";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useFormSchemaStore, useFormSchema, type FormSchema } from "@/stores/useFormSchemaStore";
import { type FieldTemplate } from "@/features/forms/components/editor/FormFieldLibrary";
import { FormBuilderWorkspace } from "@/features/forms/components/editor/FormBuilderWorkspace";
import type { FormField } from "@/types/forms";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ui/error-boundary";
import { FormsErrorFallback } from "@/components/ui/feature-error-fallbacks";
import { FormShiftLinkEditor } from "@/features/forms/components/FormShiftLinkEditor";

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  initialTitle?: string;
  initialDescription?: string;
  discardIfEmpty?: boolean;
}

const randomId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

export default function FormBuilderDialog({
  open,
  onOpenChange,
  formId,
  initialTitle = "New Form",
  initialDescription = "",
  discardIfEmpty = false,
}: FormBuilderDialogProps) {
  const { t, i18n } = useTranslation();
  const { getFormFields, saveFormFields } = useForms();
  const { profile } = useProfile();
  const { toast } = useToast();

  const schema = useFormSchema() as FormSchema | null;
  const activeSectionId = useFormSchemaStore((state) => state.activeSectionId);
  const loadSchema = useFormSchemaStore((state) => state.loadSchema);
  const addField = useFormSchemaStore((state) => state.addField);
  const resetSchema = useFormSchemaStore((state) => state.reset);

  const [formTitle, setFormTitle] = useState(initialTitle);
  const [formDescription, setFormDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedFieldCountRef = useRef(0);

  useEffect(() => {
    if (!open) {
      resetSchema();
    }
  }, [open, resetSchema]);

  useEffect(() => {
    setFormTitle(initialTitle);
    setFormDescription(initialDescription);
  }, [initialTitle, initialDescription]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const { data, error } = await getFormFields(formId);
      if (cancelled) return;
      if (error) {
        toast({
          title: "Error",
          description: "Unable to load form fields",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as FormFieldRow[]).sort(
        (a, b) => (a.field_order ?? 0) - (b.field_order ?? 0),
      );

      savedFieldCountRef.current = rows.length;
      loadSchema({
        id: formId,
        title: initialTitle ?? "Untitled form",
        sections: [
          {
            id: randomId(),
            title: "Main section",
            fields: rows.map((row) => ({
              id: row.id ?? randomId(),
              type: (row.field_type ?? "text") as FormField["type"],
              label: row.label ?? "Untitled field",
              description: row.description ?? undefined,
              placeholder: row.placeholder ?? undefined,
              required: Boolean(row.is_required),
              options: Array.isArray(row.options)
                ? row.options.map((option) => String(option))
                : [],
              validation:
                (row.validation_rules as FormField["validation"]) ?? undefined,
              min_value: row.min_value ?? undefined,
              max_value: row.max_value ?? undefined,
              step_value: row.step_value ?? undefined,
              formula_expression: row.formula_expression ?? undefined,
              dependent_fields: Array.isArray(row.dependent_fields)
                ? (row.dependent_fields as string[])
                : undefined,
              rating_config:
                (row.rating_config as FormField["rating_config"]) ?? undefined,
              scan_config:
                (row.scan_config as FormField["scan_config"]) ?? undefined,
              media_config:
                (row.media_config as FormField["media_config"]) ?? undefined,
              content: undefined,
            })),
          },
        ],
        formulas: [],
        validations: undefined,
        metadata: {},
      });
      setFormTitle(initialTitle ?? "Untitled form");
      setFormDescription(initialDescription ?? "");
      setLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    formId,
    getFormFields,
    initialTitle,
    initialDescription,
    loadSchema,
    toast,
  ]);

  const handleAddTemplate = (template: FieldTemplate) => {
    if (!schema || !schema.sections.length) return;
    const targetSectionId = activeSectionId ?? schema.sections[0].id;
    addField(targetSectionId, {
      type: template.type,
      label: template.label,
      options:
        template.type === "select" ||
        template.type === "checkbox" ||
        template.type === "radio"
          ? ["Option 1"]
          : [],
    });
  };

  const requestClose = (nextOpen: boolean) => {
    if (nextOpen) return;
    void (async () => {
      const companyId = profile?.companyId ?? profile?.company_id ?? null;
      if (
        companyId &&
        shouldDiscardEmptyDraft({
          discardIfEmpty,
          savedFieldCount: savedFieldCountRef.current,
        })
      ) {
        await deleteFormRow(companyId, formId).catch(() => undefined);
      }
      onOpenChange(false);
    })();
  };

  const handleSave = async (mode: "draft" | "published" = "draft") => {
    const current = useFormSchemaStore.getState().schema;
    if (!current) return;

    if (!formTitle.trim()) {
      toast({
        title: "Form title required",
        description: "Please provide a title before saving.",
        variant: "destructive",
      });
      return;
    }

    const fields = current.sections.flatMap((section) => section.fields);
    if (!canKeepForm(fields.length)) {
      toast({
        title: t(mode === "published" ? "forms.addAFieldBeforePublish" : "forms.addAFieldBeforeSave"),
        variant: "destructive",
      });
      return;
    }
    if (fields.some((field) => !field.label.trim())) {
      toast({
        title: "Field label required",
        description: "All fields must have a label.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const companyId = profile?.companyId ?? profile?.company_id ?? null;
      if (!companyId) {
        toast({
          title: "Save failed",
          description: "Unable to update form details.",
          variant: "destructive",
        });
        return;
      }
      const updated = await updateFormRow(
        companyId,
        formId,
        {
          title: formTitle,
          description: formDescription || null,
        },
        appLanguageFromTag(i18n.resolvedLanguage || i18n.language),
      );

      if (!updated) {
        toast({
          title: "Save failed",
          description: "Unable to update form details.",
          variant: "destructive",
        });
        return;
      }

      type SaveField = Omit<
        FormFieldRow,
        "id" | "form_id" | "created_at" | "updated_at"
      >;
      const payload: SaveField[] = fields.map((field, index) => ({
        field_order: index + 1,
        field_type: field.type,
        label: field.label,
        placeholder: field.placeholder ?? null,
        description: field.description ?? null,
        is_required: field.required ?? false,
        options:
          field.options && field.options.length > 0 ? field.options : null,
        validation_rules: field.validation ?? null,
        min_value: field.min_value ?? null,
        max_value: field.max_value ?? null,
        step_value: field.step_value ?? null,
        formula_expression: field.formula_expression ?? null,
        dependent_fields: field.dependent_fields ?? null,
        rating_config: field.rating_config ?? null,
        scan_config: field.scan_config ?? null,
        media_config: field.media_config ? (field.media_config as unknown as Record<string, unknown>) : null,
      }));

      const { error } = await saveFormFields(formId, payload);
      if (error) {
        toast({
          title: "Save failed",
          description: "Unable to save form changes.",
          variant: "destructive",
        });
        return;
      }

      if (mode === "published") {
        const published = await updateFormRow(companyId, formId, { status: "published" });
        if (!published) {
          toast({
            title: t("forms.addAFieldBeforePublish"),
            variant: "destructive",
          });
          return;
        }
      }

      savedFieldCountRef.current = fields.length;
      toast({
        title: mode === "published" ? t("forms.formPublished") : t("forms.formSaved"),
        description: mode === "published" ? t("forms.formPublishedHelp") : t("forms.formSavedHelp"),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const sectionCount = schema?.sections.length ?? 0;
  const fieldCount =
    schema?.sections.reduce((sum, section) => sum + section.fields.length, 0) ??
    0;

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="inset-0 left-0 top-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-none p-0 shadow-none sm:rounded-none">
        <DialogHeader className="max-h-[40vh] shrink-0 space-y-1 overflow-y-auto border-b px-4 py-3 pr-12">
          <DialogTitle className="text-lg font-semibold">
            {t("forms.formEditor")}</DialogTitle>
          <DialogDescription>
            {t("forms.composeFieldsConfigureOptionsAndPreviewTheLiveFormExperience")}</DialogDescription>
          <div className="flex flex-wrap items-center gap-4 pt-3 text-xs text-muted-foreground">
            <div>{t("forms.sectionCount", { count: sectionCount })}</div>
            <div>{t("forms.fieldCount", { count: fieldCount })}</div>
          </div>
          <div className="grid gap-3 pt-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("forms.formTitle")}</label>
              <Input
                value={formTitle}
                onChange={(event) => setFormTitle(event.target.value)}
                placeholder={t("forms.enterFormTitle")}
                aria-label={t("forms.formTitle")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("tasks.description")}</label>
              <Textarea
                value={formDescription}
                onChange={(event) => setFormDescription(event.target.value)}
                placeholder={t("forms.describeThePurposeOfThisForm")}
                rows={2}
                aria-label={t("forms.formDescription")}
              />
            </div>
          </div>
          <FormShiftLinkEditor formId={formId} />
        </DialogHeader>

        <ErrorBoundary fallbackRender={FormsErrorFallback}>
          <div className="relative flex min-h-0 flex-1 flex-col">
            <FormBuilderWorkspace onAddField={handleAddTemplate} />
            {loading && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  {t("forms.loadingFormFields")}</div>
              </div>
            )}
          </div>
        </ErrorBoundary>

        <div className="flex flex-shrink-0 items-center justify-between border-t bg-muted/40 px-6 py-4">
          <div className="flex flex-col text-xs text-muted-foreground">
            <span>{formTitle}</span>
            <span>
              {loading
                ? "Loading form content…"
                : "Live preview updates automatically."}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => requestClose(false)}>
              {t("common.cancel")}</Button>
            <Button variant="outline" onClick={() => void handleSave("draft")} disabled={loading || isSaving}>
              {t("forms.saveChanges")}</Button>
            <Button onClick={() => void handleSave("published")} disabled={loading || isSaving}>
              {isSaving && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              {t("forms.publishForm")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
