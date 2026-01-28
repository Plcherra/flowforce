import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";
import type { DashboardStats } from "@/features/inventory/hooks/useInventoryDashboard";

interface DashboardStatsProps {
  stats: DashboardStats;
}

export function DashboardStatsCards({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalItems}</div>
          <p className="text-xs text-muted-foreground">
            Active inventory items
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {stats.lowStockItems}
          </div>
          <p className="text-xs text-muted-foreground">Items below minimum</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${stats.totalValue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Current inventory value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prep Status</CardTitle>
          <Badge
            variant={stats.prepCompletion >= 80 ? "default" : "destructive"}
          >
            {stats.prepCompletion}%
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.prepCompletion}%</div>
          <p className="text-xs text-muted-foreground">
            Today's prep completion
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
