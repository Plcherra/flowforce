import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface PerformanceKpi {
  id: string;
  label: string;
  value: string;
  description: string;
}

interface PerformanceKpiGridProps {
  metrics: PerformanceKpi[];
  loading: boolean;
}

export function PerformanceKpiGrid({ metrics, loading }: PerformanceKpiGridProps) {
  if (loading && metrics.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-dashed">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!loading && metrics.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base font-semibold">No KPIs available</CardTitle>
          <CardDescription>Connect performance reviews to populate KPIs.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.id} className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{metric.label}</CardTitle>
            <CardDescription>{metric.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default PerformanceKpiGrid;
