import type { Goal } from '@/hooks/useGoals';

export interface RewardDetailsNormalized {
  xp: number | null;
  summary: string;
}

export interface RewardDetailsInput {
  rewardSummary?: string | null;
  xpValue?: number | null;
}

export function parseRewardDetails(raw: Goal['reward_details']): RewardDetailsNormalized {
  if (!raw) {
    return { xp: null, summary: '' };
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as { xp?: number | null; summary?: string | null };
      return {
        xp: typeof parsed.xp === 'number' ? parsed.xp : null,
        summary: parsed.summary ?? '',
      };
    } catch {
      return { xp: null, summary: raw };
    }
  }

  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    return {
      xp: typeof obj.xp === 'number' ? obj.xp : null,
      summary: typeof obj.summary === 'string' ? obj.summary : '',
    };
  }

  return { xp: null, summary: '' };
}

export function buildRewardDetails({ rewardSummary, xpValue }: RewardDetailsInput) {
  const summary = rewardSummary?.trim() ?? '';
  const xp = xpValue != null && !Number.isNaN(xpValue) ? xpValue : null;

  if (!summary && xp == null) {
    return null;
  }

  const payload: Record<string, unknown> = {};
  if (summary) {
    payload.summary = summary;
  }
  if (xp != null) {
    payload.xp = xp;
  }

  return payload;
}
