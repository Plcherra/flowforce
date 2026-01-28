/**
 * Status breakdown pie chart component
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import type { StatusBreakdownItem } from "../../types/reports";

interface StatusPieChartProps {
  data: StatusBreakdownItem[];
}

export function StatusPieChart({ data }: StatusPieChartProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
          >
            {data.map((entry) => (
              <Cell key={entry.status} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-3 w-full">
        {data.map((entry) => (
          <div
            key={entry.status}
            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            style={{ borderColor: `${entry.color}33` }}
          >
            <span className="capitalize">{entry.status}</span>
            <Badge
              variant="outline"
              style={{ borderColor: entry.color, color: entry.color }}
            >
              {entry.value}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
