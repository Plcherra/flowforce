import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type WeekTemplate = Tables<'week_templates'>;

export function useWeekTemplates() {
  const [templates, setTemplates] = useState<WeekTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('week_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching week templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: Omit<WeekTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('week_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      setTemplates(prev => [...prev, data]);
      return { data, error: null };
    } catch (error) {
      console.error('Error creating week template:', error);
      return { data: null, error };
    }
  };

  return {
    templates,
    loading,
    createTemplate,
    refetchTemplates: fetchTemplates
  };
}