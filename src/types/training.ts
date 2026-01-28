export type TrainingStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "expired";

export interface TrainingModule {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  level?: string | null;
  duration_minutes?: number | null;
  xp_reward?: number | null;
  is_mandatory: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingAssignment {
  id: string;
  module_id: string;
  employee_id: string;
  status: TrainingStatus;
  progress: number;
  started_at?: string | null;
  completed_at?: string | null;
  due_date?: string | null;
  assigned_by?: string | null;
  assigned_at: string;
  notes?: string | null;
  module?: TrainingModule;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
    position_id?: string | null;
    hire_date?: string | null;
  };
}

export interface TrainingProgressLog {
  id: string;
  assignment_id: string;
  progress: number;
  status: TrainingStatus;
  recorded_at: string;
  recorded_by?: string | null;
  notes?: string | null;
}
