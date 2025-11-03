import { useMemo, useState } from 'react';
import { Plus, Search, AlertTriangle, Sparkles } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalProgress } from '@/components/goals/GoalProgress';
import { CreateGoalModal, type GoalFormValues } from '@/components/goals/CreateGoalModal';
import { Goal, GoalStatus, useGoals } from '@/hooks/useGoals';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const FILTERS = ['all', 'active', 'completed', 'draft'] as const;
type GoalFilter = (typeof FILTERS)[number];

function AISuggestions() {
  return null;
}

export default function Goals() {
  const {
    goals,
    stats,
    isLoading,
    isFetching: _isFetching,
    error,
    refetch,
    createGoal,
    updateGoal,
    deleteGoal,
    toggleStatus,
    creating,
    updating,
    deleting: _deleting,
    togglingStatus: _togglingStatus,
  } = useGoals();
  const { toast } = useToast();

  const [activeFilter, setActiveFilter] = useState<GoalFilter>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<{ title: string; description: string } | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const normalizedQuery = search.trim().toLowerCase();
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      const matchesFilter =
        activeFilter === 'all' ? true : goal.status === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${goal.title ?? ''} ${goal.description ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [goals, activeFilter, normalizedQuery]);

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
      // TODO: Integrate with AI service for contextual suggestions.
      const suggestion = {
        title: 'Improve onboarding completion rate',
        description:
          'Launch a cross-functional initiative to boost onboarding completion to 95% by end of quarter with improved training paths and regular checkpoints.',
      };
      setAiSuggestion(suggestion);
      setEditingGoal(null);
      setModalOpen(true);
    } catch (suggestionError) {
      toast({
        title: 'Unable to fetch suggestion',
        description:
          suggestionError instanceof Error ? suggestionError.message : 'Try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setSuggesting(false);
    }
  };

  const saving = creating || updating;

  return (
    <ErrorBoundary>
      <div className="space-y-6 px-4 pt-4 pb-8 md:px-8 lg:px-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Goals &amp; Objectives
            </h1>
            <p className="text-muted-foreground">
              Track strategic initiatives, celebrate achievements, and keep teams aligned in real time.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSuggestGoal} disabled={suggesting}>
              <Sparkles className="mr-2 h-4 w-4" />
              {suggesting ? 'Generating…' : 'Suggest a goal'}
            </Button>
            <Button
              onClick={() => {
                setAiSuggestion(null);
                setEditingGoal(null);
                setModalOpen(true);
              }}
              disabled={creating}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create goal
            </Button>
          </div>
        </header>

        <ErrorBoundary>
          <GoalProgress totals={stats} isLoading={isLoading && goals.length === 0} />
        </ErrorBoundary>

        <AISuggestions />

        <div className="sticky top-20 z-10 space-y-4 rounded-xl border border-border/60 bg-background/90 p-4 shadow-sm backdrop-blur-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as GoalFilter)}>
              <TabsList>
                {FILTERS.map((filter) => (
                  <TabsTrigger key={filter} value={filter} className="capitalize">
                    {filter}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search goals"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <Tabs value={activeFilter}>
          {FILTERS.map((filter) => (
            <TabsContent key={filter} value={filter} className="mt-0">
              <ErrorBoundary>
                {error ? (
                  <Card className="border border-destructive/20 bg-destructive/5">
                    <CardHeader className="space-y-1">
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Unable to load goals
                      </CardTitle>
                      <CardDescription className="text-destructive/80">
                        {error instanceof Error ? error.message : 'An unexpected error occurred.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" onClick={() => refetch()} size="sm">
                        Try again
                      </Button>
                    </CardContent>
                  </Card>
                ) : isLoading && goals.length === 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Card key={index} className="border border-border/60 bg-background/70">
                        <CardHeader>
                          <Skeleton className="h-6 w-2/3" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-5/6" />
                          <Skeleton className="h-2 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredGoals.length === 0 ? (
                  <Card className="border border-dashed border-border/60 bg-muted/20 py-12">
                    <CardHeader className="space-y-2 text-center">
                      <CardTitle>No goals found</CardTitle>
                      <CardDescription>
                        {goals.length === 0
                          ? 'Create your first goal to begin tracking progress.'
                          : 'No goals match your filters yet.'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      <Button onClick={() => setModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create goal
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div
                    className={cn(
                      'grid gap-4',
                      'md:grid-cols-2',
                      'xl:grid-cols-3',
                    )}
                  >
                    {filteredGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onEdit={(selected) => {
                          setEditingGoal(selected);
                          setModalOpen(true);
                        }}
                        onToggleStatus={handleToggleStatus}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </ErrorBoundary>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <CreateGoalModal
        open={modalOpen}
        onOpenChange={(next) => {
          setModalOpen(next);
          if (!next) {
            setEditingGoal(null);
            setAiSuggestion(null);
          }
        }}
        initialGoal={editingGoal ?? undefined}
        aiSuggestion={aiSuggestion}
        saving={saving}
        onSubmit={async (values) => {
          if (editingGoal) {
            await handleUpdate(editingGoal, values);
          } else {
            await handleCreate(values);
          }
          setAiSuggestion(null);
        }}
      />
    </ErrorBoundary>
  );
}
