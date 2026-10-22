/**
 * Volume trend line chart component
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface VolumeTrendChartProps {
  data: Array<{ date: string; reports: number; forms: number }>;
}

export function VolumeTrendChart({ data }: VolumeTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="forms" stroke="hsl(var(--primary))" name="Forms" />
        <Line
          type="monotone"
          dataKey="reports"
          stroke="hsl(var(--success))"
          name="Reports"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
