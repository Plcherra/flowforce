import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { useFormSchemaStore } from '@/stores/useFormSchemaStore';
import { useProfile } from '@/hooks/useProfile';
import {
  fetchFormsWithRelations,
  insertFormRow,
  updateFormRow,
  deleteFormRow,
  fetchFormFields as repositoryFetchFormFields,
  replaceFormFields as repositoryReplaceFormFields,
  fetchFormSubmissions as repositoryFetchFormSubmissions,
  insertFormSubmission,
} from '@/repositories/formsRepository';
import type { FormRow, FormFieldRow, FormSubmissionRow, FormQueryRow } from '@/repositories/formsRepository';

export type { FormRow, FormFieldRow, FormSubmissionRow } from '@/repositories/formsRepository';

export type FormWithMeta = Omit<FormQueryRow, 'submission_stats' | 'latest_submission'> & {
  submissions_count: number;
  latest_submission_at: string | null;
};

const FORMS_QUERY_SCOPE = ['forms'] as const;

type FormSchemaSnapshot = ReturnType<typeof useFormSchemaStore.getState>['schema'];

type PartialFormMeta = Partial<FormWithMeta>;

const getFallbackSubmissionCount = (schema: FormSchemaSnapshot, formId: string): number => {
  if (!schema || schema.id !== formId) {
    return 0;
  }
  const metadata = schema.metadata;
  if (metadata && typeof (metadata as Record<string, unknown>).submissionCount === 'number') {
    return (metadata as { submissionCount: number }).submissionCount;
  }
  return 0;
};

const convertQueryRowToMeta = (row: FormQueryRow, schemaFallback: FormSchemaSnapshot): FormWithMeta => {
  const { submission_stats, latest_submission, ...rest } = row;
  const statsEntry = Array.isArray(submission_stats)
    ? submission_stats.find((item): item is { count: number | null } => Boolean(item && typeof item === 'object'))
    : undefined;
  const rawCount = typeof statsEntry?.count === 'number' && Number.isFinite(statsEntry.count) ? statsEntry.count : null;
  const fallbackCount = schemaFallback ? getFallbackSubmissionCount(schemaFallback, rest.id) : 0;

  const latestEntry = Array.isArray(latest_submission)
    ? latest_submission.find(
        (item): item is { submitted_at?: string | null } => Boolean(item && typeof item === 'object'),
      )
    : undefined;

  const latestSubmissionAt =
    typeof latestEntry?.submitted_at === 'string' && latestEntry.submitted_at.length > 0
      ? latestEntry.submitted_at
      : null;

  return {
    ...rest,
    submissions_count: rawCount ?? fallbackCount,
    latest_submission_at: latestSubmissionAt,
  };
};

const buildMetaFromRow = (row: FormRow, overrides: PartialFormMeta = {}): FormWithMeta => ({
  ...row,
  created_profile: overrides.created_profile,
  department: overrides.department ?? null,
  submissions_count: overrides.submissions_count ?? 0,
  latest_submission_at: overrides.latest_submission_at ?? null,
});

