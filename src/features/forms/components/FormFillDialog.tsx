import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { useForms, type FormWithMeta } from "@/hooks/useForms";
import { useFormDefinition } from "@/features/forms/hooks/useFormDefinition";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/utils/logger";
import { FormSubmissionData } from "@/types/api";
import { orderFormFields } from "@/features/forms/components/utils/orderFormFields";
import { FormReviewLayout } from "@/features/forms/components/presentation";
import { exportFormResponseToPdf } from "@/utils/formExport";
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
import type {
  FormFieldDataLocal,
  ValidationRules,
  WizardStepId,
} from "../types/formFill";
import type { FormFieldType } from "@/types/forms";
interface FormFillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string | null;
  form?: FormWithMeta | null;
  onSubmitted?: () => void;
}

export default function FormFillDialog({
  open,
  onOpenChange,
  formId,
  form: initialForm,
  onSubmitted,
}: FormFillDialogProps) {
  const resolvedFormId = formId ?? initialForm?.id ?? null;
  const { submitForm } = useForms();
  const { toast } = useToast();
  const { user } = useAuth();

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

  const form = useForm<FormSubmissionData>({
    defaultValues: {},
    mode: "onBlur",
  });
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const orderedFields = useMemo(() => orderFormFields(fields), [fields]);
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
    if (isLoading) return "Loading form fields…";
    if (isError) return "Unable to load form fields";
    if (orderedFields.length === 0) return "No fields configured";
    return `${orderedFields.length} fields ready`;
  }, [isLoading, isError, orderedFields.length]);

  useEffect(() => {
    if (!open) {
      form.reset({});
      setVisibleFields(new Set());
      setHasInitialized(false);
      setSubmissionId(null);
      wizard.reset();
    }
  }, [open, form, wizard]);

  useEffect(() => {
    if (!hasInitialized && orderedFields.length > 0) {
      const defaultValues: FormSubmissionData = {};
      orderedFields.forEach((field) => {
        defaultValues[field.id] = getDefaultValue(field);
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

      const { field_id, condition_type, condition_values } = conditionalLogic;
      if (!field_id || !condition_type) {
        visible.add(field.id);
        return;
      }

      const referencedField = orderedFields.find(
        (candidate) => candidate.id === field_id,
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

    setVisibleFields(visible);
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
      const { data, error: submitError } = await submitForm(
        resolvedFormId,
        values,
      );
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
      toast({
        title: "Response submitted",
        description: "Your form was submitted successfully.",
      });
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

  const reviewSections = useMemo(
    () => buildReviewSections(buckets, formValues, visibleFields),
    [buckets, formValues, visibleFields],
  );

  const metaCardProps = useMemo(() => {
    const initials = user?.email
      ? user.email.split("@")[0].slice(0, 2).toUpperCase()
      : (user?.id?.slice(0, 2) ?? "—");
    const userName = user?.user_metadata?.full_name ?? user?.email ?? "—";
    const localTime = new Date().toLocaleString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      title: hydratedForm?.title ?? "Form response",
      userInitials: initials,
      userName,
      timestamp: localTime,
      timezone: timeZone,
      entryId: submissionId ? `#${submissionId.slice(0, 6)}` : "#Draft",
      statusLabel: submissionId ? "Completed" : "Draft",
    };
  }, [hydratedForm?.title, submissionId, user]);

  const handleExport = () => {
    void exportFormResponseToPdf({
      headerTitle: hydratedForm?.title,
      headerSubtitle: hydratedForm?.description ?? "Form response preview",
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
          <p className="font-semibold">Unable to load form fields</p>
          <p className="mt-1 text-muted-foreground">
            {error instanceof Error ? error.message : "Please try again."}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      );
    }

    if (orderedFields.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          This form doesn’t have any fields configured yet.
        </div>
      );
    }

    switch (currentStep.id) {
      case "overview":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {hydratedForm?.title ?? "Form response"}
              </h3>
              {hydratedForm?.description && (
                <p className="text-sm text-muted-foreground">
                  {hydratedForm.description}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-sm text-muted-foreground">
              Complete the following sections. Required fields are marked and
              validation runs on each step.
            </div>
          </div>
        );
      case "questions":
      case "operations":
      case "attachments":
        return (
          <div className="space-y-6">
            {getFieldsForStep(wizard.currentStep.id).map((field) => (
              <FormFieldRenderer key={field.id} field={field} form={form} />
            ))}
          </div>
        );
      case "review":
        return (
          <div className="space-y-6">
            <FormReviewLayout
              headerTitle={hydratedForm?.title ?? "Form response"}
              headerSubtitle="Preview your answers before submitting."
              meta={metaCardProps}
              sections={reviewSections}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleExport}>
                Download PDF
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        style={{ transform: "none" }}
        className="h-screen w-screen max-w-none overflow-hidden rounded-none border-none bg-background p-0 shadow-none"
      >
        <div className="flex h-full flex-col">
          <WizardTopBar
            title={hydratedForm?.title ?? "Fill form"}
            description="Follow the guided steps to complete the form."
            currentStepIndex={wizard.currentStepIndex}
            totalSteps={steps.length}
            statusLabel={statusLabel}
            progress={wizard.progress}
            onClose={() => handleDialogChange(false)}
          />

          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">
              <StepNavigation
                currentIndex={wizard.currentStepIndex}
                steps={steps}
                onStepChange={(next) => {
                  if (next <= wizard.currentStepIndex) {
                    wizard.setCurrentStepIndex(next);
                  }
                }}
              />

              <div className="flex flex-1 overflow-hidden">
                <Form {...form}>
                  <form
                    className="flex-1 overflow-y-auto px-8 py-6"
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
