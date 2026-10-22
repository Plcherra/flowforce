import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { useForms, type FormWithMeta } from "@/features/forms/hooks/useForms";
import { useFormDefinition } from "@/features/forms/hooks/useFormDefinition";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCan } from "@/hooks/useCan";
import { useTasks } from "@/hooks/useTasks";
import { logger } from "@/utils/logger";
import { FormSubmissionData } from "@/types/api";
import { orderFormFields } from "@/features/forms/components/utils/orderFormFields";
import { FormReviewLayout } from "@/features/forms/components/presentation";
import { exportFormResponseToPdf } from "@/utils/formExport";
import { readFormSourceLocale } from "@/features/forms/formContentFields";
import {
  displayAnswer,
  presentFormField,
  readBuilderOptionLabels,
} from "@/features/forms/formFieldContent";
import { useFormFieldTranslations } from "@/features/forms/hooks/useFormFieldTranslations";
import { groupFieldsByCategory } from "../utils/formFieldHelpers";
import { buildWizardSteps } from "../utils/wizardSteps";
import { buildReviewSections } from "../utils/reviewSections";
import { getDefaultValueForField } from "../utils/formValueFormatters";
import { useFormWizard } from "../hooks/useFormWizard";
import {
  FormFieldRenderer,
  WizardTopBar,
  StepNavigation,
  WizardFooter,
} from "./wizard";
import { useFormContentDisplay } from "./FormContentText";
import type { FormContentTranslation } from "@/features/forms/formContentFields";
import { HandoverNotesField } from "./HandoverNotesField";
import { FlagIssueControls } from "./FlagIssueControls";
import { handoverTaskDraft } from "../utils/handoverTask";
import { supabase } from "@/integrations/supabase/client";
import { draftsForSubmission, listIssueKeyFromLinks, newListIssueDrafts } from "@/features/tasks/utils/listIssueInsert";
import { taskCreateLevel } from "@/features/tasks/utils/taskCreateLevel";
import { taskCreateKeysAreSet } from "@/features/tasks/utils/taskCreateAccess";
import type {
  FormFieldDataLocal,
  ValidationRules,
  WizardStepId,
} from "../types/formFill";
interface FormFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string | null;
  form?: FormWithMeta | null;
  translation?: FormContentTranslation | null;
  onSubmitted?: () => void;
}

