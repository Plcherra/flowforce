import { useCallback } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { GoalHeader } from '@/features/goals/components/GoalHeader';
import { GoalList } from '@/features/goals/components/GoalList';
import { GoalModal } from '@/features/goals/components/GoalModal';
import { GoalEmptyState } from '@/features/goals/components/GoalEmptyState';
import { useGoals, type Goal, type GoalStatus, type UseGoalsReturn } from '@/hooks/useGoals';
import { useGoalDialogs, type GoalDialogs } from '@/hooks/useGoalDialogs';
import type { GoalFormValues } from '@/features/goals/components/CreateGoalModal';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useGoalActions } from '@/features/goals/hooks/useGoalActions';
import { useGoalSuggestion } from '@/features/goals/hooks/useGoalSuggestion';

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
  const canSuggestGoals = Boolean(companyId);
  const goalSuggestion = useGoalSuggestion(companyId);
  const { handleCreate, handleUpdate, handleToggleStatus, deleteGoalById } = useGoalActions({
    createGoal,
    updateGoal,
    deleteGoal,
    toggleStatus,
  });

  const saving = creating || updating;
  const suggesting = goalSuggestion?.isLoading ?? false;

  const handleDelete = useCallback(
    async (goal: Goal) => {
      const confirmed = window.confirm(`Delete goal "${goal.title}"?`);
      if (!confirmed) {
        return;
      }

      await deleteGoalById(goal.id);
    },
    [deleteGoalById],
  );

  const handleSuggestGoal = useCallback(async () => {
    try {
      const suggestion = await (goalSuggestion?.requestSuggestion?.(stats, goals) ?? Promise.reject(new Error('Goal suggestions unavailable')));
      dialogs.open(null, { suggestion });
    } catch (suggestionError) {
      const message =
        suggestionError instanceof Error ? suggestionError.message : 'Try again shortly.';
      toast({
        title: 'Unable to fetch suggestion',
        description: message,
        variant: 'destructive',
      });
    }
  }, [dialogs, goalSuggestion, goals, stats, toast]);

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
        canSuggest={canSuggestGoals}
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
  canSuggest: boolean;
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
  canSuggest,
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
        canSuggest={canSuggest}
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
