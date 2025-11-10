import type { Tables, TablesUpdate } from '@/integrations/supabase/public-types';

export type GoalStatus = 'active' | 'completed' | 'draft' | 'cancelled';

export type GoalRow = Tables<'goals'>;

export type OwnerProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
};

export type GoalTaskWithDetails = {
  id: string;
  weight: number | null;
  task: {
    id: string;
    title: string | null;
    status: string | null;
    assigned_to: string | null;
    completed_at: string | null;
    priority: string | null;
  } | null;
};

export type GoalRecognition = {
  id: string;
  rewardType: string;
  awardedAt: string;
  xpAwarded: number;
  message: string | null;
  user: OwnerProfile | null;
  userId: string | null;
};

export type Goal = GoalRow & {
  owner?: OwnerProfile | null;
  tasks: GoalTaskWithDetails[];
  recognitions: GoalRecognition[];
  xpSummary: {
    totalXp: number;
    rewardCount: number;
  };
  rewardSummary: string;
};

export interface GoalStats {
  total: number;
  active: number;
  completed: number;
  drafts: number;
  cancelled: number;
  averageProgress: number;
}

export interface CreateGoalInput {
  title: string;
  description?: string | null;
  status?: GoalStatus;
  target_completion_date?: string | null;
  priority?: string | null;
  progress?: number;
  reward_type?: string | null;
  reward_details?: Record<string, unknown> | null;
}

export type UpdateGoalInput = TablesUpdate<'goals'>;
