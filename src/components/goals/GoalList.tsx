import { useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GoalCard } from '@/components/goals/GoalCard';
import type { Goal, GoalStatus } from '@/hooks/useGoals';
import type { GoalDialogs } from '@/hooks/useGoalDialogs';

const FILTERS = ['all', 'active', 'completed', 'draft', 'cancelled'] as const;
type GoalFilter = (typeof FILTERS)[number];

interface GoalListProps {
  data: Goal[];
  dialogs: GoalDialogs;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  onToggleStatus: (goal: Goal, status: GoalStatus) => Promise<void> | void;
  onDelete: (goal: Goal) => Promise<void> | void;
  onRetry: () => void;
}

export function GoalList({
  data,
  dialogs,
  isLoading,
  isFetching,
  error,
  onToggleStatus,
  onDelete,
  onRetry,
}: GoalListProps) {
  const [activeFilter, setActiveFilter] = useState<GoalFilter>('all');
  const [search, setSearch] = useState('');

  const normalizedQuery = search.trim().toLowerCase();

  const filteredGoals = useMemo(() => {
    const byFilter = data.filter((goal) => {
      if (activeFilter === 'all') {
        return true;
      }
      return goal.status === activeFilter;
    });

    if (!normalizedQuery) {
      return byFilter;
    }

    return byFilter.filter((goal) => {
      const haystack = `${goal.title ?? ''} ${goal.description ?? ''}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [data, activeFilter, normalizedQuery]);

  const loadingInitial = isLoading && data.length === 0;

  return (
    <section className="space-y-6">
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

      {error && (
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Unable to load goals
            </CardTitle>
            <CardDescription className="text-destructive/80">
              {error.message ?? 'An unexpected error occurred.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeFilter}>
        {FILTERS.map((filter) => (
          <TabsContent key={filter} value={filter} className="mt-0">
            {loadingInitial ? (
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
                    {data.length === 0
                      ? 'Create your first goal to begin tracking progress.'
                      : 'No goals match your filters yet.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Button
                    onClick={() => {
                      dialogs.open();
                    }}
                  >
                    Add goal
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div
                className={cn(
                  'grid gap-4',
                  'md:grid-cols-2',
                  'xl:grid-cols-3',
                  isFetching ? 'opacity-75 transition-opacity' : '',
                )}
              >
                {filteredGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={(selected) => dialogs.open(selected)}
                    onToggleStatus={(selected, status) => {
                      void onToggleStatus(selected, status);
                    }}
                    onDelete={(selected) => {
                      void onDelete(selected);
                    }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
