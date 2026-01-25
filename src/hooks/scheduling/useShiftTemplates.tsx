import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';
import { logger } from '@/utils/logger';

type ShiftTemplate = Tables<'shift_templates'>;

export function useShiftTemplates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_templates')
        .select(`
          *,
          job_position:positions(id, name, role)
        `)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logger.error('Error fetching shift templates', { error, tags: ['error'] });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: Omit<ShiftTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('shift_templates')
        .insert(templateData)
        .select()
        .single();

      if (error) throw error;
      setTemplates(prev => [...prev, data]);
      return { data, error: null };
    } catch (error) {
      logger.error('Error creating shift template', { error, tags: ['error'] });
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