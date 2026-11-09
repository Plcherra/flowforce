import { z } from "zod";
import type { Tables } from "@/integrations/supabase/public-types";

export const goalStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "cancelled",
]);
export const performanceReviewStatusSchema = z.enum([
  "on_track",
  "needs_coaching",
  "due_soon",
  "overdue",
]);

export type GoalStatus = z.infer<typeof goalStatusSchema>;
export type PerformanceReviewStatus = z.infer<
  typeof performanceReviewStatusSchema
>;

export interface PerformanceGoal {
  id: Tables<"goals">["id"];
  title: Tables<"goals">["title"];
  status: GoalStatus;
  progress: Tables<"goals">["progress"];
  targetCompletionDate: Tables<"goals">["target_completion_date"];
  createdAt: Tables<"goals">["created_at"];
  participantRole: Tables<"goal_participants">["role"];
  contributionScore: Tables<"goal_participants">["contribution_score"];
}

export interface PerformanceReview {
  id: string;
  goalId: string | null;
  date: string | null;
  score: number | null;
  summary: string | null;
  reviewerId: string | null;
  status: PerformanceReviewStatus;
  aiSummary: string | null;
  aiInsightId: string | null;
  actionItems: unknown;
  reviewCycle: string | null;
}

export interface PerformanceMetrics {
  performanceScore: number;
  goalProgress: number;
  attendanceReliability: number;
  reviewHealth: number;
}

export interface EmployeePerformance {
  id: Tables<"profiles">["id"];
  firstName: Tables<"profiles">["first_name"];
  lastName: Tables<"profiles">["last_name"];
  role: Tables<"profiles">["role"];
  avatarUrl: Tables<"profiles">["avatar_url"];
  metrics: PerformanceMetrics;
  goals: PerformanceGoal[];
  reviews: PerformanceReview[];
  latestReviewStatus: PerformanceReviewStatus;
  latestReviewDate: string | null;
}

export interface PerformanceGoalReview {
  reviewId: Tables<"performance_goal_reviews">["reviewid"];
  companyId: Tables<"performance_goal_reviews">["company_id"];
  employeeId: Tables<"performance_goal_reviews">["employee_id"];
  reviewerId: Tables<"performance_goal_reviews">["reviewerid"];
  goalId: Tables<"performance_goal_reviews">["goal_id"];
  goalTitle: Tables<"performance_goal_reviews">["goal_title"];
  goalStatus: Tables<"performance_goal_reviews">["goal_status"];
  goalProgress: Tables<"performance_goal_reviews">["goal_progress"];
  targetCompletionDate: Tables<"performance_goal_reviews">["target_completion_date"];
  goalCompletedAt: Tables<"performance_goal_reviews">["goal_completed_at"];
  goalOwnerId: Tables<"performance_goal_reviews">["goal_ownerid"];
  reviewDate: Tables<"performance_goal_reviews">["review_date"];
  reviewCycle: Tables<"performance_goal_reviews">["review_cycle"];
  score: Tables<"performance_goal_reviews">["score"];
  summary: Tables<"performance_goal_reviews">["summary"];
  aiSummary: Tables<"performance_goal_reviews">["ai_summary"];
  actionItems: Tables<"performance_goal_reviews">["action_items"];
  reviewPeriodStart: Tables<"performance_goal_reviews">["review_period_start"];
  reviewPeriodEnd: Tables<"performance_goal_reviews">["review_period_end"];
  aiInsightId: Tables<"performance_goal_reviews">["ai_insightid"];
  insightType: Tables<"performance_goal_reviews">["insight_type"];
  insightData: Tables<"performance_goal_reviews">["insightdata"];
  insightGeneratedAt: Tables<"performance_goal_reviews">["insight_generated_at"];
  insightExpiresAt: Tables<"performance_goal_reviews">["insight_expires_at"];
  goalPriority: Tables<"performance_goal_reviews">["goal_priority"];
  createdAt: Tables<"performance_goal_reviews">["created_at"];
  updatedAt: Tables<"performance_goal_reviews">["updated_at"];
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
  goalReviews: PerformanceGoalReview[];
}
