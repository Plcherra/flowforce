import { useState } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { GoalHeader } from '@/components/goals/GoalHeader';
import { GoalList } from '@/components/goals/GoalList';
import { GoalModal } from '@/components/goals/GoalModal';
import { GoalEmptyState } from '@/components/goals/GoalEmptyState';
import { useGoals, type Goal, type GoalStatus, type GoalStats, type UseGoalsReturn } from '@/hooks/useGoals';
import { useGoalDialogs, type GoalDialogs, type GoalSuggestion } from '@/hooks/useGoalDialogs';
import type { GoalFormValues } from '@/components/goals/CreateGoalModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

type GoalSuggestionResponse = {
  insights?: string;
};

function buildGoalSuggestionPrompt(stats: GoalStats, goals: Goal[]) {
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

function parseGoalSuggestionPayload(raw: string | null | undefined): GoalSuggestion | null {
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

export default function GoalsPage() {
  const goalsState = useGoals();
  const {
    goals,
    stats,
    isLoading,
    isFetching,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleStatus,
    creating,
    updating,
  } = goalsState;

  const dialogs = useGoalDialogs();
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const [suggesting, setSuggesting] = useState(false);

  const saving = creating || updating;

  const buildRewardDetails = (values: GoalFormValues) => {
    const summary = values.rewardSummary?.trim() ?? '';
    const xp = values.xpValue != null && !Number.isNaN(values.xpValue) ? values.xpValue : null;
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
  };

  const handleCreate = async (values: GoalFormValues) => {
    await createGoal({
      title: values.title,
      description: values.description ?? null,
      status: values.status,
      target_completion_date: values.dueDate ? values.dueDate.toISOString().split('T')[0] : null,
      priority: values.priority,
      progress: values.progress,
      reward_type: values.rewardType,
      reward_details: buildRewardDetails(values),
    });
  };

  const handleUpdate = async (goal: Goal, values: GoalFormValues) => {
    await updateGoal({
      id: goal.id,
      updates: {
        title: values.title,
        description: values.description ?? null,
        status: values.status,
        priority: values.priority,
        target_completion_date: values.dueDate ? values.dueDate.toISOString().split('T')[0] : null,
        progress: values.progress,
        reward_type: values.rewardType,
        reward_details: buildRewardDetails(values),
      },
    });
  };

  const handleDelete = async (goal: Goal) => {
    const confirmed = window.confirm(`Delete goal “${goal.title}”?`);
    if (!confirmed) {
      return;
    }

    await deleteGoal(goal.id);
  };

  const handleToggleStatus = async (goal: Goal, status: GoalStatus) => {
    await toggleStatus({ id: goal.id, status });
  };

  const handleSuggestGoal = async () => {
    if (suggesting) {
      return;
    }
    if (!companyId) {
      toast({
        title: 'Missing company context',
        description: 'Switch to an active company to request AI goal suggestions.',
        variant: 'destructive',
      });
      return;
    }
    setSuggesting(true);
    try {
      const prompt = buildGoalSuggestionPrompt(stats, goals);
      const { data, error } = await supabase.functions.invoke<GoalSuggestionResponse>('ai-insights', {
        body: {
          type: 'chat',
          query: prompt,
          context: 'goals_suggestion',
          companyId,
        },
      });

      if (error) {
        throw error;
      }

      const suggestion = parseGoalSuggestionPayload(data?.insights);
      if (!suggestion) {
        throw new Error('No structured suggestion returned');
      }

      dialogs.open(null, { suggestion });
    } catch (suggestionError) {
      const message =
        suggestionError instanceof Error ? suggestionError.message : 'Try again shortly.';
      toast({
        title: 'Unable to fetch suggestion',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <ErrorBoundary
      onReset={() => {
        void goalsState.refetch();
      }}
      fallbackRender={({ error: boundaryError, resetErrorBoundary }) => (
        <div className="space-y-4 p-6">
          <Alert variant="destructive">
            <AlertTitle>Error loading goals</AlertTitle>
            <AlertDescription>
              {boundaryError.message ?? 'Please try again shortly.'}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => {
              resetErrorBoundary();
            }}
          >
            Retry
          </Button>
        </div>
      )}
    >
      <GoalsContent
        state={goalsState}
        dialogs={dialogs}
        suggesting={suggesting}
        onSuggestGoal={handleSuggestGoal}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        saving={saving}
      />
    </ErrorBoundary>
  );
}

interface GoalsContentProps {
  state: UseGoalsReturn;
  dialogs: GoalDialogs;
  suggesting: boolean;
  onSuggestGoal: () => void;
  onToggleStatus: (goal: Goal, status: GoalStatus) => Promise<void>;
  onDelete: (goal: Goal) => Promise<void>;
  onCreate: (values: GoalFormValues) => Promise<void>;
  onUpdate: (goal: Goal, values: GoalFormValues) => Promise<void>;
  saving: boolean;
}

function GoalsContent({
  state,
  dialogs,
  suggesting,
  onSuggestGoal,
  onToggleStatus,
  onDelete,
  onCreate,
  onUpdate,
  saving,
}: GoalsContentProps) {
  const { goals, stats, isLoading, isFetching, error, refetch } = state;
  const initialLoading = isLoading && goals.length === 0;
  const blockingError = error && goals.length === 0;

  if (blockingError) {
    return (
      <main className="space-y-4 p-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load goals</AlertTitle>
          <AlertDescription>
            {error?.message ?? 'We could not load your goals. Please retry.'}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => {
            void refetch();
          }}
        >
          Retry
        </Button>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <GoalHeader
        dialogs={dialogs}
        count={goals.length}
        stats={stats}
        isLoadingStats={initialLoading}
        onSuggestGoal={onSuggestGoal}
        suggesting={suggesting}
      />

      {goals.length > 0 || initialLoading ? (
        <GoalList
          data={goals}
          dialogs={dialogs}
          isLoading={isLoading}
          isFetching={isFetching}
          error={error}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onRetry={() => {
            void refetch();
          }}
        />
      ) : (
        <GoalEmptyState dialogs={dialogs} />
      )}

      <GoalModal dialogs={dialogs} saving={saving} onCreate={onCreate} onUpdate={onUpdate} />
    </main>
  );
}
