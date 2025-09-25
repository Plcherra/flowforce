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

