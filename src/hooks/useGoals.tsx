import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/public-types';

type Goal = Tables<'goals'> & {
  milestones?: Tables<'goal_milestones'>[];
  participants?: Tables<'goal_participants'>[];
  goal_tasks?: (Tables<'goal_tasks'> & {
    task?: Tables<'tasks'>;
  })[];
  rewards?: Tables<'goal_rewards'>[];
  creator?: {
    first_name: string;
    last_name: string;
  };
};

type GoalMilestone = Tables<'goal_milestones'>;
type GoalReward = Tables<'goal_rewards'>;

export function useGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGoals();
    } else {
      setGoals([]);
      setLoading(false);
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          milestones:goal_milestones(*),
          participants:goal_participants(*),
          goal_tasks(
            *,
            task:tasks(*)
          ),
          rewards:goal_rewards(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setGoals((data || []) as Goal[]);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Error",
        description: "Failed to load goals",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'company_id' | 'milestones' | 'participants' | 'goal_tasks' | 'rewards' | 'creator'>) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('No company associated with user');
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goalData,
          created_by: user!.id,
          company_id: profile.company_id
        })
        .select()
        .single();

      if (error) throw error;
      
      // Add creator as owner participant
      await supabase
        .from('goal_participants')
        .insert({
          goal_id: data.id,
          user_id: user!.id,
          role: 'owner'
        });

      await fetchGoals();
      toast({
        title: "Success",
        description: "Goal created successfully"
      });
      return { data, error: null };
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchGoals();
      toast({
        title: "Success",
        description: "Goal updated successfully"
      });
      return { data, error: null };
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchGoals();
      toast({
        title: "Success",
        description: "Goal deleted successfully"
      });
      return { error: null };
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive"
      });
      return { error };
    }
  };

  const addMilestone = async (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'goal_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('goal_milestones')
        .insert({
          ...milestone,
          goal_id: goalId
        })
        .select()
        .single();

      if (error) throw error;
      await fetchGoals();
      return { data, error: null };
    } catch (error) {
      console.error('Error adding milestone:', error);
      return { data: null, error };
    }
  };

  const updateMilestone = async (id: string, updates: Partial<GoalMilestone>) => {
    try {
      const { data, error } = await supabase
        .from('goal_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      await fetchGoals();
      return { data, error: null };
    } catch (error) {
      console.error('Error updating milestone:', error);
      return { data: null, error };
    }
  };

  const linkTaskToGoal = async (goalId: string, taskId: string, milestoneId?: string, weight = 1) => {
    try {
      const { data, error } = await supabase
        .from('goal_tasks')
        .insert({
          goal_id: goalId,
          task_id: taskId,
          milestone_id: milestoneId,
          weight
        })
        .select()
        .single();

      if (error) throw error;
      await fetchGoals();
      return { data, error: null };
    } catch (error) {
      console.error('Error linking task to goal:', error);
      return { data: null, error };
    }
  };

  const addParticipant = async (goalId: string, userId: string, role = 'participant') => {
    try {
      const { data, error } = await supabase
        .from('goal_participants')
        .insert({
          goal_id: goalId,
          user_id: userId,
          role
        })
        .select()
        .single();

      if (error) throw error;
      await fetchGoals();
      return { data, error: null };
    } catch (error) {
      console.error('Error adding participant:', error);
      return { data: null, error };
    }
  };

  const awardReward = async (goalId: string, userId: string, rewardType: string, rewardDetails: any) => {
    try {
      const { data, error } = await supabase
        .from('goal_rewards')
        .insert({
          goal_id: goalId,
          user_id: userId,
          reward_type: rewardType,
          reward_details: rewardDetails,
          created_by: user!.id
        })
        .select()
        .single();

      if (error) throw error;
      await fetchGoals();
      toast({
        title: "Success",
        description: "Reward awarded successfully"
      });
      return { data, error: null };
    } catch (error) {
      console.error('Error awarding reward:', error);
      toast({
        title: "Error",
        description: "Failed to award reward",
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const calculateGoalProgress = (goal: Goal) => {
    if (!goal.goal_tasks || goal.goal_tasks.length === 0) {
      return goal.progress;
    }

    const totalWeight = goal.goal_tasks.reduce((sum, gt) => sum + gt.weight, 0);
    const completedWeight = goal.goal_tasks.reduce((sum, gt) => {
      const isCompleted = gt.task?.status === 'completed';
      return sum + (isCompleted ? gt.weight : 0);
    }, 0);

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    linkTaskToGoal,
    addParticipant,
    awardReward,
    calculateGoalProgress,
    refetchGoals: fetchGoals
  };
}