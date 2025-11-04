import { AlertTriangle, Stethoscope, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { IdeaKpiInsight } from '@/modules/operations/hooks/useIdeaInsights';
import type { useIdeaDiagnostics } from '@/modules/operations/hooks/useIdeaDiagnostics';
import { useIdeaContext } from '@/modules/operations/contexts/IdeaProvider';
import { useAIKPIInsights } from '@/hooks/useAIKPIInsights';

interface DiagnosePanelProps {
  insights: IdeaKpiInsight[];
  diagnostics: ReturnType<typeof useIdeaDiagnostics>;
  stageDescription: string;
  onRecommend: () => void;
}

export function DiagnosePanel({ insights, diagnostics, stageDescription, onRecommend }: DiagnosePanelProps) {
  const { companyId, range } = useIdeaContext();
  const aiInsightsQuery = useAIKPIInsights(companyId, {
    start: range.start,
    end: range.end,
  });
  const aiInsights = aiInsightsQuery.data ?? [];
  const anomalies = insights.filter((insight) => Math.abs(insight.delta ?? 0) >= 1);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Stethoscope className="h-4 w-4 text-sky-500" />
          Diagnose
        </div>
        <h2 className="text-xl font-semibold text-foreground">Investigate root causes</h2>
        <p className="text-sm text-muted-foreground">{stageDescription}</p>
        <div>
          <Button onClick={onRecommend} disabled={diagnostics.loading}>
            <Target className="mr-2 h-4 w-4" />
            Recommend actions
          </Button>
        </div>
      </header>

      {diagnostics.error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Diagnostics failed</AlertTitle>
          <AlertDescription>{diagnostics.error.message}</AlertDescription>
        </Alert>
      ) : null}

      {diagnostics.loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/60 bg-muted/30">
              <CardHeader>
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border/60 bg-background/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Top anomalies</CardTitle>
              <CardDescription>KPIs with the largest deviations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {anomalies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No significant anomalies detected.</p>
              ) : (
                anomalies.slice(0, 6).map((anomaly) => (
                  <div key={anomaly.id} className="rounded-md border border-border/60 bg-muted/20 p-3">
                    <div className="text-sm font-medium text-foreground">{anomaly.label}</div>
                    <div className="text-xs text-muted-foreground">
                      Change: {anomaly.delta ? anomaly.delta.toFixed(2) : '0.00'} {anomaly.unit ?? ''}
                    </div>
                    <div className="text-xs text-muted-foreground">Trend: {anomaly.trend ?? 'unknown'}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">AI intelligence</CardTitle>
              <CardDescription>Probable causes and narratives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostics.data.causes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Run diagnostics to surface potential causes.</p>
              ) : (
                diagnostics.data.causes.map((cause) => (
                  <div key={cause.id} className="rounded-md border border-border/40 bg-muted/20 p-3">
                    <div className="text-sm font-medium text-foreground">{cause.summary}</div>
                    <div className="text-xs text-muted-foreground">
                      Confidence {Math.round(cause.confidence * 100)}%
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">AI KPI insights</CardTitle>
              <CardDescription>Signals surfaced by GPT co-pilot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiInsightsQuery.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2 rounded-md border border-border/50 bg-muted/20 p-3">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))
              ) : aiInsightsQuery.isError ? (
                <p className="text-sm text-muted-foreground">
                  Unable to load AI KPI insights right now. Try again after refreshing.
                </p>
              ) : aiInsights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  AI KPI insights will populate once diagnostic runs complete.
                </p>
              ) : (
                aiInsights.map((entry) => {
                  const changeValue = typeof entry.change === 'number' ? entry.change : 0;
                  const formattedChange = `${changeValue > 0 ? '+' : ''}${changeValue.toFixed(1)}`;

                  return (
                    <div key={entry.metric} className="space-y-1 rounded-md border border-border/50 bg-muted/20 p-3">
                      <div className="text-sm font-medium text-foreground">{entry.metric}</div>
                      <div className="text-xs text-muted-foreground capitalize">Signal: {entry.signal}</div>
                      <div className="text-xs text-muted-foreground">Change: {formattedChange}%</div>
                      <div className="text-xs text-muted-foreground">Impact: {entry.impact}</div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}

export default DiagnosePanel;
