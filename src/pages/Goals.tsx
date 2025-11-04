import { useState } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { GoalHeader } from '@/components/goals/GoalHeader';
import { GoalList } from '@/components/goals/GoalList';
import { GoalModal } from '@/components/goals/GoalModal';
import { GoalEmptyState } from '@/components/goals/GoalEmptyState';
import { useGoals, type Goal, type GoalStatus } from '@/hooks/useGoals';
import { useGoalDialogs } from '@/hooks/useGoalDialogs';
import type { GoalFormValues } from '@/components/goals/CreateGoalModal';
import { useToast } from '@/hooks/use-toast';

export default function GoalsPage() {
  const {
    goals,
    stats,
    isLoading,
    isFetching,
    error,
    refetch,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleStatus,
    creating,
    updating,
  } = useGoals();

  const dialogs = useGoalDialogs();
  const { toast } = useToast();
  const [suggesting, setSuggesting] = useState(false);

  const saving = creating || updating;

  const handleCreate = async (values: GoalFormValues) => {
    await createGoal({
      title: values.title,
      description: values.description ?? null,
      status: values.status,
      target_completion_date: values.dueDate ? values.dueDate.toISOString().split('T')[0] : null,
      priority: values.priority,
      progress: values.progress,
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
    setSuggesting(true);
    try {
      const suggestion = {
        title: 'Improve onboarding completion rate',
        description:
          'Launch a cross-functional initiative to boost onboarding completion to 95% by end of quarter with improved training paths and regular checkpoints.',
      };
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

  if (error) {
    throw error;
  }

  if (isLoading && goals.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Loading goals...</div>;
  }

  return (
    <ErrorBoundary
      fallbackRender={({ error: boundaryError, resetErrorBoundary }) => (
        <div className="p-8 text-center">
          <h2 className="text-red-600 font-semibold">Error loading goals</h2>
          <p>{boundaryError.message}</p>
          <button
            onClick={() => {
              resetErrorBoundary();
              void refetch();
            }}
            className="mt-4 rounded bg-indigo-600 px-3 py-1 text-white"
          >
            Retry
          </button>
        </div>
      )}
    >
      <main className="space-y-6 p-6">
        <GoalHeader
          dialogs={dialogs}
          count={goals.length}
          stats={stats}
          isLoadingStats={isLoading && goals.length === 0}
          onSuggestGoal={handleSuggestGoal}
          suggesting={suggesting}
        />

        {goals.length > 0 ? (
          <GoalList
            data={goals}
            dialogs={dialogs}
            isLoading={isLoading}
            isFetching={isFetching}
            error={null}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDelete}
            onRetry={() => {
              void refetch();
            }}
          />
        ) : (
          <GoalEmptyState dialogs={dialogs} />
        )}

        <GoalModal dialogs={dialogs} saving={saving} onCreate={handleCreate} onUpdate={handleUpdate} />
      </main>
    </ErrorBoundary>
  );
}
