import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForms, type FormFieldRow } from "@/features/forms/hooks/useForms";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/public-types";
import { deleteFormRow, updateFormRow } from "@/features/forms/repositories/formsRepository";
import { canKeepForm, shouldDiscardEmptyDraft } from "@/features/forms/utils/formLifecycle";
import {
  mergeFormEditorLayout,
  readFormEditorLayout,
  splitFieldsByLayout,
} from "@/features/forms/utils/formEditorLayout";
import { appLanguageFromTag } from "@/i18n/resolveLanguage";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useFormSchemaStore, useFormSchema, type FormSchema } from "@/stores/useFormSchemaStore";
import { FormBasicsStep } from "@/features/forms/components/builder/FormBasicsStep";
import { FormQuestionsStep } from "@/features/forms/components/builder/FormQuestionsStep";
import { FormWhoWhenStep } from "@/features/forms/components/builder/FormWhoWhenStep";
import { FormPreviewStep } from "@/features/forms/components/builder/FormPreviewStep";
import type { FormField } from "@/types/forms";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "@/components/ui/error-boundary";
import { FormsErrorFallback } from "@/components/ui/feature-error-fallbacks";
import { useTaskFormOptions } from "@/hooks/useTaskFormOptions";
import {
  distributionForEditor,
  distributionProblem,
  withFormDistribution,
  type FormDistribution,
} from "@/features/forms/utils/formDistribution";
import { cn } from "@/lib/utils";

