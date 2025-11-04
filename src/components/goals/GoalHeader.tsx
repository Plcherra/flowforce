import { Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoalProgress } from '@/components/goals/GoalProgress';
import type { GoalDialogs } from '@/hooks/useGoalDialogs';
import type { GoalStats } from '@/hooks/useGoals';

interface GoalHeaderProps {
  dialogs: GoalDialogs;
  count: number;
  stats: GoalStats;
  isLoadingStats: boolean;
  onSuggestGoal: () => void;
  suggesting: boolean;
}

export function GoalHeader({
  dialogs,
  count,
  stats,
  isLoadingStats,
  onSuggestGoal,
  suggesting,
}: GoalHeaderProps) {
  return (
    <header className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{count} goals</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Goals &amp; Objectives</h1>
          <p className="text-muted-foreground max-w-2xl">
            Track strategic initiatives, celebrate achievements, and keep teams aligned in real time.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onSuggestGoal} disabled={suggesting}>
            <Sparkles className="mr-2 h-4 w-4" />
            {suggesting ? 'Generating…' : 'Suggest a goal'}
          </Button>
          <Button
            onClick={() => {
              dialogs.open();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create goal
          </Button>
        </div>
      </div>

      <GoalProgress totals={stats} isLoading={isLoadingStats} />
    </header>
  );
}
