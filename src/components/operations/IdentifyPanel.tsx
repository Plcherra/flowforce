import { Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { IdeaKpiInsight } from '@/modules/operations/hooks/useIdeaInsights';
import IdeaMetricCard from '@/modules/operations/components/idea/IdeaMetricCard';
import { KPICharts } from '@/components/operations/KPICharts';

interface IdentifyPanelProps {
  insights: IdeaKpiInsight[];
  loading: boolean;
  stageDescription: string;
  onDiagnose: () => void;
}

function InsightsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function IdentifyPanel({ insights, loading, stageDescription, onDiagnose }: IdentifyPanelProps) {
  const hasInsights = insights.length > 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          Identify
        </div>
        <h2 className="text-xl font-semibold text-foreground">Spot operational signals</h2>
        <p className="text-sm text-muted-foreground">{stageDescription}</p>
        <div>
          <Button onClick={onDiagnose} disabled={!hasInsights}>
            <Sparkles className="mr-2 h-4 w-4" />
            Diagnose issues
          </Button>
        </div>
      </header>

      {loading ? (
        <InsightsSkeleton />
      ) : (
        <>
          <KPICharts data={insights} title="KPI movement" />
          {hasInsights ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {insights.map((insight) => (
                <IdeaMetricCard
                  key={insight.id}
                  title={insight.label}
                  value={insight.value}
                  delta={insight.delta ?? undefined}
                  unit={insight.unit ?? undefined}
                  description={insight.trend ? `Trend: ${insight.trend}` : undefined}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default IdentifyPanel;