interface FormBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  initialTitle?: string;
  initialDescription?: string;
  initialSettings?: unknown;
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
  initialTitle,
  initialDescription = "",
  initialSettings,
  discardIfEmpty = false,
}: FormBuilderDialogProps) {
  const { t, i18n } = useTranslation();
  const { getFormFields, saveFormFields } = useForms();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { toast } = useToast();

  const schema = useFormSchema() as FormSchema | null;
  const loadSchema = useFormSchemaStore((state) => state.loadSchema);
  const resetSchema = useFormSchemaStore((state) => state.reset);
  const setSchemaTitle = useFormSchemaStore((state) => state.setTitle);

  const [step, setStep] = useState(0);
  const [formTitle, setFormTitle] = useState(initialTitle ?? "");
  const [formDescription, setFormDescription] = useState(initialDescription);
  const [distribution, setDistribution] = useState<FormDistribution>(() =>
    distributionForEditor(initialSettings),
  );
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedFieldCountRef = useRef(0);
  const distributionDirtyRef = useRef(false);
  const audienceOptions = useTaskFormOptions(open);

  useEffect(() => {
    if (!open) {
      resetSchema();
    }
  }, [open, resetSchema]);

  useEffect(() => {
    setFormTitle(initialTitle ?? "");
    setFormDescription(initialDescription);
  }, [initialTitle, initialDescription]);

  useEffect(() => {
    if (!open) {
      distributionDirtyRef.current = false;
      setStep(0);
      return;
    }
    if (distributionDirtyRef.current) return;
    setDistribution(distributionForEditor(initialSettings));
  }, [open, formId, initialSettings]);

  useEffect(() => {
    if (!schema) return;
    setSchemaTitle(formTitle);
  }, [formTitle, schema, setSchemaTitle]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const { data, error } = await getFormFields(formId);
      if (cancelled) return;
      if (error) {
        toast({
          title: t("forms.errorTitle"),
          description: t("forms.unableToLoadFields"),
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const rows = ((data ?? []) as FormFieldRow[]).sort(
        (a, b) => (a.field_order ?? 0) - (b.field_order ?? 0),
      );

      savedFieldCountRef.current = rows.length;
      const layout = readFormEditorLayout(initialSettings);
      const mappedFields = rows.map((row) => ({
        id: row.id ?? randomId(),
        type: (row.field_type ?? "text") as FormField["type"],
        label: row.label ?? t("forms.untitledField"),
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
      }));
      const groups = splitFieldsByLayout(mappedFields, layout.sections);
      loadSchema({
        id: formId,
        title: initialTitle ?? t("forms.untitledForm"),
        sections: groups.map((group) => ({
          id: randomId(),
          title: group.title || (groups.length > 1 ? t("forms.mainSection") : ""),
          fields: group.fields,
        })),
        formulas: mappedFields
          .filter((field) => field.formula_expression)
          .map((field) => ({
            id: field.id,
            name: field.label,
            expression: field.formula_expression ?? "",
            targetFieldId: field.id,
          })),
        validations: undefined,
        metadata: { ownerOnly: layout.ownerOnly },
      });
      setFormTitle(initialTitle ?? t("forms.untitledForm"));
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
    initialSettings,
    loadSchema,
    t,
    toast,
  ]);

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
        title: t("forms.formTitleRequired"),
        description: t("forms.formTitleRequiredHelp"),
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
        title: t("forms.fieldLabelRequired"),
        description: t("forms.fieldLabelRequiredHelp"),
        variant: "destructive",
      });
      return;
    }

    const distributionIssue = distributionProblem(distribution);
    if (distributionIssue) {
      toast({
        title: t("forms.saveFailed"),
        description: t(
          distributionIssue === "due"
            ? "forms.dueBeforeShow"
            : distributionIssue === "complete"
              ? "forms.completeByOrder"
              : "forms.distributionIncomplete",
        ),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const companyId = profile?.companyId ?? profile?.company_id ?? null;
      if (!companyId) {
        toast({
          title: t("forms.saveFailed"),
          description: t("forms.unableToUpdateForm"),
          variant: "destructive",
        });
        return;
      }
      const { data: currentRow, error: settingsError } = await supabase
        .from("forms")
        .select("settings")
        .eq("id", formId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (settingsError) {
        toast({
          title: t("forms.saveFailed"),
          description: t("forms.unableToUpdateForm"),
          variant: "destructive",
        });
        return;
      }
      const settings = withFormDistribution(
        mergeFormEditorLayout(currentRow?.settings, {
          ownerOnly: Boolean(current.metadata?.ownerOnly),
          sections: current.sections
            .filter((section) => section.fields.length > 0)
            .map((section) => ({
              title: section.title,
              fieldCount: section.fields.length,
            })),
        }),
        distribution,
      );
      const updated = await updateFormRow(
        companyId,
        formId,
        {
          title: formTitle,
          description: formDescription || null,
          settings: settings as Json,
        },
        appLanguageFromTag(i18n.resolvedLanguage || i18n.language),
      );

      if (!updated) {
        toast({
          title: t("forms.saveFailed"),
          description: t("forms.unableToUpdateForm"),
          variant: "destructive",
        });
        return;
      }

      type SaveField = Omit<
        FormFieldRow,
        "id" | "form_id" | "created_at" | "updated_at"
      >;
      const formulaByTarget = new Map(
        current.formulas.map((formula) => [formula.targetFieldId, formula.expression]),
      );
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
        formula_expression:
          formulaByTarget.get(field.id) || field.formula_expression || null,
        dependent_fields: field.dependent_fields ?? null,
        rating_config: field.rating_config ?? null,
        scan_config: field.scan_config ?? null,
        media_config: field.media_config ? (field.media_config as unknown as Record<string, unknown>) : null,
      }));

      const { error } = await saveFormFields(formId, payload, { quiet: true });
      if (error) {
        toast({
          title: t("forms.saveFailed"),
          description: t("forms.unableToSaveChanges"),
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
      await queryClient.invalidateQueries({ queryKey: ["form-fields"] });
      toast({
        title: mode === "published" ? t("forms.formPublished") : t("forms.formSaved"),
        description: mode === "published" ? t("forms.formPublishedHelp") : t("forms.formSavedHelp"),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { id: "basics", label: "forms.builderBasics" },
    { id: "questions", label: "forms.builderQuestions" },
    { id: "who", label: "forms.builderWho" },
    { id: "preview", label: "forms.builderPreview" },
  ] as const;

  const showDistributionIssue = () => {
    const issue = distributionProblem(distribution);
    if (!issue) return false;
    toast({
      title: t("forms.saveFailed"),
      description: t(
        issue === "due"
          ? "forms.dueBeforeShow"
          : issue === "complete"
            ? "forms.completeByOrder"
            : "forms.distributionIncomplete",
      ),
      variant: "destructive",
    });
    return true;
  };

  const goNext = () => {
    if (step === 0 && !formTitle.trim()) {
      toast({
        title: t("forms.formTitleRequired"),
        description: t("forms.formTitleRequiredHelp"),
        variant: "destructive",
      });
      return;
    }
    if (step === 2 && showDistributionIssue()) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const roleChoices = audienceOptions.roles.map((role) => ({
    id: role.id,
    label: role.name,
  }));
  const peopleChoices = audienceOptions.assignees.map((person) => ({
    id: person.id,
    label:
      `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() ||
      t("forms.unassigned"),
  }));
  const positionChoices = audienceOptions.positions.map((item) => ({
    id: item.id,
    label: item.name,
  }));
  const departmentChoices = audienceOptions.departments.map((item) => ({
    id: item.id,
    label: item.name,
  }));

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent
        hideClose
        data-testid="form-builder"
        className="inset-0 left-0 top-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-none p-0 shadow-none sm:rounded-none"
      >
        <DialogHeader className="shrink-0 space-y-3 border-b px-4 py-3 pr-12">
          <DialogTitle className="text-lg font-semibold">
            {formTitle.trim() || t("forms.formEditor")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t(steps[step]?.label ?? "forms.formEditor")}
          </DialogDescription>
          <div className="grid grid-cols-4 gap-1" data-testid="form-builder-steps">
            {steps.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-testid={`form-builder-nav-${item.id}`}
                className={cn(
                  "min-h-11 rounded-md px-1 text-xs font-medium sm:text-sm",
                  index === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
                onClick={() => setStep(index)}
              >
                {t(item.label)}
              </button>
            ))}
          </div>
        </DialogHeader>

        <ErrorBoundary fallbackRender={FormsErrorFallback}>
          <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5" data-testid="form-builder-body">
            {step === 0 ? (
              <FormBasicsStep
                title={formTitle}
                description={formDescription}
                onTitle={setFormTitle}
                onDescription={setFormDescription}
              />
            ) : null}
            {step === 1 ? <FormQuestionsStep /> : null}
            {step === 2 ? (
              <FormWhoWhenStep
                distribution={distribution}
                roles={roleChoices}
                people={peopleChoices}
                positions={positionChoices}
                departments={departmentChoices}
                onChange={(next) => {
                  distributionDirtyRef.current = true;
                  setDistribution(next);
                }}
              />
            ) : null}
            {step === 3 ? <FormPreviewStep /> : null}
            {loading ? (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("forms.loadingFormFields")}
                </div>
              </div>
            ) : null}
          </div>
        </ErrorBoundary>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" className="min-h-11" onClick={() => requestClose(false)}>
            {t("common.cancel")}
          </Button>
          {step > 0 ? (
            <Button
              variant="outline"
              className="min-h-11"
              data-testid="form-builder-back"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              {t("forms.builderBack")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => void handleSave("draft")}
            disabled={loading || isSaving}
          >
            {t("forms.saveChanges")}
          </Button>
          {step < steps.length - 1 ? (
            <Button className="min-h-11" data-testid="form-builder-next" onClick={goNext}>
              {t("forms.builderNext")}
            </Button>
          ) : (
            <Button
              className="min-h-11"
              data-testid="form-builder-publish"
              onClick={() => void handleSave("published")}
              disabled={loading || isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {t("forms.publishForm")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
