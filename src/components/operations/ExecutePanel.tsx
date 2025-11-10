import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useIdeaContext } from '@/modules/operations/contexts/IdeaProvider';
import type { IdeaKpiInsight } from '@/modules/operations/hooks/useIdeaInsights';
import type { useIdeaDiagnostics } from '@/modules/operations/hooks/useIdeaDiagnostics';
import type { useIdeaActions } from '@/modules/operations/hooks/useIdeaActions';
import { formatRangeAsPgDate } from '@/modules/operations/utils/dateRange';
import { useToast } from '@/hooks/use-toast';

interface ExecutePanelProps {
  insights: IdeaKpiInsight[];
  diagnostics: ReturnType<typeof useIdeaDiagnostics>;
  actionsState: ReturnType<typeof useIdeaActions>;
  stageDescription: string;
  onStageComplete: (cycleId: string) => void;
}

export function ExecutePanel({
  insights,
  diagnostics,
  actionsState,
  stageDescription,
  onStageComplete,
}: ExecutePanelProps) {
  const { companyId, range, activeCycleId, setActiveCycleId } = useIdeaContext();
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [cycleError, setCycleError] = useState<Error | null>(null);
  const { toast } = useToast();

  const recommendations = diagnostics.data.recommendations;
  const hasRecommendations = recommendations.length > 0;

  useEffect(() => {
    if (!companyId || creatingCycle) return;
    if (activeCycleId) return;
    if (!hasRecommendations) return;

    const createCycle = async () => {
      setCreatingCycle(true);
      setCycleError(null);
      try {
        const payload = {
          company_id: companyId,
          stage: 'execute',
          range: formatRangeAsPgDate(range),
          insights,
          actions: recommendations,
          assessments: null,
        };

        const { data, error } = await supabase
          .from('idea_cycles')
          .insert(payload)
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setActiveCycleId(data.id);
          actionsState.refresh();
        }
      } catch (error) {
        const normalized = error as Error;
        setCycleError(normalized);
        toast({
          variant: 'destructive',
          title: 'Unable to start IDEA cycle',
          description: normalized.message,
        });
      } finally {
        setCreatingCycle(false);
      }
    };

    void createCycle();
  }, [
    actionsState,
    activeCycleId,
    companyId,
    creatingCycle,
    hasRecommendations,
    insights,
    range.end,
    range.start,
    recommendations,
    setActiveCycleId,
  ]);

  const pendingActions = actionsState.data.filter((action) => action.status !== 'executed');
  const executedActions = actionsState.data.filter((action) => action.status === 'executed');

  const queuedRecommendationIds = useMemo(() => {
    return new Set(
      actionsState.data
        .map((action) => action.result?.recommendationId)
        .filter((value): value is string => typeof value === 'string'),
    );
  }, [actionsState.data]);

  const disableActionControls = !activeCycleId;

  const handleCreateAction = async (action: string, recommendationId: string) => {
    if (!activeCycleId) {
      toast({
        variant: 'destructive',
        title: 'Cycle not ready',
        description: 'Please wait for the IDEA cycle to initialize before queuing actions.',
      });
      return;
    }

    try {
      await actionsState.createAction({
        action,
        recommendationId,
        impact: 'AI recommended',
      });
    } catch (error) {
      const normalized = error as Error;
      setCycleError(normalized);
      toast({
        variant: 'destructive',
        title: 'Unable to queue action',
        description: normalized.message,
      });
    }
  };

  const handleExecuteAction = async (actionId: string) => {
    if (!activeCycleId) {
      toast({
        variant: 'destructive',
        title: 'Cycle not ready',
        description: 'Create or resume the cycle before executing actions.',
      });
      return;
    }

    try {
      await actionsState.execute({
        actionId,
        result: { executedAt: new Date().toISOString() },
      });
    } catch (error) {
      const normalized = error as Error;
      setCycleError(normalized);
      toast({
        variant: 'destructive',
        title: 'Unable to execute action',
        description: normalized.message,
      });
    }
  };

  const handleCompleteStage = () => {
    if (activeCycleId) {
      onStageComplete(activeCycleId);
      return;
    }

    toast({
      title: 'No cycle selected',
      description: 'Start or resume a cycle to review assessment results.',
    });
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4 text-violet-500" />
          Execute
        </div>
        <h2 className="text-xl font-semibold text-foreground">Launch improvement playbooks</h2>
        <p className="text-sm text-muted-foreground">{stageDescription}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleCompleteStage} disabled={!activeCycleId}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Review results
          </Button>
        </div>
      </header>

      {cycleError ? (
        <Alert variant="destructive">
          <AlertTitle>Action orchestration failed</AlertTitle>
          <AlertDescription>{cycleError.message}</AlertDescription>
        </Alert>
      ) : null}

      {actionsState.loading || creatingCycle ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/60 bg-muted/30">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/60 bg-background/70 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase text-muted-foreground">
                Pending queue
              </CardTitle>
              <CardDescription>Confirm or automate AI suggested plays.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pending actions. Add recommendations to the queue.
                </p>
              ) : (
                pendingActions.map((action) => (
                  <div key={action.id} className="rounded-md border border-border/50 bg-muted/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-foreground">{action.action_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(action.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {action.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => handleExecuteAction(action.id)} disabled={disableActionControls}>
                        <Zap className="mr-2 h-4 w-4" />
                        Execute now
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Recommended plays</CardTitle>
              <CardDescription>Queue AI recommendations for execution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No AI recommendations yet. Diagnose to generate actions.</p>
              ) : (
                recommendations.map((recommendation) => {
                  const queued = queuedRecommendationIds.has(recommendation.id);
                  return (
                    <div key={recommendation.id} className="rounded-md border border-border/50 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">{recommendation.action}</div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {queued ? 'Queued' : 'Suggested'}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{recommendation.impact}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={queued || disableActionControls}
                          onClick={() => handleCreateAction(recommendation.action, recommendation.id)}
                        >
                          Queue action
                        </Button>
                        <Button
                          size="sm"
                          disabled={disableActionControls}
                          onClick={() => handleCreateAction(recommendation.action, recommendation.id)}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          Execute now
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {executedActions.length > 0 ? (
            <Card className="lg:col-span-2 border-border/60 bg-background/70 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Executed plays</CardTitle>
                <CardDescription>Completed actions with recorded outcomes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {executedActions.map((action) => (
                  <div key={action.id} className="rounded-md border border-border/40 bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-foreground">{action.action_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Executed {new Date(action.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {action.status}
                      </Badge>
                    </div>
                    {action.result ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        {JSON.stringify(action.result, null, 2)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default ExecutePanel;