export default function FormFillDialog({
  open,
  onOpenChange,
  formId,
  form: initialForm,
  translation = null,
  onSubmitted,
}: FormFillDialogProps) {
  const { t } = useTranslation();
  const resolvedFormId = formId ?? initialForm?.id ?? null;
  const { submitForm } = useForms();
  const { createTask } = useTasks();
  const { toast } = useToast();
  const { user } = useAuth();
  const { can, getSource, isLoading: permissionsLoading } = useCan();
  const checklistLevel = taskCreateLevel({
    createOthers: can("tasks.checklist.create_others"),
    createSelf: can("tasks.checklist.create_self"),
    legacyEdit: can("editTasks"),
    keysSet: taskCreateKeysAreSet("checklist", getSource),
  });
  const canMakeHandoverTask = permissionsLoading || checklistLevel !== "none";

  const {
    form: hydratedForm,
    fields,
    isLoading,
    isError,
    error,
    refetch,
  } = useFormDefinition({
    formId: resolvedFormId ?? undefined,
    initialForm,
  });
  const content = useFormContentDisplay({
    recordId: resolvedFormId ?? undefined,
    title: hydratedForm?.title ?? "Fill form",
    description: hydratedForm?.description,
    translation,
  });

  const form = useForm<FormSubmissionData>({
    defaultValues: {},
    mode: "onBlur",
  });
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [handoverNote, setHandoverNote] = useState("");
  const [makeHandoverTask, setMakeHandoverTask] = useState(false);
  const [flaggedFieldIds, setFlaggedFieldIds] = useState<string[]>([]);

  const orderedFields = useMemo(() => orderFormFields(fields), [fields]);
  const fieldTranslations = useFormFieldTranslations(
    orderedFields,
    readFormSourceLocale(hydratedForm?.settings),
  );
  const buckets = useMemo(
    () => groupFieldsByCategory(orderedFields),
    [orderedFields],
  );
  const steps = useMemo(() => buildWizardSteps(buckets), [buckets]);

  const wizard = useFormWizard({
    steps,
    form,
    visibleFields,
  });

  const formValues = form.watch();

  const statusLabel = useMemo(() => {
    if (isLoading) return t("forms.loadingFormFields");
    if (isError) return t("forms.unableToLoadFormFields");
    if (orderedFields.length === 0) return t("forms.noFieldsConfigured");
    return t("forms.fieldsReady", { count: orderedFields.length });
  }, [isError, isLoading, orderedFields.length, t]);

  useEffect(() => {
    if (!open) {
      form.reset({});
      setVisibleFields(new Set());
      setHasInitialized(false);
      setSubmissionId(null);
      setHandoverNote("");
      setMakeHandoverTask(false);
      setFlaggedFieldIds([]);
      wizard.reset();
    }
  }, [open, form, wizard]);

  useEffect(() => {
    if (!hasInitialized && orderedFields.length > 0) {
      const defaultValues: FormSubmissionData = {};
      orderedFields.forEach((field) => {
        defaultValues[field.id] = getDefaultValueForField(field);
      });
      form.reset(defaultValues);
      setHasInitialized(true);
    }
  }, [orderedFields, hasInitialized, form]);

  const updateVisibleFields = useCallback(() => {
    const visible = new Set<string>();

    orderedFields.forEach((field) => {
      const fieldConfig = (field.validation_rules as ValidationRules) ?? null;
      const conditionalLogic = fieldConfig?.conditional_logic;

      if (!conditionalLogic?.enabled) {
        visible.add(field.id);
        return;
      }

      const { fieldid, condition_type, condition_values } = conditionalLogic;
      if (!fieldid || !condition_type) {
        visible.add(field.id);
        return;
      }

      const referencedField = orderedFields.find(
        (candidate) => candidate.id === fieldid,
      );
      if (!referencedField) {
        visible.add(field.id);
        return;
      }

      const referencedValue = formValues[referencedField.id];
      const normalizedValues = Array.isArray(condition_values)
        ? condition_values.map((value) => String(value))
        : [];
      const referencedValueAsString =
        referencedValue == null ? "" : String(referencedValue);
      let shouldShow = false;

      switch (condition_type) {
        case "equals":
          shouldShow = normalizedValues.includes(referencedValueAsString);
          break;
        case "not_equals":
          shouldShow = !normalizedValues.includes(referencedValueAsString);
          break;
        case "contains":
          shouldShow = normalizedValues.some((value) =>
            referencedValueAsString.includes(value),
          );
          break;
        case "not_contains":
          shouldShow = !normalizedValues.some((value) =>
            referencedValueAsString.includes(value),
          );
          break;
        case "any_of":
          if (Array.isArray(referencedValue)) {
            shouldShow = referencedValue.some((value) =>
              normalizedValues.includes(String(value)),
            );
          } else {
            shouldShow = normalizedValues.includes(referencedValueAsString);
          }
          break;
        case "none_of":
          if (Array.isArray(referencedValue)) {
            shouldShow = !referencedValue.some((value) =>
              normalizedValues.includes(String(value)),
            );
          } else {
            shouldShow = !normalizedValues.includes(referencedValueAsString);
          }
          break;
        default:
          shouldShow = true;
      }

      if (shouldShow) {
        visible.add(field.id);
      }
    });

    setVisibleFields((current) => {
      if (
        current.size === visible.size &&
        [...visible].every((id) => current.has(id))
      ) {
        return current;
      }
      return visible;
    });
  }, [orderedFields, formValues]);

  useEffect(() => {
    updateVisibleFields();
  }, [updateVisibleFields]);

  const getFieldsForStep = useCallback(
    (stepId: WizardStepId) => {
      switch (stepId) {
        case "questions":
          return buckets.questions.filter((field) =>
            visibleFields.has(field.id),
          );
        case "operations":
          return buckets.operations.filter((field) =>
            visibleFields.has(field.id),
          );
        case "attachments":
          return buckets.attachments.filter((field) =>
            visibleFields.has(field.id),
          );
        default:
          return [];
      }
    },
    [buckets, visibleFields],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!resolvedFormId) {
      toast({
        title: "Missing form",
        description: "Please close and reopen this form.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const flaggedAnswers: FormSubmissionData = { ...values };
      for (const fieldId of flaggedFieldIds) {
        flaggedAnswers[fieldId] = { value: values[fieldId], flagged: true };
      }
      const { data, error: submitError } = await submitForm(resolvedFormId, {
        ...flaggedAnswers,
        additional_information: handoverNote.trim(),
      });
      if (submitError) {
        toast({
          title: "Unable to submit form",
          description: submitError.message || "Please try again later.",
          variant: "destructive",
        });
        logger.error("Form submission error", { error: submitError, tags: ["error"] });
        return;
      }
      setSubmissionId(data?.id ?? null);

      let taskFailed = false;
      if (user) {
        try {
          const { data: existing, error: existingError } = await supabase
            .from("tasks")
            .select("links")
            .eq("source", "form")
            .filter("links->>form_id", "eq", resolvedFormId);
          if (existingError) throw existingError;
          const issueDrafts = newListIssueDrafts(
            draftsForSubmission({
              formId: resolvedFormId,
              formTitle: hydratedForm?.title,
              userId: user.id,
              fields: orderedFields,
              answers: flaggedAnswers,
            }),
            (existing ?? [])
              .map((row) => listIssueKeyFromLinks(row.links))
              .filter((key): key is string => Boolean(key)),
          );
          for (const issue of issueDrafts) {
            const created = await createTask({
              title: issue.title,
              description: issue.description,
              status: issue.status,
              source: issue.source,
              priority: issue.priority,
              due_date: issue.due_date,
              assigned_to: issue.assigned_to,
              links: issue.links,
              created_by: user.id,
            });
            if (created.error) taskFailed = true;
          }
        } catch (taskError) {
          taskFailed = true;
          logger.error("List issue tasks were not created", {
            error: taskError,
            tags: ["error"],
          });
        }
      }
      const draft =
        makeHandoverTask && canMakeHandoverTask && user
          ? handoverTaskDraft({
              note: handoverNote,
              formId: resolvedFormId,
              userId: user.id,
            })
          : null;
      if (draft) {
        try {
          const created = await createTask({
            title: draft.title,
            description: draft.description,
            status: draft.status,
            source: draft.source,
            priority: draft.priority,
            due_date: draft.due_date,
            assigned_to: draft.assigned_to,
            links: draft.links,
            created_by: user.id,
          });
          taskFailed = Boolean(created.error);
        } catch (taskError) {
          taskFailed = true;
          logger.error("Handover task was not created", {
            error: taskError,
            tags: ["error"],
          });
        }
      }

      toast(
        taskFailed
          ? {
              title: "Form saved",
              description: "The form was saved, but the task was not.",
              variant: "destructive",
            }
          : {
              title: "Response submitted",
              description: "Your form was submitted successfully.",
            },
      );
      onSubmitted?.();
      wizard.setCurrentStepIndex(steps.length - 1);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Unable to submit form. Please check your connection and try again.";
      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive",
      });
      logger.error("Form submission error", { error: err, tags: ["error"] });
    } finally {
      setIsSubmitting(false);
    }
  });

  const reviewFields = useMemo(
    () =>
      orderedFields.map((field) =>
        presentFormField(field, fieldTranslations.get(field.id) ?? null),
      ),
    [fieldTranslations, orderedFields],
  );
  const reviewBuckets = useMemo(
    () => groupFieldsByCategory(reviewFields),
    [reviewFields],
  );
  const reviewValues = useMemo(() => {
    const next = { ...formValues };
    for (const field of orderedFields) {
      if (!field.id) continue;
      const translation = fieldTranslations.get(field.id);
      if (!translation) continue;
      next[field.id] = displayAnswer(
        next[field.id],
        readBuilderOptionLabels(field.options),
        translation.optionLabels,
      );
    }
    return next;
  }, [fieldTranslations, formValues, orderedFields]);
  const reviewSections = useMemo(
    () => buildReviewSections(reviewBuckets, reviewValues, visibleFields),
    [reviewBuckets, reviewValues, visibleFields],
  );

  const metaCardProps = useMemo(() => {
    const initials = user?.email
      ? user.email.split("@")[0].slice(0, 2).toUpperCase()
      : (user?.id?.slice(0, 2) ?? "—");
    const userName = user?.user_metadata?.full_name ?? user?.email ?? "—";
    const localTime = new Date().toLocaleString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      title: content.title || "Form response",
      userInitials: initials,
      userName,
      timestamp: localTime,
      timezone: timeZone,
      entryId: submissionId ? `#${submissionId.slice(0, 6)}` : "#Draft",
      statusLabel: submissionId ? "Completed" : "Draft",
    };
  }, [content.title, submissionId, user]);

  const handleExport = () => {
    void exportFormResponseToPdf({
      headerTitle: content.title,
      headerSubtitle: content.description ?? "Form response preview",
      meta: metaCardProps,
      sections: reviewSections,
    });
  };

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) {
      return;
    }
    onOpenChange(nextOpen);
  };
  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (isError && orderedFields.length === 0) {
      return (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          <p className="font-semibold">{t("forms.unableToLoadFormFields")}</p>
          <p className="mt-1 text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            {t("forms.tryAgain")}</Button>
        </div>
      );
    }

    if (orderedFields.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("forms.thisFormDoesntHaveAnyFieldsConfiguredYet")}</div>
      );
    }

    switch (wizard.currentStep.id) {
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {content.title || "Form response"}
              </h3>
              {content.description && (
                <p className="text-sm text-muted-foreground">
                  {content.description}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
              {t("forms.completeTheFollowingSectionsRequiredFieldsAreMarkedAndValidationRunsOnEachStep")}</div>
          </div>
        );
      case "questions":
      case "operations":
      case "attachments":
        return (
          <div className="space-y-6">
            {getFieldsForStep(wizard.currentStep.id).map((field) => (
              <FormFieldRenderer
                key={field.id}
                field={field}
                form={form}
                translation={fieldTranslations.get(field.id) ?? null}
              />
            ))}
          </div>
        );
      case "review":
        return (
          <div className="space-y-6">
            <FormReviewLayout
              headerTitle={content.title || "Form response"}
              headerSubtitle="Preview your answers before submitting."
              meta={metaCardProps}
              sections={reviewSections}
            />
            <FlagIssueControls
              fields={orderedFields}
              flaggedIds={flaggedFieldIds}
              onToggle={(fieldId, flagged) =>
                setFlaggedFieldIds((current) =>
                  flagged
                    ? Array.from(new Set([...current, fieldId]))
                    : current.filter((id) => id !== fieldId),
                )
              }
            />
            <HandoverNotesField
              note={handoverNote}
              onNoteChange={setHandoverNote}
              makeTask={makeHandoverTask}
              onMakeTaskChange={setMakeHandoverTask}
              canMakeTask={canMakeHandoverTask}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleExport}>
                {t("forms.downloadPdf")}</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="inset-0 left-0 top-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-none bg-background p-0 shadow-none sm:rounded-none">
        <div className="flex h-full flex-col">
          <WizardTopBar
            title={content.title || "Fill form"}
            description={
              content.description || "Follow the guided steps to complete the form."
            }
            control={content.control}
            onToggleOriginal={content.toggle}
            currentStepIndex={wizard.currentStepIndex}
            totalSteps={steps.length}
            statusLabel={statusLabel}
            progress={wizard.progress}
            onClose={() => handleDialogChange(false)}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <StepNavigation
                currentIndex={wizard.currentStepIndex}
                steps={steps}
                onStepChange={(next) => {
                  if (next <= wizard.currentStepIndex) {
                    wizard.setCurrentStepIndex(next);
                  }
                }}
              />

              <div className="flex min-h-0 flex-1 overflow-hidden">
                <Form {...form}>
                  <form
                    className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-4 sm:px-6"
                    onSubmit={handleSubmit}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={wizard.currentStep.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="space-y-6"
                      >
                        {renderStepContent()}
                      </motion.div>
                    </AnimatePresence>
                  </form>
                </Form>
              </div>

              <WizardFooter
                progress={wizard.progress}
                isSubmitting={isSubmitting}
                currentIndex={wizard.currentStepIndex}
                isLastStep={wizard.currentStep.id === "review"}
                onBack={wizard.handleBack}
                onNext={wizard.handleNext}
                onSubmit={handleSubmit}
                canProceedNext={!isLoading}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// renderField, WizardTopBar, StepNavigation, and WizardFooter have been extracted to:
// - FormFieldRenderer component (wizard/FormFieldRenderer.tsx)
// - WizardTopBar component (wizard/WizardTopBar.tsx)
// - StepNavigation component (wizard/StepNavigation.tsx)
// - WizardFooter component (wizard/WizardFooter.tsx)
