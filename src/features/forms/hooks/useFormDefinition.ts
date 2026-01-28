import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForms, type FormWithMeta } from "@/hooks/useForms";
import type {
  FormFieldRow,
  FormQueryRow,
} from "@/repositories/formsRepository";
import { fetchFormWithRelations } from "@/repositories/formsRepository";
import { useProfile } from "@/hooks/useProfile";
import { logger } from "@/utils/logger";

type UseFormDefinitionOptions = {
  formId?: string | null;
  initialForm?: FormWithMeta | null;
};

const buildMetaFromQueryRow = (
  row: FormQueryRow | null,
): FormWithMeta | null => {
  if (!row) {
    return null;
  }

  const { submission_stats, latest_submission, ...rest } = row;

  const submissionsCount = Array.isArray(submission_stats)
    ? submission_stats.reduce<number>((count, item) => {
        if (
          item &&
          typeof item === "object" &&
          typeof item.count === "number"
        ) {
          return item.count ?? count;
        }
        return count;
      }, 0)
    : 0;

  const latestSubmissionAt = Array.isArray(latest_submission)
    ? latest_submission.reduce<string | null>((value, item) => {
        if (
          item &&
          typeof item === "object" &&
          typeof item.submitted_at === "string"
        ) {
          return item.submitted_at;
        }
        return value;
      }, null)
    : null;

  return {
    ...rest,
    submissions_count: submissionsCount,
    latest_submission_at: latestSubmissionAt,
  };
};

export function useFormDefinition({
  formId,
  initialForm,
}: UseFormDefinitionOptions) {
  const { forms, getFormFields } = useForms();
  const { profile } = useProfile();

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const cachedForm = useMemo(() => {
    if (!formId) return null;
    return initialForm ?? forms.find((form) => form.id === formId) ?? null;
  }, [formId, forms, initialForm]);

  const formQuery = useQuery({
    queryKey: ["form-detail", companyId ?? "no-company", formId ?? "no-form"],
    enabled: Boolean(formId && companyId && !cachedForm),
    queryFn: async () => {
      if (!companyId || !formId) {
        throw new Error("Form context unavailable");
      }
      return fetchFormWithRelations(companyId, formId);
    },
    retry: 1,
    onError: (error) => {
      logger.error("Error loading form definition", { error, tags: ["error"] });
    },
  });

  const fieldsQuery = useQuery<FormFieldRow[]>({
    queryKey: ["form-fields", companyId ?? "no-company", formId ?? "no-form"],
    enabled: Boolean(formId && companyId),
    queryFn: async () => {
      if (!formId) {
        return [];
      }
      const { data, error } = await getFormFields(formId);
      if (error) {
        throw error;
      }
      return data;
    },
    retry: 1,
    onError: (error) => {
      logger.error("Error loading form fields", { error, tags: ["error"] });
    },
  });

  const form = cachedForm ?? buildMetaFromQueryRow(formQuery.data ?? null);
  const fields = fieldsQuery.data ?? [];

  return {
    form,
    fields,
    isLoading: fieldsQuery.isLoading || formQuery.isLoading,
    isError: Boolean(fieldsQuery.error || formQuery.error),
    error: fieldsQuery.error ?? formQuery.error ?? null,
    refetch: () => {
      void formQuery.refetch();
      void fieldsQuery.refetch();
    },
  };
}
