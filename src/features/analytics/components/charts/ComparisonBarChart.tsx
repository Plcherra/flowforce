/**
 * Comparison bar chart component
 */

import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ComparisonRecord } from "../../types/reports";

interface ComparisonBarChartProps {
  data: ComparisonRecord[];
}

export function ComparisonBarChart({ data }: ComparisonBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ReBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="forms" fill="hsl(var(--primary))" name="Forms" />
        <Bar dataKey="reports" fill="hsl(var(--warning))" name="Reports" />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
