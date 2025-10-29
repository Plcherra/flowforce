import { z } from 'zod';
import type { Tables } from '@/integrations/supabase/public-types';

export const goalStatusSchema = z.enum(['draft', 'active', 'completed', 'cancelled']);
export const performanceReviewStatusSchema = z.enum([
  'on_track',
  'needs_coaching',
  'due_soon',
  'overdue',
]);

export type GoalStatus = z.infer<typeof goalStatusSchema>;
export type PerformanceReviewStatus = z.infer<typeof performanceReviewStatusSchema>;

export interface PerformanceGoal {
  id: Tables<'goals'>['id'];
  title: Tables<'goals'>['title'];
  status: GoalStatus;
  progress: Tables<'goals'>['progress'];
  targetCompletionDate: Tables<'goals'>['target_completion_date'];
  createdAt: Tables<'goals'>['created_at'];
  participantRole: Tables<'goal_participants'>['role'];
  contributionScore: Tables<'goal_participants'>['contribution_score'];
}

export interface PerformanceReview {
  id: Tables<'employee_report'>['id'];
  date: Tables<'employee_report'>['date'];
  severity: Tables<'employee_report'>['severity'];
  notes: Tables<'employee_report'>['notes'];
  reviewerId: Tables<'employee_report'>['created_by'];
  status: PerformanceReviewStatus;
}

export interface PerformanceMetrics {
  performanceScore: number;
  goalProgress: number;
  attendanceReliability: number;
  reviewHealth: number;
}

export interface EmployeePerformance {
  id: Tables<'profiles'>['id'];
  firstName: Tables<'profiles'>['first_name'];
  lastName: Tables<'profiles'>['last_name'];
  role: Tables<'profiles'>['role'];
  avatarUrl: Tables<'profiles'>['avatar_url'];
  metrics: PerformanceMetrics;
  goals: PerformanceGoal[];
  reviews: PerformanceReview[];
  latestReviewStatus: PerformanceReviewStatus;
  latestReviewDate: string | null;
}

export interface PerformanceRadarMetric {
  metric: string;
  actual: number;
  target: number;
  fullMark: number;
}

export interface PerformanceDataset {
  employees: EmployeePerformance[];
  radar: PerformanceRadarMetric[];
  goalSummary: {
    total: number;
    active: number;
    completed: number;
    averageProgress: number;
  };
}
