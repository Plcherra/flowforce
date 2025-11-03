
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/public-types';
import { useFormSchemaStore } from '@/stores/useFormSchemaStore';
import { useProfile } from '@/hooks/useProfile';

type FormTable = Tables<'forms'>;

type FormQueryRow = FormTable & {
  created_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    company_id: string | null;
  };
  department?: {
    name: string;
  };
  submission_stats?: {
    count: number | null;
  }[];
  latest_submission?: {
    submitted_at?: string | null;
  }[];
};

type FormField = Tables<'form_fields'>;

export type FormWithMeta = Omit<FormQueryRow, 'submission_stats' | 'latest_submission'> & {
  submissions_count: number;
  latest_submission_at: string | null;
};

const FORMS_QUERY_SCOPE = ['forms'] as const;

const buildFormFieldFallback = (formId: string): FormField[] => {
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
      field_type: field.type as FormField['field_type'],
      label: field.label,
      placeholder: field.placeholder ?? null,
      description: null,
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

export function useForms() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile } = useProfile();

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const formsQueryKey = useMemo(
    () => [...FORMS_QUERY_SCOPE, companyId ?? 'no-company'] as const,
    [companyId],
  );

  const fetchForms = useCallback(async (tenantCompanyId: string): Promise<FormWithMeta[]> => {
    const { data, error } = await supabase
      .from('forms')
      .select(`
        *,
        created_profile:profiles!forms_created_by_fkey(id, first_name, last_name, company_id),
        department:departments(name),
        submission_stats:form_submissions(count),
        latest_submission:form_submissions(submitted_at)
      `)
      .eq('profiles!forms_created_by_fkey.company_id', tenantCompanyId)
      .order('created_at', { ascending: false })
      .order('submitted_at', { foreignTable: 'latest_submission', ascending: false })
      .limit(1, { foreignTable: 'latest_submission' });

    if (error) throw error;

    const rows = (data ?? []) as FormQueryRow[];
    const filteredRows = rows.filter((form) => form.created_profile?.company_id === tenantCompanyId);

    if (filteredRows.length !== rows.length) {
      const removed = rows.length - filteredRows.length;
      console.warn('[useForms] Filtered out forms from other companies', JSON.stringify({ removed, tenantCompanyId }));
    }

    return filteredRows.map((form) => {
      const { submission_stats, latest_submission, ...rest } = form;
      const schemaFallback = useFormSchemaStore.getState().schema;

      const statsArray = Array.isArray(submission_stats) ? submission_stats : [];
      const latestArray = Array.isArray(latest_submission) ? latest_submission : [];

      const statsEntry = statsArray.find(
        (item): item is { count: number | null } => item !== null && typeof item === 'object',
      );
      const rawCount = statsEntry?.count;
      const fallbackMeta = schemaFallback && schemaFallback.id === rest.id ? schemaFallback.metadata : undefined;
      const fallbackCount =
        fallbackMeta && typeof (fallbackMeta as Record<string, unknown>).submissionCount === 'number'
          ? ((fallbackMeta as { submissionCount: number }).submissionCount)
          : 0;
      const submissionsCount =
        typeof rawCount === 'number' && Number.isFinite(rawCount)
          ? rawCount
          : fallbackCount;

      const latestEntry = latestArray.find(
        (item): item is { submitted_at?: string | null } => item !== null && typeof item === 'object',
      );
      const latestSubmissionAt =
        typeof latestEntry?.submitted_at === 'string' && latestEntry.submitted_at.length > 0
          ? latestEntry.submitted_at
          : null;

      return {
        ...rest,
        submissions_count: submissionsCount,
        latest_submission_at: latestSubmissionAt,
      };
    });
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
      const { data, error } = await supabase
        .from('forms')
        .insert({
          ...formData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form created successfully",
      });

      await queryClient.invalidateQueries({ queryKey: formsQueryKey });
      return { data, error: null };
    } catch (error) {
      console.error('Error creating form:', error);
      toast({
        title: "Error",
        description: "Failed to create form",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateForm = async (formId: string, updates: Partial<FormTable>) => {
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
      const { error } = await supabase
        .from('forms')
        .update(updates)
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form updated successfully",
      });

      await queryClient.invalidateQueries({ queryKey: formsQueryKey });
      return { error: null };
    } catch (error) {
      console.error('Error updating form:', error);
      toast({
        title: "Error",
        description: "Failed to update form",
        variant: "destructive",
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
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form deleted successfully",
      });

      await queryClient.invalidateQueries({ queryKey: formsQueryKey });
      return { error: null };
    } catch (error) {
      console.error('Error deleting form:', error);
      toast({
        title: "Error",
        description: "Failed to delete form",
        variant: "destructive",
      });
      return { error };
    }
  };

  const getFormFields = async (formId: string) => {
    try {
      const { data, error } = await supabase
        .from('form_fields')
        .select('*')
        .eq('form_id', formId)
        .order('field_order', { ascending: true });

      if (error) throw error;

      const rows = data ?? [];
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

  const saveFormFields = async (formId: string, fields: Omit<FormField, 'id' | 'form_id' | 'created_at' | 'updated_at'>[]) => {
    try {
      // Delete existing fields
      await supabase.from('form_fields').delete().eq('form_id', formId);

      // Insert new fields
      const fieldsToInsert = fields.map((field, index) => ({
        ...field,
        form_id: formId,
        field_order: index + 1,
      }));

      const { error } = await supabase
        .from('form_fields')
        .insert(fieldsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form fields saved successfully",
      });

      return { error: null };
    } catch (error) {
      console.error('Error saving form fields:', error);
      toast({
        title: "Error",
        description: "Failed to save form fields",
        variant: "destructive",
      });
      return { error };
    }
  };

  const getFormSubmissions = async (formId: string) => {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .select(`
          *,
          submitted_profile:profiles(first_name, last_name)
        `)
        .eq('form_id', formId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching form submissions:', error);
      return { data: [], error };
    }
  };

  const submitForm = async (formId: string, submissionData: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase
        .from('form_submissions')
        .insert({
          form_id: formId,
          submitted_by: user?.id || null,
          submission_data: submissionData,
          ip_address: null, // Could be populated from client if needed
          user_agent: navigator.userAgent,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Form submitted successfully",
      });

      return { data, error: null };
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: "Error",
        description: "Failed to submit form",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  return {
    forms,
    loading,
    isInitialLoading,
    isFetching: formsQuery.isFetching,
    createForm,
    updateForm,
    deleteForm,
    getFormFields,
    saveFormFields,
    getFormSubmissions,
    submitForm,
    refetchForms: async () => {
      await queryClient.invalidateQueries({ queryKey: formsQueryKey });
    },
  };
}
