import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/modules/system/components/EmptyState";

type KPIInsightLike = {
  metric?: string;
  name?: string;
  label?: string;
  value?: number | null;
  change?: number | null;
};

interface KPIChartsProps {
  data?: KPIInsightLike[] | null;
  title?: string;
}

export function KPICharts({
  data,
  title = "KPI Insights Overview",
}: KPIChartsProps) {
  const metrics =
    data?.map((datum) => ({
      name: datum.metric ?? datum.name ?? datum.label ?? "Metric",
      value: datum.value ?? datum.change ?? 0,
    })) ?? [];

  const hasData = metrics.some(
    (metric) => typeof metric.value === "number" && metric.value !== 0,
  );

  if (!data?.length) {
    return (
      <EmptyState
        title="No KPI insights found."
        description="Connect data sources or adjust the selected time range to generate performance signals."
      />
    );
  }

  return (
    <Card className="border-border/60 bg-background/80 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Metrics available, but all values are zero for the selected range.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default KPICharts;
