
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Workflow = Tables<'workflows'>;
type WorkflowStep = Tables<'workflow_steps'>;

export function useWorkflows() {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWorkflows();
    } else {
      setWorkflows([]);
      setLoading(false);
    }
  }, [user]);

  const fetchWorkflows = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('workflows')
        .select(`
          *,
          created_profile:profiles!workflows_created_by_fkey(first_name, last_name),
          department:departments(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async (workflowData: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .insert(workflowData)
        .select()
        .single();

      if (error) throw error;
      await fetchWorkflows(); // Refresh the list
      return { data, error: null };
    } catch (error) {
      console.error('Error creating workflow:', error);
      return { data: null, error };
    }
  };

  const updateWorkflow = async (id: string, updates: Partial<Workflow>) => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchWorkflows(); // Refresh the list
      return { data, error: null };
    } catch (error) {
      console.error('Error updating workflow:', error);
      return { data: null, error };
    }
  };

  const deleteWorkflow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWorkflows(); // Refresh the list
      return { error: null };
    } catch (error) {
      console.error('Error deleting workflow:', error);
      return { error };
    }
  };

  const getWorkflowSteps = async (workflowId: string) => {
    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .select(`
          *,
          assigned_user:profiles(first_name, last_name)
        `)
        .eq('workflow_id', workflowId)
        .order('step_number', { ascending: true });

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching workflow steps:', error);
      return { data: [], error };
    }
  };

  const createWorkflowStep = async (stepData: Omit<WorkflowStep, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .insert(stepData)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating workflow step:', error);
      return { data: null, error };
    }
  };

  return {
    workflows,
    loading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getWorkflowSteps,
    createWorkflowStep,
    refetchWorkflows: fetchWorkflows
  };
}
