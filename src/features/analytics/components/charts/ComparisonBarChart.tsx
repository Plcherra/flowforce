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
        <Bar dataKey="forms" fill="#6366f1" name="Forms" />
        <Bar dataKey="reports" fill="#f97316" name="Reports" />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
