import { useState } from 'react';
import { Loader2, PlusCircle, Sparkles } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoals, type Goal } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useGoalSuggestion } from '@/features/goals/hooks/useGoalSuggestion';
import { GoalCard } from '@/features/goals/ui/GoalCard';
import {
  GoalModal,
  type GoalModalSubmitPayload,
  type GoalSuggestionInput,
} from '@/features/goals/ui/GoalModal';
import { buildRewardDetails } from '@/features/goals/utils/rewardUtils';
import { linkTaskToGoal } from '@/features/goals/services/goalTaskLinks';

export default function GoalsPage() {
  const goalsState = useGoals();
  const { goals, stats, loading, error, createGoal, updateGoal, deleteGoal, creating, updating } =
    goalsState;
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { suggesting, requestSuggestion } = useGoalSuggestion(companyId);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [suggestedGoal, setSuggestedGoal] = useState<GoalSuggestionInput | null>(null);
  const [linkingTasks, setLinkingTasks] = useState(false);

  const saving = creating || updating || linkingTasks;

  const openCreateModal = () => {
    setSelectedGoal(null);
    setSuggestedGoal(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedGoal(null);
    setSuggestedGoal(null);
  };

  const handleSuggestGoal = async () => {
    try {
      const suggestion = await requestSuggestion(stats, goals);
      setSelectedGoal(null);
      setSuggestedGoal(suggestion);
      setModalOpen(true);
    } catch (suggestionError) {
      const message =
        suggestionError instanceof Error ? suggestionError.message : 'Try again shortly.';
      toast({
        title: 'Unable to fetch suggestion',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    const confirmed = window.confirm(`Delete goal "${goal.title ?? 'Untitled goal'}"?`);
    if (!confirmed) {
      return;
    }

    try {
      
      await deleteGoal(goal.id);
      if (selectedGoal?.id === goal.id) {
        closeModal();
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Try again shortly.';
      toast({
        title: 'Unable to delete goal',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmitGoal = async (values: GoalModalSubmitPayload) => {
    const rewardDetails = buildRewardDetails({
      rewardSummary: null,
      xpValue: values.xpReward,
    });

    try {
      if (values.goalId) {
        await updateGoal({
          id: values.goalId,
          updates: {
            title: values.title,
            description: values.description || null,
            target_completion_date: values.targetDate,
            reward_type: values.xpReward != null ? 'recognition' : null,
            reward_details: rewardDetails,
          },
        });
      } else {
        const created = await createGoal({
          title: values.title,
          description: values.description || null,
          target_completion_date: values.targetDate,
          reward_type: values.xpReward != null ? 'recognition' : null,
          reward_details: rewardDetails,
          status: 'active',
          progress: 0,
        });

        const tasksToLink = Object.entries(values.taskWeights);
        if (created?.id && tasksToLink.length > 0) {
          setLinkingTasks(true);
          try {
            await Promise.all(
              tasksToLink.map(([taskId, weight]) => linkTaskToGoal(created.id, taskId, weight)),
            );
          } finally {
            setLinkingTasks(false);
          }
        }
      }

      closeModal();
    } catch (submitError) {
      setLinkingTasks(false);
      const message = submitError instanceof Error ? submitError.message : 'Try again shortly.';
      toast({
        title: 'Unable to save goal',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="space-y-8 p-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Goals</p>
          <h1 className="text-2xl font-semibold text-foreground">Align your team with XP-ready goals</h1>
          <p className="text-sm text-muted-foreground">
            Track progress, reward outcomes, and use AI to draft new objectives.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSuggestGoal}
            disabled={!companyId || suggesting}
            className="gap-2"
          >
            {suggesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Get AI Suggestion
          </Button>
          <Button type="button" onClick={openCreateModal} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create goal
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Active" value={stats.active} />
        <SummaryTile label="Completed" value={stats.completed} />
        <SummaryTile label="Average progress" value={`${stats.averageProgress}%`} />
        <SummaryTile label="Total goals" value={stats.total} />
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load goals</AlertTitle>
          <AlertDescription>{error.message ?? 'Please try again shortly.'}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-12 text-center">
          <p className="text-lg font-medium text-foreground">No goals yet</p>
          <p className="text-sm text-muted-foreground">
            Start by creating a goal or ask AI for inspiration.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleSuggestGoal} disabled={!companyId || suggesting}>
              Get AI Suggestion
            </Button>
            <Button onClick={openCreateModal}>Create goal</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(current) => {
                setSelectedGoal(current);
                setSuggestedGoal(null);
                setModalOpen(true);
              }}
              onDelete={(current) => {
                void handleDeleteGoal(current);
              }}
            />
          ))}
        </div>
      )}

      <GoalModal
        open={modalOpen}
        goal={selectedGoal}
        suggestion={selectedGoal ? null : suggestedGoal}
        saving={saving}
        onClose={closeModal}
        onSubmit={handleSubmitGoal}
        onDelete={selectedGoal ? handleDeleteGoal : undefined}
      />
    </main>
  );
}

interface SummaryTileProps {
  label: string;
  value: string | number;
}

function SummaryTile({ label, value }: SummaryTileProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
