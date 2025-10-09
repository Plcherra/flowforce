export interface ShiftTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimated_minutes: number;
}

export interface BreakItem {
  id: string;
  start_minutes: number;
  duration_minutes: number;
  is_paid: boolean;
  title: string;
}

export interface ShiftWizardFormData {
  title: string;
  date: Date;
  is_all_day: boolean;
  start_time: string;
  end_time: string;
  timezone: string;
  location: string;
  job_position_id: string;
  job_position_input: string;
  required_headcount: number;
  required_level?: number;
  assigned_users: string[];
  can_claim: boolean;
  breaks: BreakItem[];
  notes: string;
  attachments: File[];
  tasks: ShiftTask[];
}
