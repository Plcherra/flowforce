// @ts-nocheck
import type { RecognitionDetails } from '@/types/recognition';
import type {
  GoalRecognition,
  GoalTaskWithDetails,
  OwnerProfile,
} from '@/features/goals/types';
import type {
  GoalRewardRecord,
  GoalTaskRecord,
} from '@/features/goals/repositories/goalsRepository';
import type { ProfileRecord } from '@/features/goals/repositories/profileRepository';

export function buildOwnerMap(profiles: ProfileRecord[]): Record<string, OwnerProfile> {
  return profiles.reduce<Record<string, OwnerProfile>>((acc, profile) => {
    acc[profile.id] = {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
    };
    return acc;
  }, {});
}

export function groupGoalTasks(records: GoalTaskRecord[]): Map<string, GoalTaskWithDetails[]> {
  const map = new Map<string, GoalTaskWithDetails[]>();
  records.forEach((record, index) => {
    const goalId = record.goal_id;
    if (!goalId) return;
    const existing = map.get(goalId) ?? [];
    const sanitized: GoalTaskWithDetails = {
      id: record.id ?? `${goalId}-${index}`,
      weight: record.weight ?? null,
      task: record.task ?? null,
    };
    existing.push(sanitized);
    map.set(goalId, existing);
  });
  return map;
}

export function parseRecognitionDetailsValue(raw: unknown): RecognitionDetails | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as RecognitionDetails;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as RecognitionDetails;
  }
  return null;
}

interface BuildRecognitionMapOptions {
  rewards: GoalRewardRecord[];
  rewardUsers: Record<string, OwnerProfile | undefined>;
  defaultXp: number;
}

export function buildRecognitionMap({ rewards, rewardUsers, defaultXp }: BuildRecognitionMapOptions) {
  const map = new Map<string, GoalRecognition[]>();
  rewards.forEach((reward) => {
    const goalId = reward.goal_id;
    if (!goalId) return;
    const existing = map.get(goalId) ?? [];
    const details = parseRecognitionDetailsValue(reward.reward_details);
    const explicitXp =
      typeof details?.xp_awarded === 'number'
        ? details.xp_awarded
        : details && typeof (details as Record<string, unknown>)?.xp === 'number'
          ? ((details as Record<string, unknown>).xp as number)
          : null;
    const xp =
      explicitXp != null
        ? explicitXp
        : reward.reward_type === 'recognition'
          ? defaultXp
          : 0;

    const normalizedUser = reward.user_id ? rewardUsers[reward.user_id] ?? null : null;

    existing.push({
      id: reward.id,
      rewardType: reward.reward_type,
      awardedAt: reward.awarded_at,
      xpAwarded: Math.max(xp ?? defaultXp, 0),
      message: details?.message ?? null,
      user: normalizedUser,
      userId: reward.user_id ?? null,
    });

    map.set(goalId, existing);
  });

  return map;
}
