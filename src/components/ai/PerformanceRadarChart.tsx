import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface PerformanceData {
  metric: string;
  actual: number;
  target: number;
  fullMark: number;
}

interface PerformanceRadarChartProps {
  data?: PerformanceData[];
  title?: string;
  className?: string;
}

const defaultData: PerformanceData[] = [
  { metric: "Tasks", actual: 85, target: 90, fullMark: 100 },
  { metric: "Schedule", actual: 92, target: 95, fullMark: 100 },
  { metric: "Budget", actual: 78, target: 85, fullMark: 100 },
  { metric: "Productivity", actual: 88, target: 90, fullMark: 100 },
  { metric: "Quality", actual: 91, target: 95, fullMark: 100 },
  { metric: "Customer", actual: 87, target: 90, fullMark: 100 },
];

export default function PerformanceRadarChart({
  data = defaultData,
  title = "Performance vs Target",
  className,
}: PerformanceRadarChartProps) {
  const overallPerformance =
    data.reduce((sum, item) => sum + item.actual / item.target, 0) /
    data.length;
  const performancePercentage = Math.round(overallPerformance * 100);

  const getPerformanceBadge = () => {
    if (performancePercentage >= 95)
      return { variant: "default" as const, label: "Excellent" };
    if (performancePercentage >= 85)
      return { variant: "secondary" as const, label: "Good" };
    if (performancePercentage >= 75)
      return { variant: "outline" as const, label: "Fair" };
    return { variant: "destructive" as const, label: "Needs Improvement" };
  };

  const badge = getPerformanceBadge();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const actual = payload.find((p: any) => p.dataKey === "actual")?.value;
      const target = payload.find((p: any) => p.dataKey === "target")?.value;

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Target:</span>
              <span className="font-medium">{target}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Actual:</span>
              <span
                className={`font-medium ${actual >= target ? "text-green-600" : "text-orange-600"}`}
              >
                {actual}%
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border">
              <span className="text-muted-foreground">Performance:</span>
              <span
                className={`font-medium ${actual >= target ? "text-green-600" : "text-orange-600"}`}
              >
                {Math.round((actual / target) * 100)}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant={badge.variant}>
            {badge.label} ({performancePercentage}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart
            data={data}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <PolarGrid />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Target"
              dataKey="target"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted))"
              fillOpacity={0.3}
            />
            <Radar
              name="Actual"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.4}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
