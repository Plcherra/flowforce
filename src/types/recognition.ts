import type { TrainingAssignment } from './training';

export type RecognitionSourceType =
  | 'goal_milestone'
  | 'goal_completion'
  | 'task_completion'
  | 'training_completion'
  | 'onboarding_completion'
  | 'manual';

export interface RecognitionDetails {
  message: string;
  icon?: string;
  source: RecognitionSourceType;
  goal_id?: string | null;
  milestone_id?: string | null;
  task_id?: string | null;
  training_assignment_id?: string | null;
  onboarding_step?: string | null;
  xp_awarded?: number | null;
  metadata?: Record<string, unknown>;
}

export interface RecognitionRecord {
  id: string;
  goal_id: string | null;
  user_id: string;
  reward_type: string;
  reward_details: RecognitionDetails | null;
  awarded_at: string;
  created_by: string;
  award_rule?: string | null;
  goal?: {
    id: string;
    title: string;
    status: string;
    company_id: string;
  } | null;
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
    position_id?: string | null;
  } | null;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
  } | null;
  milestone?: {
    id: string;
    title: string;
    completed_at?: string | null;
  } | null;
  task?: {
    id: string;
    title: string;
    status: string;
    completed_at?: string | null;
  } | null;
  training?: TrainingAssignment | null;
}
