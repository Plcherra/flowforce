import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { calculateGoalProgress as calculateGoalProgressFromService, syncGoalProgress } from '@/services/goals/goalProgressService';
import type { Tables, TablesInsert, Json } from '@/integrations/supabase/public-types';
import { assertGoalIsLinkable } from '@/services/performance/performanceService';

type ProfileSummary = Pick<Tables<'profiles'>, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'company_id'>;

type GoalParticipantRow = Tables<'goal_participants'>;
type GoalParticipant = GoalParticipantRow & {
  profile?: Pick<ProfileSummary, 'id' | 'first_name' | 'last_name' | 'avatar_url'> | null;
};

type GoalTask = Tables<'goal_tasks'> & {
  task?: Tables<'tasks'> | null;
};

type GoalMilestone = Tables<'goal_milestones'>;
type GoalReward = Tables<'goal_rewards'>;

export type Goal = Tables<'goals'> & {
  milestones?: GoalMilestone[];
  participants?: GoalParticipant[];
  goal_tasks?: GoalTask[];
  rewards?: GoalReward[];
  creator?: Pick<ProfileSummary, 'id' | 'first_name' | 'last_name' | 'avatar_url'> | null;
};

type CreateGoalInput = {
  title: string;
  description?: string | null;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  target_completion_date?: string | null;
  reward_type?: 'recognition' | 'bonus' | 'badge' | 'time_off' | 'custom' | null;
  reward_details?: Json | null;
  progress?: number;
  completed_at?: string | null;
  ownerId?: string;
};

