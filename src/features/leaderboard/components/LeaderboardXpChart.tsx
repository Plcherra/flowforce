import { memo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

interface LeaderboardXpChartProps {
  data: { name: string; value: number }[];
}

function LeaderboardXpChart({ data }: LeaderboardXpChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="#888888" fontSize={12} />
        <YAxis stroke="#888888" fontSize={12} />
        <RechartsTooltip
          cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
          formatter={(value: number) => [`${value} XP`, "XP"]}
        />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default memo(LeaderboardXpChart);
