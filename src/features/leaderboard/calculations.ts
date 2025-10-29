import dayjs, { type Dayjs } from 'dayjs';
import type {
  LeaderboardAchievement,
  LeaderboardBadgeTier,
  LeaderboardInsight,
  LeaderboardPeriod,
  LeaderboardSyncMetrics,
  XPBreakdown,
} from './types';

export const TASK_PRIORITY_XP: Record<string, number> = {
  low: 50,
  medium: 80,
  high: 120,
};

export const GOAL_COMPLETION_XP = 260;
export const RECOGNITION_XP = 110;
export const BASE_TRAINING_XP = 150;

const BADGE_TIER_THRESHOLDS: Record<LeaderboardBadgeTier, number> = {
  Bronze: 0,
  Silver: 1200,
  Gold: 2600,
  Platinum: 4200,
};

const SYNC_THRESHOLDS_MINUTES: Record<LeaderboardPeriod, number> = {
  weekly: 60,
  monthly: 180,
  all_time: 720,
};

export function getBadgeTier(totalXp: number): LeaderboardBadgeTier {
  if (totalXp >= BADGE_TIER_THRESHOLDS.Platinum) return 'Platinum';
  if (totalXp >= BADGE_TIER_THRESHOLDS.Gold) return 'Gold';
  if (totalXp >= BADGE_TIER_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
}

export function shouldSyncLeaderboard(lastSyncedAt: string | null | undefined, period: LeaderboardPeriod, now: Dayjs = dayjs()): boolean {
  if (!lastSyncedAt) return true;
  const thresholdMinutes = SYNC_THRESHOLDS_MINUTES[period] ?? 180;
  const last = dayjs(lastSyncedAt);
  if (!last.isValid()) return true;
  return now.diff(last, 'minute') >= thresholdMinutes;
}

export function buildAchievements(metrics: LeaderboardSyncMetrics): LeaderboardAchievement[] {
  const achievements: LeaderboardAchievement[] = [];

  if (metrics.taskCount >= 5) {
    achievements.push({
      code: 'task_streak',
      label: 'Task Streak',
      value: metrics.taskCount,
      context: metrics.highPriorityTaskCount >= 3 ? 'High priority closer' : undefined,
    });
  }

  if (metrics.goalCount >= 2) {
    achievements.push({
      code: 'goal_closer',
      label: 'Goal Closer',
      value: metrics.goalCount,
    });
  }

  if (metrics.recognitionCount >= 2) {
    achievements.push({
      code: 'recognition_star',
      label: 'Recognition Star',
      value: metrics.recognitionCount,
    });
  }

  if (metrics.trainingCount >= 1) {
    achievements.push({
      code: 'skills_in_motion',
      label: 'Skills In Motion',
      value: metrics.trainingCount,
      context: metrics.coursesCompleted.join(', ') || undefined,
    });
  }

  if (metrics.badgeCodes.size >= 4) {
    achievements.push({
      code: 'badge_collector',
      label: 'Badge Collector',
      value: metrics.badgeCodes.size,
    });
  }

  return achievements;
}

export function buildInsights(breakdown: XPBreakdown, metrics: LeaderboardSyncMetrics): LeaderboardInsight[] {
  const insights: LeaderboardInsight[] = [];
  const totalXp = breakdown.tasks + breakdown.goals + breakdown.recognitions + breakdown.training;
  if (totalXp === 0) return insights;

  const addInsight = (insight: LeaderboardInsight) => {
    insights.push(insight);
  };

  if (metrics.trainingCount > 0 && breakdown.training >= breakdown.tasks) {
    addInsight({
      type: 'growth',
      message: `Training momentum: ${metrics.trainingCount} completions this period`,
      value: breakdown.training,
    });
  }

  if (metrics.recognitionCount > 0 && breakdown.recognitions >= RECOGNITION_XP) {
    addInsight({
      type: 'strength',
      message: `${metrics.recognitionCount} recognitions earned`,
      value: breakdown.recognitions,
    });
  }

  if (metrics.taskCount >= 8 && metrics.highPriorityTaskCount >= 3) {
    addInsight({
      type: 'strength',
      message: 'High-priority task closer',
      value: metrics.highPriorityTaskCount,
    });
  }

  if (metrics.trainingCount === 0 && breakdown.training < BASE_TRAINING_XP / 2) {
    addInsight({
      type: 'risk',
      message: 'No training activity logged',
    });
  }

  return insights;
}

export function emptyMetrics(): LeaderboardSyncMetrics {
  return {
    xpTasks: 0,
    xpGoals: 0,
    xpRecognitions: 0,
    xpTraining: 0,
    taskCount: 0,
    highPriorityTaskCount: 0,
    goalCount: 0,
    recognitionCount: 0,
    trainingCount: 0,
    badgeCodes: new Set<string>(),
    coursesCompleted: [],
  };
}

export function toBreakdown(metrics: LeaderboardSyncMetrics): XPBreakdown {
  return {
    tasks: metrics.xpTasks,
    goals: metrics.xpGoals,
    recognitions: metrics.xpRecognitions,
    training: metrics.xpTraining,
  };
}