export function useGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    if (user) {
      fetchGoals();
    } else {
      setGoals([]);
      setLoading(false);
      setCurrentProfile(null);
    }
  }, [user, fetchGoals]);

  const fetchCurrentProfile = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, company_id')
      .eq('id', user.id)
      .single();

    if (error) throw error;
    setCurrentProfile(data);
    return data;
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const profile = await fetchCurrentProfile();

      if (!profile?.company_id) {
        setGoals([]);
        return;
      }

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
        .eq('company_id', profile?.company_id ?? '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const goalsWithParticipants = (data || []) as (Goal & { participants?: GoalParticipantRow[] })[];
      const participantRows = goalsWithParticipants.flatMap(goal => goal.participants ?? []);
      const creatorIds = goalsWithParticipants.map(goal => goal.created_by).filter(Boolean) as string[];

      const uniqueProfileIds = Array.from(new Set([
        ...participantRows.map(participant => participant.user_id),
        ...creatorIds
      ]));

      let profilesById: Record<string, Pick<ProfileSummary, 'id' | 'first_name' | 'last_name' | 'avatar_url'>> = {};
      if (uniqueProfileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', uniqueProfileIds);

        if (profilesError) throw profilesError;

        profilesById = Object.fromEntries(
          (profilesData || []).map(profile => [
            profile.id,
            {
              id: profile.id,
              first_name: profile.first_name,
              last_name: profile.last_name,
              avatar_url: profile.avatar_url
            }
          ])
        );
      }

      const enrichedGoals: Goal[] = goalsWithParticipants.map(goal => ({
        ...goal,
        participants: (goal.participants ?? []).map(participant => ({
          ...participant,
          profile: profilesById[participant.user_id] ?? null
        })),
        creator: profilesById[goal.created_by] ?? null
      }));

      setGoals(enrichedGoals);
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
  }, [user, fetchCurrentProfile, toast]);

  const createGoal = async (goalData: CreateGoalInput) => {
    if (!user) {
      const error = new Error('User not authenticated');
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    }

    try {
      const profile = currentProfile ?? await fetchCurrentProfile();

      if (!profile?.company_id) {
        throw new Error('No company associated with user');
      }

      const insertPayload: TablesInsert<'goals'> = {
        title: goalData.title,
        description: goalData.description ?? null,
        status: goalData.status ?? 'draft',
        priority: goalData.priority ?? 'medium',
        target_completion_date: goalData.target_completion_date ?? null,
        reward_type: goalData.reward_type ?? null,
        reward_details: goalData.reward_details ?? {},
        progress: goalData.progress ?? 0,
        completed_at: goalData.completed_at ?? null,
        created_by: user.id,
        company_id: profile.company_id
      };

      const { data, error } = await supabase
        .from('goals')
        .insert(insertPayload)
        .select(`
          *,
          milestones:goal_milestones(*),
          goal_tasks(
            *,
            task:tasks(*)
          ),
          rewards:goal_rewards(*)
        `)
        .single();

      if (error) throw error;

      const ownerId = goalData.ownerId ?? user.id;
      
      const { data: ownerParticipant, error: participantError } = await supabase
        .from('goal_participants')
        .insert({
          goal_id: data.id,
          user_id: ownerId,
          role: 'owner'
        })
        .select()
        .single();

      if (participantError) throw participantError;

      let ownerProfile: Pick<ProfileSummary, 'id' | 'first_name' | 'last_name' | 'avatar_url'> | null = null;

      if (profile && profile.id === ownerId) {
        ownerProfile = {
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          avatar_url: profile.avatar_url
        };
      } else {
        const { data: ownerProfileData, error: ownerProfileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', ownerId)
          .single();

        if (ownerProfileError) throw ownerProfileError;

        ownerProfile = ownerProfileData
          ? {
              id: ownerProfileData.id,
              first_name: ownerProfileData.first_name,
              last_name: ownerProfileData.last_name,
              avatar_url: ownerProfileData.avatar_url
            }
          : null;
      }

      const creatorProfile = profile
        ? {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url
          }
        : null;

      const newGoal: Goal = {
        ...data,
        milestones: [],
        goal_tasks: [],
        rewards: [],
        participants: [
          {
            ...ownerParticipant,
            profile: ownerProfile
          }
        ],
        creator: creatorProfile
      };

      setGoals((prev) => [newGoal, ...prev]);

      toast({
        title: "Success",
        description: "Goal created successfully"
      });

      return { data: newGoal, error: null };
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
        .select('*')
        .single<Goal>();

      if (error) throw error;
      if (!data) throw new Error('Goal update returned no data');

      setGoals((prev) =>
        prev.map((goal) => (goal.id === id ? { ...goal, ...data } : goal))
      );

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
      setGoals((prev) => prev.filter((goal) => goal.id !== id));
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
      const goal = goals.find((item) => item.id === goalId);
      if (!goal) {
        throw new Error('Goal not found for linking');
      }
      assertGoalIsLinkable(goal.status as 'draft' | 'active' | 'completed' | 'cancelled');

      const { data, error } = await supabase
        .from('goal_tasks')
        .upsert(
          {
            goal_id: goalId,
            task_id: taskId,
            milestone_id: milestoneId,
            weight
          },
          { onConflict: 'goal_id,task_id' }
        )
        .select(`
          *,
          task:tasks(*)
        `)
        .single();

      if (error) throw error;

      const linkedTask = data as GoalTask;

      // Ensure the task records its primary goal for cross-feature visibility
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ goal_id: goalId })
        .eq('id', taskId);

      if (taskUpdateError) {
        console.error('Error updating task with goal_id:', taskUpdateError);
      }

      setGoals((prev) =>
        prev.map((goal) => {
          if (goal.id !== goalId) return goal;

          const existingTasks = goal.goal_tasks ?? [];
          const filteredTasks = existingTasks.filter((taskItem) => taskItem.task_id !== linkedTask.task_id);
          const updatedTasks = [...filteredTasks, linkedTask];
          const updatedGoal = {
            ...goal,
            goal_tasks: updatedTasks,
          };

          return {
            ...updatedGoal,
            progress: calculateGoalProgressFromService(updatedGoal.goal_tasks, updatedGoal.progress)
          };
        })
      );

      await syncGoalProgress(goalId);

      return { data: linkedTask, error: null };
    } catch (error) {
      console.error('Error linking task to goal:', error);
      toast({
        title: "Goal Link Failed",
        description:
          error instanceof Error ? error.message : "Unable to link task to goal.",
        variant: "destructive"
      });
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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const participant: GoalParticipant = {
        ...data,
        profile: profileData
          ? {
              id: profileData.id,
              first_name: profileData.first_name,
              last_name: profileData.last_name,
              avatar_url: profileData.avatar_url
            }
          : null
      };

      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                participants: [...(goal.participants ?? []), participant]
              }
            : goal
        )
      );

      return { data: participant, error: null };
    } catch (error) {
      console.error('Error adding participant:', error);
      return { data: null, error };
    }
  };

  const awardReward = async (goalId: string, userId: string, rewardType: string, rewardDetails: Json) => {
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
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                rewards: [...(goal.rewards ?? []), data as GoalReward]
              }
            : goal
        )
      );
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

  const calculateGoalProgress = (goal: Goal) =>
    calculateGoalProgressFromService(goal.goal_tasks ?? [], goal.progress);

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
