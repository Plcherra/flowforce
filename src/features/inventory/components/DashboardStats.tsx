import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, TrendingUp } from "lucide-react";
import type { DashboardStats } from "@/features/inventory/hooks/useInventoryDashboard";

interface DashboardStatsProps {
  stats: DashboardStats;
}

export function DashboardStatsCards({ stats }: DashboardStatsProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("inventory.totalItems")}</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalItems}</div>
          <p className="text-xs text-muted-foreground">
            {t("inventory.activeInventoryItems")} </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("inventory.lowStockAlert")}</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {stats.lowStockItems}
          </div>
          <p className="text-xs text-muted-foreground">{t("inventory.itemsBelowMinimum")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("inventory.totalValue")}</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${stats.totalValue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("inventory.currentInventoryValue")} </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t("inventory.prepStatus")}</CardTitle>
          <Badge
            variant={stats.prepCompletion >= 80 ? "default" : "destructive"}
          >
            {stats.prepCompletion}%
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.prepCompletion}%</div>
          <p className="text-xs text-muted-foreground">
            {t("inventory.todaySPrepCompletion")} </p>
        </CardContent>
      </Card>
    </div>
  );
}
