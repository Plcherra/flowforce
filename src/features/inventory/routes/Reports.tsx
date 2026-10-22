import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Download,
} from "lucide-react";
import { useInventoryDashboard } from "@/features/inventory/hooks/useInventoryDashboard";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";

// Placeholder data for development - will be replaced with real data
const placeholderReports = {
  lowStock: [],
  waste: [],
  variance: [],
  prep: [],
};

export default function InventoryReportsPage() {
  const { t } = useTranslation();
  const { lowStock } = useInventoryDashboard();

  // Use real data when available, otherwise show empty state
  const lowStockReport = lowStock || [];
  const { waste, variance, prep } = placeholderReports;

  return (
    <InventoryLayout>
      <IfCan permission="reports.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileText className="h-8 w-8" />
                {t("inventory.inventoryReports")} </h1>
              <p className="text-muted-foreground">
                {t("inventory.analyticsAndInsightsForInventoryManagement")} </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                {t("inventory.exportAll")} </Button>
              <Button>{t("inventory.scheduleReports")}</Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">{t("inventory.lowStock")}</span>
                </div>
                <div className="text-2xl font-bold text-destructive">
                  {lowStockReport.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("inventory.itemsBelowMinimum")} </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">{t("inventory.wasteValue")}</span>
                </div>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">{t("schedule.thisWeek")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{t("inventory.avgVariance")}</span>
                </div>
                <div className="text-2xl font-bold">0.0%</div>
                <p className="text-xs text-muted-foreground">{t("inventory.countAccuracy")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-4 w-4 bg-primary rounded-full" />
                  <span className="text-sm font-medium">{t("inventory.prepRate")}</span>
                </div>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground">{t("inventory.completionRate")}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="low-stock" className="space-y-6">
            <TabsList>
              <TabsTrigger value="low-stock">{t("inventory.lowStock")}</TabsTrigger>
              <TabsTrigger value="waste">{t("inventory.wasteAnalysis")}</TabsTrigger>
              <TabsTrigger value="variance">{t("inventory.countVariance")}</TabsTrigger>
              <TabsTrigger value="prep">{t("inventory.prepPerformance")}</TabsTrigger>
            </TabsList>

            <TabsContent value="low-stock">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    {t("inventory.lowStockReport")} </CardTitle>
                  <CardDescription>
                    {t("inventory.itemsCurrentlyBelowMinimumStockLevels")} </CardDescription>
                </CardHeader>
                <CardContent>
                  {lowStockReport.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {t("inventory.noLowStockItemsCurrently")} </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lowStockReport.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t("inventory.current")} {item.current} {item.unit || "units"} {t("inventory.min")} {item.min}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="destructive">
                              {item.current - item.min} {t("inventory.below")} </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("inventory.order")} {Math.abs(item.current - item.min)}{" "}
                              {item.unit || "units"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waste">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    {t("inventory.wasteAnalysisReport")} </CardTitle>
                  <CardDescription>
                    {t("inventory.recentWasteEventsAndCostImpact")} </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <TrendingDown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {t("inventory.noWasteDataAvailableYet")} </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("inventory.wasteTrackingWillAppearHereOnceConfigured")} </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t("inventory.countVarianceReport")} </CardTitle>
                  <CardDescription>
                    {t("inventory.differencesBetweenExpectedAndCountedQuantities")} </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {t("inventory.noCountVarianceDataAvailable")} </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("inventory.varianceReportsWillAppearAfterInventoryCounts")} </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prep">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-primary rounded-full" />
                    {t("inventory.prepPerformanceReport")} </CardTitle>
                  <CardDescription>
                    {t("inventory.dailyPrepCompletionRatesAndEfficiency")} </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="h-12 w-12 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                      <div className="h-5 w-5 bg-background rounded-full" />
                    </div>
                    <p className="text-muted-foreground">
                      {t("inventory.noPrepPerformanceDataAvailable")} </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t("inventory.prepTrackingWillAppearHereOnceConfigured")} </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
