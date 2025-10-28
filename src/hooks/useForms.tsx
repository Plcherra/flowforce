
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/public-types';

type FormTable = Tables<'forms'>;

type FormQueryRow = FormTable & {
  created_profile?: {
    first_name: string;
    last_name: string;
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

export function useForms() {
  const { user } = useAuth();
  const [forms, setForms] = useState<FormWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchForms();
    } else {
      setForms([]);
      setLoading(false);
    }
  }, [user]);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forms')
        .select(`
          *,
          created_profile:profiles!forms_created_by_fkey(first_name, last_name),
          department:departments(name),
          submission_stats:form_submissions(count),
          latest_submission:form_submissions(submitted_at)
        `)
        .order('created_at', { ascending: false })
        .order('submitted_at', { foreignTable: 'latest_submission', ascending: false })
        .limit(1, { foreignTable: 'latest_submission' });

      if (error) throw error;

      const rows = (data ?? []) as FormQueryRow[];
      const normalized: FormWithMeta[] = rows.map((form) => {
        const { submission_stats, latest_submission, ...rest } = form;
        const stats = submission_stats?.[0];
        const latest = latest_submission?.[0];
        return {
          ...rest,
          submissions_count: stats?.count ?? 0,
          latest_submission_at: latest?.submitted_at ?? null,
        };
      });

      setForms(normalized);
    } catch (error) {
      console.error('Error fetching forms:', error);
      toast({
        title: "Error",
        description: "Failed to load forms",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createForm = async (formData: {
    title: string;
    description?: string;
    department_id?: string;
    is_anonymous?: boolean;
  }) => {
    if (!user) return { data: null, error: 'User not authenticated' };

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

      await fetchForms();
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

      await fetchForms();
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

      await fetchForms();
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
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching form fields:', error);
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
    createForm,
    updateForm,
    deleteForm,
    getFormFields,
    saveFormFields,
    getFormSubmissions,
    submitForm,
    refetchForms: fetchForms,
  };
}
