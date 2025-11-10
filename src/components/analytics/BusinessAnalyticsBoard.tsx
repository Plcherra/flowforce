import React, { useEffect } from 'react';
import { RefreshCw, Target, Gauge, ShieldCheck, TrendingUp, Activity, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBusinessAnalytics } from '@/hooks/useBusinessAnalytics';
import type { AssistantContext, AssistantInsight } from '@/types/ai';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const preciseCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const percent = (value: number, decimals = 0) => `${value.toFixed(decimals)}%`;

interface BusinessAnalyticsBoardProps {
  companyId?: string | null;
  onContextChange?: (context: AssistantContext | null) => void;
  className?: string;
}

const metricSkeletons = (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {Array.from({ length: 3 }).map((_, index) => (
      <Card key={index}>
        <CardContent className="p-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export function BusinessAnalyticsBoard({ companyId, onContextChange, className }: BusinessAnalyticsBoardProps) {
  const { data, isLoading, isError, refetch } = useBusinessAnalytics({
    companyId,
    horizonDays: 28,
  });

  const snapshot = data?.snapshot;
  const metrics = snapshot?.metrics;
  const breakdown = snapshot?.breakdown;
  const summary = snapshot?.summary;
  const focusAreas = summary?.focusAreas ?? [];
  const positiveSignals = summary?.positiveSignals ?? [];

  useEffect(() => {
    if (!onContextChange) return;

    if (!snapshot || !metrics || !summary) {
      onContextChange(null);
      return;
    }

    const insights: AssistantInsight[] = [
      { title: 'Forecast', detail: summary.headline },
      ...summary.focusAreas.slice(0, 2).map((item) => ({ title: 'Focus', detail: item })),
    ];

    const context: AssistantContext = {
      type: 'report',
      title: 'Business-Level Analytics',
      subtitle: `Generated ${new Date(snapshot.generatedAt).toLocaleString()}`,
      metrics: [
        {
          label: 'Forecast confidence',
          value: percent(metrics.forecastConfidence),
          trend: metrics.forecastConfidence >= 70 ? 'up' : metrics.forecastConfidence <= 55 ? 'down' : 'steady',
          helperText: `Margin ${percent(metrics.marginRate * 100, 0)}`,
        },
        {
          label: 'Goal velocity',
          value: `${metrics.goalVelocity.toFixed(1)} pts/wk`,
          trend: metrics.goalVelocity >= 10 ? 'up' : metrics.goalVelocity <= 7 ? 'down' : 'steady',
          helperText: `${breakdown?.goals.active ?? 0} active goals`,
        },
        {
          label: 'Labor efficiency',
          value: `${metrics.laborEfficiencyIndex.toFixed(0)} index`,
          trend: metrics.laborEfficiencyIndex >= 100 ? 'up' : metrics.laborEfficiencyIndex <= 85 ? 'down' : 'steady',
          helperText: `${preciseCurrencyFormatter.format(metrics.revenuePerLaborHour)}/hr`,
        },
      ],
      insights,
      recommendedActions: summary.focusAreas.slice(0, 3).map((focus, index) => ({
        label: `Review ${index + 1}`,
        action: focus,
        intent: 'analysis',
      })),
    };

    onContextChange(context);
    return () => {
      onContextChange(null);
    };
  }, [snapshot, metrics, summary, breakdown?.goals.active, onContextChange]);

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Business-level analytics</h2>
          <p className="text-sm text-muted-foreground">
            Consolidated KPIs across scheduling, tasks, goals, and revenue to guide planning decisions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.isFallback && <Badge variant="outline">Demo dataset</Badge>}
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {data?.notice && (
        <Alert variant={data.isFallback ? 'warning' : 'default'}>
          <AlertTitle>{data.isFallback ? 'Using simulator defaults' : 'Analytics status'}</AlertTitle>
          <AlertDescription>{data.notice}</AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load analytics</AlertTitle>
          <AlertDescription>Refresh the panel or check your connection.</AlertDescription>
        </Alert>
      )}

      {isLoading && metricSkeletons}

      {!isLoading && snapshot && metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Goal velocity</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.goalVelocity.toFixed(1)} pts/wk</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {breakdown?.goals.active ?? 0} active goals · avg progress {percent(breakdown?.goals.avgProgress ?? 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor efficiency vs revenue</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.laborEfficiencyIndex.toFixed(0)} index</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {preciseCurrencyFormatter.format(metrics.revenuePerLaborHour)} revenue per labor hour
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecast confidence</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{percent(metrics.forecastConfidence)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margin {percent(metrics.marginRate * 100, 0)} · coverage {percent(metrics.scheduleCoverage * 100, 0)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{summary?.headline}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Focus areas</h3>
                  <ul className="space-y-2">
                    {focusAreas.map((item, index) => (
                      <li key={index} className="text-sm leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Positive signals</h3>
                  <ul className="space-y-2">
                    {positiveSignals.length ? (
                      positiveSignals.map((item, index) => (
                        <li key={index} className="text-sm leading-relaxed text-emerald-600">
                          {item}
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground">No major positive signals detected this cycle.</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  Operational breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">Scheduling</div>
                    <div>Coverage {percent((breakdown?.scheduling.coverageRate ?? 0) * 100, 0)}</div>
                  <div>{breakdown?.scheduling.openShifts ?? 0} open shifts · overtime risk {percent((breakdown?.scheduling.overtimeRisk ?? 0) * 100, 0)}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Tasks</div>
                  <div>{breakdown?.tasks.backlog ?? 0} backlog · {breakdown?.tasks.overdue ?? 0} overdue</div>
                  <div>{percent((metrics?.taskThroughputRatio ?? 0) * 100, 0)} throughput vs intake</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Goals</div>
                  <div>{breakdown?.goals.total ?? 0} total · {breakdown?.goals.atRisk ?? 0} at risk</div>
                  <div>Velocity {metrics?.goalVelocity.toFixed(1)} pts/week</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Finance</div>
                  <div>Trailing revenue {currencyFormatter.format(breakdown?.revenue.trailing30 ?? 0)}</div>
                  <div>Forecast next 30d {currencyFormatter.format(breakdown?.revenue.forecastNext30 ?? 0)}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  Predictions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {snapshot.predictions.map((prediction, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{prediction.title}</div>
                      <Badge variant={prediction.impact === 'positive' ? 'default' : prediction.impact === 'negative' ? 'destructive' : 'outline'}>
                        {prediction.value}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{prediction.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">Confidence {percent(prediction.confidence)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default BusinessAnalyticsBoard;
