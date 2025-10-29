export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

export type LeaderboardBadgeTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface XPBreakdown {
  tasks: number;
  goals: number;
  recognitions: number;
  training: number;
}

export interface LeaderboardAchievement {
  code: string;
  label: string;
  value: number;
  context?: string;
}

export interface LeaderboardInsight {
  type: 'growth' | 'strength' | 'risk';
  message: string;
  value?: number;
}

export interface LeaderboardChallenge {
  employeeId: string;
  focus: 'skills' | 'recognition' | 'training' | 'promotion' | 'goals';
  title: string;
  description: string;
  reward: string;
  confidence: number;
  period: LeaderboardPeriod;
  periodStart: string | null;
  suggestedBadge?: string | null;
}

export interface LeaderboardEntry {
  employeeId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  period: LeaderboardPeriod;
  periodStart: string | null;
  department?: {
    id: string | null;
    name: string | null;
  } | null;
  positionName?: string | null;
  xp: XPBreakdown & { total: number };
  badgeTier: LeaderboardBadgeTier;
  badges: string[];
  achievements: LeaderboardAchievement[];
  insights: LeaderboardInsight[];
  challenges: LeaderboardChallenge[];
  taskCount: number;
  goalCount: number;
  recognitionCount: number;
  trainingCount: number;
  reliability?: number;
  updatedAt: string;
  rank: number;
}

export interface LeaderboardAnalytics {
  participantCount: number;
  averageXp: number;
  updatedAt: string | null;
  xpBySource: XPBreakdown;
  badgeTierDistribution: Record<LeaderboardBadgeTier, number>;
  topDepartment?: {
    id: string | null;
    name: string | null;
    totalXp: number;
    participantCount: number;
  };
}

export interface LeaderboardSyncMetrics {
  xpTasks: number;
  xpGoals: number;
  xpRecognitions: number;
  xpTraining: number;
  taskCount: number;
  highPriorityTaskCount: number;
  goalCount: number;
  recognitionCount: number;
  trainingCount: number;
  badgeCodes: Set<string>;
  coursesCompleted: string[];
}

export interface LeaderboardSyncRow {
  company_id: string;
  employee_id: string;
  department_id: string | null;
  role: string;
  period: LeaderboardPeriod;
  period_start: string | null;
  period_end: string | null;
  xp_total: number;
  xp_tasks: number;
  xp_goals: number;
  xp_recognitions: number;
  xp_training: number;
  badge_tier: LeaderboardBadgeTier;
  badge_codes: string[];
  achievements: LeaderboardAchievement[];
  insights: LeaderboardInsight[];
  challenges: LeaderboardChallenge[];
  last_challenge_triggered: string | null;
  last_synced_at: string;
  created_at?: string;
  updated_at?: string;
}