export function useForms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const formsQueryKey = useMemo(
    () => [...FORMS_QUERY_SCOPE, companyId ?? 'no-company'] as const,
    [companyId],
  );

  const updateFormsCache = useCallback(
    (updater: (forms: FormWithMeta[]) => FormWithMeta[]) => {
      queryClient.setQueryData<FormWithMeta[]>(formsQueryKey, (current) => updater(current ?? []));
    },
    [formsQueryKey, queryClient],
  );

  const fetchForms = useCallback(async (tenantCompanyId: string): Promise<FormWithMeta[]> => {
    const rows = await fetchFormsWithRelations(tenantCompanyId);
    const filteredRows = rows.filter((form) => form.created_profile?.company_id === tenantCompanyId);

    if (filteredRows.length !== rows.length) {
      const removed = rows.length - filteredRows.length;
      console.warn(
        '[useForms] Filtered out forms from other companies',
        JSON.stringify({ removed, tenantCompanyId }),
      );
    }

    const schemaFallback = useFormSchemaStore.getState().schema;
    return filteredRows.map((form) => convertQueryRowToMeta(form, schemaFallback));
  }, []);

  const formsQuery = useQuery<FormWithMeta[]>({
    queryKey: formsQueryKey,
    queryFn: async () => {
      if (!companyId) {
        return [];
      }
      return fetchForms(companyId);
    },
    enabled: Boolean(user && companyId),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    suspense: false,
    throwOnError: false,
    retry: 1,
    onError: (error) => {
      console.error('Error fetching forms:', error);
      toast({
        title: 'Error',
        description: 'Failed to load forms',
        variant: 'destructive',
      });
    },
  });

  const forms = formsQuery.data ?? [];
  const isInitialLoading = formsQuery.isLoading || (formsQuery.isFetching && !formsQuery.data);
  const loading = user ? isInitialLoading : false;
  const formsError = (formsQuery.error as Error | null) ?? null;

  const refetchForms = useCallback(async () => {
    await queryClient.refetchQueries({ queryKey: formsQueryKey, exact: true });
  }, [queryClient, formsQueryKey]);

  const createForm = async (formData: {
    title: string;
    description?: string;
    department_id?: string;
    is_anonymous?: boolean;
  }) => {
    if (!user) return { data: null, error: 'User not authenticated' };
    if (!companyId) {
      const error = new Error('Company context unavailable');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }

    try {
      const created = await insertFormRow(companyId, {
        ...formData,
        created_by: user.id,
      });

      const authorProfile = profile
        ? {
            id: profile.id ?? profile.userId ?? user.id,
            first_name: profile.first_name ?? profile.firstName ?? null,
            last_name: profile.last_name ?? profile.lastName ?? null,
            company_id: companyId,
          }
        : undefined;

      updateFormsCache((current) => [buildMetaFromRow(created, { created_profile: authorProfile }), ...current]);

      toast({
        title: 'Success',
        description: 'Form created successfully',
      });

      return { data: created, error: null };
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: 'Error',
        description: 'Failed to create form',
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const updateForm = async (formId: string, updates: Partial<FormRow>) => {
    if (!companyId) {
      const error = new Error('Company context unavailable');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    try {
      const updated = await updateFormRow(companyId, formId, updates);

      if (updated) {
        updateFormsCache((current) =>
          current.map((form) =>
            form.id === formId
              ? buildMetaFromRow(updated, {
                  created_profile: form.created_profile,
                  department: form.department,
                  submissions_count: form.submissions_count,
                  latest_submission_at: form.latest_submission_at,
                })
              : form,
          ),
        );
      }

      toast({
        title: 'Success',
        description: 'Form updated successfully',
      });

      return { error: null };
    } catch (error) {
      console.error('Error updating form:', error);
      toast({
        title: 'Error',
        description: 'Failed to update form',
        variant: 'destructive',
      });
      return { error };
    }
  };

  const deleteForm = async (formId: string) => {
    if (!companyId) {
      const error = new Error('Company context unavailable');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    try {
      await deleteFormRow(companyId, formId);
      updateFormsCache((current) => current.filter((form) => form.id !== formId));

      toast({
        title: 'Success',
        description: 'Form deleted successfully',
      });

      return { error: null };
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete form',
        variant: 'destructive',
      });
      return { error };
    }
  };

  const getFormFields = async (formId: string) => {
    if (!companyId) {
      const error = new Error('Company context unavailable');
      return { data: [], error };
    }

    try {
      const rows = await repositoryFetchFormFields(companyId, formId);
      if (!rows.length) {
        const fallback = buildFormFieldFallback(formId);
        if (fallback.length) {
          console.warn('Supabase returned no form fields; using local schema fallback.');
          return { data: fallback, error: null };
        }
      }
      return { data: rows, error: null };
    } catch (error) {
      console.error('Error fetching form fields:', error);
      const fallback = buildFormFieldFallback(formId);
      if (fallback.length) {
        console.warn('Using locally cached form schema due to Supabase error.');
        return { data: fallback, error: null };
      }
      return { data: [], error };
    }
  };

  const saveFormFields = async (
    formId: string,
    fields: Omit<FormFieldRow, 'id' | 'form_id' | 'created_at' | 'updated_at'>[],
  ) => {
    if (!companyId) {
      const error = new Error('Company context unavailable');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    try {
      await repositoryReplaceFormFields(companyId, formId, fields);
      toast({
        title: 'Success',
        description: 'Form fields saved successfully',
      });
      return { error: null };
    } catch (error) {
      console.error('Error saving form fields:', error);
      toast({
        title: 'Error',
        description: 'Failed to save form fields',
        variant: 'destructive',
      });
      return { error };
    }
  };

  const getFormSubmissions = async (formId: string) => {
    if (!companyId) {
      const error = new Error('Company context unavailable');
      return { data: [], error };
    }

    try {
      const data = await repositoryFetchFormSubmissions(companyId, formId);
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching form submissions:', error);
      return { data: [], error };
    }
  };

  const submitForm = async (formId: string, submissionData: Record<string, unknown>) => {
    if (!companyId) {
      const error = new Error('Company context unavailable');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }

    try {
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;
      const submission = await insertFormSubmission(companyId, {
        form_id: formId,
        submitted_by: user?.id || null,
        submission_data: submissionData,
        ip_address: null,
        user_agent: userAgent,
      });

      updateFormsCache((current) =>
        current.map((form) =>
          form.id === formId
            ? {
                ...form,
                submissions_count: form.submissions_count + 1,
                latest_submission_at: submission.submitted_at ?? form.latest_submission_at,
              }
            : form,
        ),
      );

      toast({
        title: 'Success',
        description: 'Form submitted successfully',
      });

      return { data: submission, error: null };
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit form',
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  return {
    forms,
    loading,
    isInitialLoading,
    isFetching: formsQuery.isFetching,
    isError: formsQuery.isError,
    error: formsError,
    createForm,
    updateForm,
    deleteForm,
    getFormFields,
    saveFormFields,
    getFormSubmissions,
    submitForm,
    refetchForms,
  };
}

const buildFormFieldFallback = (formId: string): FormFieldRow[] => {
  const schema = useFormSchemaStore.getState().schema;
  if (!schema || schema.id !== formId) {
    return [];
  }

  const timestamp = new Date().toISOString();
  let order = 1;

  return schema.sections.flatMap((section) =>
    section.fields.map((field) => ({
      id: field.id,
      form_id: formId,
      field_order: order++,
      field_type: field.type as FormFieldRow['field_type'],
      label: field.label,
      placeholder: field.placeholder ?? null,
      description: field.content ?? null,
      is_required: field.required ?? false,
      options: field.options && field.options.length > 0 ? field.options : null,
      validation_rules: field.validation ?? null,
      min_value: field.min_value ?? null,
      max_value: field.max_value ?? null,
      step_value: field.step_value ?? null,
      formula_expression: field.formula_expression ?? null,
      dependent_fields: field.dependent_fields ?? null,
      rating_config: field.rating_config ?? null,
      scan_config: field.scan_config ?? null,
      media_config: field.media_config ?? null,
      created_at: timestamp,
      updated_at: timestamp,
    })),
  );
};
