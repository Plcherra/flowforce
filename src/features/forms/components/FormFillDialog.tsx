import { useTranslation } from "react-i18next";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { exportFormResponseToPdf } from "@/utils/formExport";
import { readFormSourceLocale } from "@/features/forms/formContentFields";
import {
  displayAnswer,
  presentFormField,
  readBuilderOptionLabels,
} from "@/features/forms/formFieldContent";
import { useFormFieldTranslations } from "@/features/forms/hooks/useFormFieldTranslations";
import { groupFieldsByCategory } from "../utils/formFieldHelpers";
import { canSubmitForm } from "@/features/forms/utils/formLifecycle";
import { formulaAnswerMap } from "@/features/forms/utils/formulaValue";
import { buildReviewSections } from "../utils/reviewSections";
import { getDefaultValueForField } from "../utils/formValueFormatters";
import { WizardTopBar } from "./wizard";
import { FormFillList } from "./FormFillList";
import { useFormContentDisplay } from "./FormContentText";
import type { FormContentTranslation } from "@/features/forms/formContentFields";
import { handoverTaskDraft } from "../utils/handoverTask";
import { supabase } from "@/integrations/supabase/client";
import { draftsForSubmission, listIssueKeyFromLinks, newListIssueDrafts } from "@/features/tasks/utils/listIssueInsert";
import { taskCreateLevel } from "@/features/tasks/utils/taskCreateLevel";
import { taskCreateKeysAreSet } from "@/features/tasks/utils/taskCreateAccess";
import type { ValidationRules } from "../types/formFill";
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
    title: hydratedForm?.title ?? t("forms.fillFormTitle"),
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
    }
  }, [open, form]);

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

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!canSubmitForm(orderedFields.length)) {
      toast({
        title: t("forms.thisFormDoesntHaveAnyFieldsConfiguredYet"),
        variant: "destructive",
      });
      return;
    }
    if (!resolvedFormId) {
      toast({
        title: t("forms.missingForm"),
        description: t("forms.missingFormHelp"),
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
      const { data, error: submitError, offline } = await submitForm(
        resolvedFormId,
        {
          ...flaggedAnswers,
          additional_information: handoverNote.trim(),
        },
        orderedFields.map((field) => ({
          id: field.id,
          field_type: field.field_type,
        })),
        { quiet: true },
      );
      if (submitError) {
        toast({
          title: t("forms.unableToSubmit"),
          description: t("forms.pleaseTryAgain"),
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
        offline
          ? {
              title: t("forms.savedOffline"),
              description: t("forms.savedOfflineHelp"),
            }
          : taskFailed
            ? {
                title: t("forms.formSaved"),
                description: t("forms.handoverTaskFailed"),
                variant: "destructive",
              }
            : {
                title: t("forms.responseSubmitted"),
                description: t("forms.responseSubmittedHelp"),
              },
      );
      onSubmitted?.();
    } catch (err) {
      toast({
        title: t("forms.submissionFailed"),
        description: t("forms.pleaseTryAgain"),
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
  const formulaSignature = JSON.stringify(
    formulaAnswerMap(orderedFields, formValues),
  );
  const formulaCache = useRef({
    signature: "",
    data: {} as Record<string, unknown>,
  });
  if (formulaCache.current.signature !== formulaSignature) {
    formulaCache.current = {
      signature: formulaSignature,
      data: formulaAnswerMap(orderedFields, formValues),
    };
  }
  const formulaData = formulaCache.current.data;
  const reviewSections = useMemo(
    () =>
      buildReviewSections(reviewBuckets, reviewValues, visibleFields).map(
        (section) => ({ ...section, title: t(section.title) }),
      ),
    [reviewBuckets, reviewValues, t, visibleFields],
  );

  const metaCardProps = useMemo(() => {
    const initials = user?.email
      ? user.email.split("@")[0].slice(0, 2).toUpperCase()
      : (user?.id?.slice(0, 2) ?? "—");
    const userName = user?.user_metadata?.full_name ?? user?.email ?? "—";
    const localTime = new Date().toLocaleString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      title: content.title || t("forms.formResponse"),
      userInitials: initials,
      userName,
      timestamp: localTime,
      timezone: timeZone,
      entryId: submissionId ? `#${submissionId.slice(0, 6)}` : t("forms.draftEntry"),
      statusLabel: submissionId ? t("forms.statusCompleted") : t("forms.statusDraft"),
    };
  }, [content.title, submissionId, t, user]);

  const handleExport = () => {
    void exportFormResponseToPdf({
      headerTitle: content.title,
      headerSubtitle: content.description ?? t("forms.formResponsePreview"),
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
  const visibleOrderedFields = orderedFields.filter((field) => visibleFields.has(field.id));
  const canSend = !isLoading && canSubmitForm(orderedFields.length);

  const fillBody = () => {
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
          <p className="mt-1 text-muted-foreground">{t("forms.pleaseTryAgain")}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            {t("forms.tryAgain")}
          </Button>
        </div>
      );
    }

    if (orderedFields.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("forms.thisFormDoesntHaveAnyFieldsConfiguredYet")}
        </div>
      );
    }

    return (
      <FormFillList
        title={content.title || t("forms.formResponse")}
        description={content.description}
        fields={visibleOrderedFields}
        form={form}
        formulaData={formulaData}
        translations={fieldTranslations}
        flaggedIds={flaggedFieldIds}
        onToggleFlag={(fieldId, flagged) =>
          setFlaggedFieldIds((current) =>
            flagged
              ? Array.from(new Set([...current, fieldId]))
              : current.filter((id) => id !== fieldId),
          )
        }
        handoverNote={handoverNote}
        onHandoverNote={setHandoverNote}
        makeHandoverTask={makeHandoverTask}
        onMakeHandoverTask={setMakeHandoverTask}
        canMakeHandoverTask={canMakeHandoverTask}
        onExport={handleExport}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        hideClose
        className="inset-0 left-0 top-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-none bg-background p-0 shadow-none sm:rounded-none"
      >
        <div className="flex h-full flex-col">
          <WizardTopBar
            title={content.title || t("forms.fillFormTitle")}
            description={content.description || t("forms.fillFormHelp")}
            control={content.control}
            onToggleOriginal={content.toggle}
            statusLabel={statusLabel}
            onClose={() => handleDialogChange(false)}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <Form {...form}>
              <form
                className="min-h-0 w-full flex-1 overflow-y-auto px-4 py-4 sm:px-6"
                onSubmit={handleSubmit}
              >
                {fillBody()}
              </form>
            </Form>
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/20 px-4 py-2.5 sm:px-6">
            <Button type="button" size="sm" onClick={handleSubmit} disabled={isSubmitting || !canSend}>
              {isSubmitting ? t("forms.submitting") : t("forms.submitForm")}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
