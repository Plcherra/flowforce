import type { Goal, GoalStats } from '@/hooks/useGoals';

export function buildGoalSuggestionPrompt(stats: GoalStats, goals: Goal[]) {
  const sampleGoals = goals.slice(0, 3).map((goal) => ({
    title: goal.title ?? 'Untitled goal',
    status: goal.status,
    progress: goal.progress ?? 0,
    dueDate: goal.target_completion_date,
  }));

  const metrics = {
    total: stats.total,
    active: stats.active,
    completed: stats.completed,
    drafts: stats.drafts,
    cancelled: stats.cancelled,
    averageProgress: stats.averageProgress,
  };

  return [
    'You are FlowForce Copilot. Suggest one measurable operations goal for the next 60 days.',
    'Respond with JSON only, using the exact shape {"title": "...", "description": "..."} and no other text.',
    'Title should be under 90 characters. Description should be 2 concise sentences.',
    `Current metrics: ${JSON.stringify(metrics)}.`,
    `Recent goals: ${JSON.stringify(sampleGoals)}.`,
    'Focus on high-impact goals that drive progress and can be owned by a manager.',
  ].join(' ');
}

export type GoalSuggestion = {
  title: string;
  description: string;
};

export function parseGoalSuggestionPayload(raw: string | null | undefined): GoalSuggestion | null {
  if (!raw) return null;
  const source = raw.trim();
  const fencedMatch = source.match(/```json([\s\S]*?)```/i);
  const segment = fencedMatch ? fencedMatch[1].trim() : source;
  const jsonCandidate = (() => {
    try {
      return JSON.parse(segment);
    } catch {
      const start = segment.indexOf('{');
      const end = segment.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const sliced = segment.slice(start, end + 1);
        try {
          return JSON.parse(sliced);
        } catch {
          return null;
        }
      }
      return null;
    }
  })();

  if (!jsonCandidate || typeof jsonCandidate !== 'object') {
    return null;
  }

  const title =
    typeof (jsonCandidate as { title?: unknown }).title === 'string'
      ? (jsonCandidate as { title?: string }).title?.trim() ?? ''
      : '';
  const description =
    typeof (jsonCandidate as { description?: unknown }).description === 'string'
      ? (jsonCandidate as { description?: string }).description?.trim() ?? ''
      : '';

  if (!title) {
    return null;
  }

  return {
    title,
    description: description || 'Outline how this goal will be measured and rewarded.',
  };
}
