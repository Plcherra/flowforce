import { useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, Loader2, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useScenarioSimulator } from '@/hooks/useScenarioSimulator';
import { useCompany } from '@/hooks/useCompany';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_ADJUSTMENTS,
  type RiskLevel,
  type ScenarioAdjustments,
} from '@/lib/ai/scenarioEngine';
import { logger } from '@/utils/logger';

interface ScenarioSimulatorProps {
  className?: string;
}

const riskStyles: Record<RiskLevel, string> = {
  low: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  moderate: 'bg-amber-100 text-amber-700 border border-amber-200',
  high: 'bg-red-100 text-red-700 border border-red-200',
};

const percent = (value: number, fractionDigits = 1) => `${(value * 100).toFixed(fractionDigits)}%`;
const formatDeltaPercent = (delta: number) =>
  `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`;
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    value,
  );

export default function ScenarioSimulator({ className }: ScenarioSimulatorProps) {
  const { company } = useCompany();
  const {
    baseline,
    loading,
    error,
    isUsingFallback,
    simulate,
    triggerCopilot,
    lastTriggeredAt,
    lastTriggeredCount,
    lastGeneratedActions,
    lastTriggeredTaskIds,
    refresh,
  } = useScenarioSimulator({ companyId: company?.id, horizonDays: 21 });

  const [adjustments, setAdjustments] = useState<ScenarioAdjustments>(DEFAULT_ADJUSTMENTS);
  const [isTriggering, setIsTriggering] = useState(false);
  const { toast: pushToast } = useToast();
  const navigate = useNavigate();

  const outcome = useMemo(() => simulate(adjustments), [simulate, adjustments]);

  const updateAdjustment = (key: keyof ScenarioAdjustments, min: number, max: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.valueAsNumber;
    if (Number.isNaN(raw)) {
      return;
    }
    setAdjustments((prev) => ({
      ...prev,
      [key]: Math.max(min, Math.min(max, raw)),
    }));
  };

  const handleReset = () => setAdjustments(DEFAULT_ADJUSTMENTS);

  const handleTrigger = async () => {
    try {
      const actions = outcome.copilotActions;
      if (!actions || actions.length === 0) {
        pushToast({
          title: 'No automation needed',
          description: 'The current scenario forecast is already within healthy ranges.',
        });
        return;
      }
      setIsTriggering(true);
      const { created } = await triggerCopilot(actions);
      pushToast({
        title: 'Co-Pilot actions queued',
        description: `Generated ${created} follow-up task${created === 1 ? '' : 's'} from this scenario.`,
      });
    } catch (err) {
      logger.error('Failed to push copilot actions', { error: err, tags: ['error'] });
      pushToast({
        title: 'Unable to push actions',
        description: err instanceof Error ? err.message : 'Co-Pilot automation failed.',
        variant: 'destructive',
      });
    } finally {
      setIsTriggering(false);
    }
  };

  if (!baseline && loading) {
    return (
      <div className={cn('flex h-full min-h-[240px] items-center justify-center rounded-lg border', className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!baseline) {
    return (
      <div className={cn('space-y-4', className)}>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Scenario simulator unavailable</AlertTitle>
          <AlertDescription>
            We could not load baseline metrics for this workspace. Please refresh or check your database connection.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const coverage = percent(baseline.scheduling.coverageRate);
  const backlogLabel = `${baseline.tasks.backlog}`;
  const goalProgress = `${baseline.goals.avgProgress.toFixed(0)}%`;
  const trailingRevenue = formatCurrency(baseline.revenue.trailing30);

  return (
    <div className={cn('space-y-6', className)}>
      {error && (
        <Alert variant={isUsingFallback ? 'default' : 'destructive'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{isUsingFallback ? 'Using simulator defaults' : 'Scenario simulator issue'}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle>Baseline Snapshot</CardTitle>
                <CardDescription>
                  Generated {new Date(baseline.generatedAt).toLocaleString()}
                </CardDescription>
              </div>
              {isUsingFallback && <Badge variant="secondary">Simulated</Badge>}
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Staff Coverage</span>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{coverage}</div>
              <Progress className="mt-3 h-2" value={baseline.scheduling.coverageRate * 100} />
              <p className="mt-2 text-xs text-muted-foreground">
                {baseline.scheduling.totalShifts} shifts scheduled · {baseline.scheduling.openShifts} open
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Task Backlog</span>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{backlogLabel}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {baseline.tasks.overdue} overdue · avg age {baseline.tasks.avgAgeDays.toFixed(1)}d
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Goal Progress</span>
                <Sparkles className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{goalProgress}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                {baseline.goals.active} active · {baseline.goals.atRisk} at risk
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                <span>Trailing 30d Revenue</span>
                <ArrowUpRight className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{trailingRevenue}</div>
              <p className="mt-2 text-xs text-muted-foreground">
                Margin {percent(baseline.revenue.marginRate, 1)} · Operating cost {formatCurrency(baseline.revenue.operatingCost30)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Forecast & Controls</CardTitle>
                <CardDescription>
                  Adjust levers to preview what-if impact across staffing, tasks, goals, and revenue.
                </CardDescription>
              </div>
              <Badge className={cn('uppercase tracking-wide', riskStyles[outcome.risk])}>
                {outcome.risk} risk
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="staffing-change">Staffing change (%)</Label>
                <Input
                  id="staffing-change"
                  type="number"
                  step={1}
                  min={-20}
                  max={30}
                  value={adjustments.staffingChangePct}
                  onChange={updateAdjustment('staffingChangePct', -20, 30)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Positive values add headcount.</p>
              </div>
              <div>
                <Label htmlFor="overtime-reduction">Overtime reduction (%)</Label>
                <Input
                  id="overtime-reduction"
                  type="number"
                  step={1}
                  min={0}
                  max={40}
                  value={adjustments.overtimeReductionPct}
                  onChange={updateAdjustment('overtimeReductionPct', 0, 40)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Reduces labor cost exposure.</p>
              </div>
              <div>
                <Label htmlFor="automation">Task automation (%)</Label>
                <Input
                  id="automation"
                  type="number"
                  step={1}
                  min={0}
                  max={60}
                  value={adjustments.taskAutomationPct}
                  onChange={updateAdjustment('taskAutomationPct', 0, 60)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Rules + AI assistance rollout.</p>
              </div>
              <div>
                <Label htmlFor="goal-focus">Goal acceleration (%)</Label>
                <Input
                  id="goal-focus"
                  type="number"
                  step={1}
                  min={0}
                  max={40}
                  value={adjustments.goalFocusPct}
                  onChange={updateAdjustment('goalFocusPct', 0, 40)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Coaching & milestone cadence.</p>
              </div>
              <div>
                <Label htmlFor="revenue-target">Revenue delta (%)</Label>
                <Input
                  id="revenue-target"
                  type="number"
                  step={1}
                  min={-20}
                  max={30}
                  value={adjustments.revenueChangePct}
                  onChange={updateAdjustment('revenueChangePct', -20, 30)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Menu, pricing, partnership shifts.</p>
              </div>
              <div>
                <Label htmlFor="timeline">Timeline (weeks)</Label>
                <Input
                  id="timeline"
                  type="number"
                  step={1}
                  min={1}
                  max={12}
                  value={adjustments.timelineWeeks}
                  onChange={updateAdjustment('timelineWeeks', 1, 12)}
                />
                <p className="mt-1 text-xs text-muted-foreground">Window for modeled actions.</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                    <span>Projected coverage</span>
                    <span className={outcome.deltas.coverageRate >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {formatDeltaPercent(outcome.deltas.coverageRate)}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-semibold">{percent(outcome.predicted.coverageRate)}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                    <span>Projected backlog</span>
                    <span className={outcome.deltas.backlog <= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {`${outcome.deltas.backlog >= 0 ? '+' : ''}${Math.round(outcome.deltas.backlog)}`}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {Math.round(outcome.predicted.backlog)} tasks
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                    <span>Goal confidence</span>
                    <span className={outcome.deltas.goalConfidence >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {`${outcome.deltas.goalConfidence >= 0 ? '+' : ''}${outcome.deltas.goalConfidence.toFixed(0)} pts`}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {outcome.predicted.goalConfidence.toFixed(0)}%
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                    <span>Revenue forecast (30d)</span>
                    <span className={outcome.deltas.revenueForecast >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {outcome.deltas.revenueForecast >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(outcome.deltas.revenueForecast))}
                    </span>
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {formatCurrency(outcome.predicted.revenueForecast)}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Margin {percent(outcome.predicted.marginRate, 1)} ({formatDeltaPercent(outcome.deltas.marginRate)})
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Refresh data
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset} disabled={loading}>
                Reset levers
              </Button>
              <Button
                className="ml-auto"
                onClick={handleTrigger}
                disabled={isTriggering || loading}
              >
                {isTriggering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Trigger Co-Pilot
              </Button>
            </div>
            {lastTriggeredTaskIds.length > 0 && (
              <Alert variant="default" className="flex flex-wrap items-center gap-3 border border-primary/40 bg-primary/5">
                <div className="flex-1">
                  <AlertTitle>Automation queued</AlertTitle>
                  <AlertDescription>
                    Co-Pilot created {lastTriggeredTaskIds.length} task{lastTriggeredTaskIds.length === 1 ? '' : 's'} from this scenario.
                  </AlertDescription>
                </div>
                <Button size="sm" onClick={() => navigate('/tasks?tab=queue')}>
                  Review tasks
                </Button>
              </Alert>
            )}
            {(lastTriggeredAt || lastGeneratedActions.length > 0) && (
              <p className="text-xs text-muted-foreground">
                {lastTriggeredAt
                  ? `Last pushed ${lastTriggeredCount ?? 0} action${(lastTriggeredCount ?? 0) === 1 ? '' : 's'} `
                    + `${new Date(lastTriggeredAt).toLocaleString()}`
                  : 'Actions prepared — push to Co-Pilot when ready.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Co-Pilot Action Plan</CardTitle>
          <CardDescription>
            Recommended automations generated from this scenario. Triggering will create tasks tagged for Co-Pilot follow-up.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {outcome.copilotActions.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Scenario looks healthy. Adjust inputs to surface automation opportunities.
            </div>
          ) : (
            outcome.copilotActions.map((action) => (
              <div key={action.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase tracking-wide">
                        {action.type}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          action.impact === 'high'
                            ? 'border-red-200 bg-red-100 text-red-700'
                            : action.impact === 'medium'
                              ? 'border-amber-200 bg-amber-100 text-amber-700'
                              : 'border-emerald-200 bg-emerald-100 text-emerald-700'
                        }
                      >
                        {action.impact} impact
                      </Badge>
                      <Badge variant="outline">Confidence {(action.confidence * 100).toFixed(0)}%</Badge>
                    </div>
                    <h4 className="mt-2 text-base font-semibold">{action.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{action.summary}</p>
                  </div>
                  <div className="text-xs text-muted-foreground sm:text-right">
                    Due {new Date(action.suggestedDueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {action.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-md bg-muted/40 p-3">
                      <div className="text-xs uppercase text-muted-foreground">{metric.label}</div>
                      <div className="mt-1 text-sm font-medium">{metric.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
