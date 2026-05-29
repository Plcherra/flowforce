import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Target,
} from "lucide-react";
import { useInventoryWaste } from "@/hooks/useInventory";
import { formatDistanceToNow } from "date-fns";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";
import { Link } from "@/lib/router-adapter";
import {
  calculateWasteOutliers,
  summarizeWasteIntelligence,
} from "@/features/inventory/utils/wasteIntelligence";
import { useMemo } from "react";

const wasteTypeColors: Record<string, string> = {
  spoilage: "bg-red-100 text-red-800",
  prep_error: "bg-orange-100 text-orange-800",
  accident: "bg-yellow-100 text-yellow-800",
  theft: "bg-purple-100 text-purple-800",
  expired: "bg-red-100 text-red-800",
  damaged: "bg-gray-100 text-gray-800",
  production: "bg-amber-100 text-amber-800",
  other: "bg-blue-100 text-blue-800",
};

const wasteTypeLabels: Record<string, string> = {
  spoilage: "Spoilage",
  prep_error: "Prep Error",
  accident: "Accident",
  theft: "Theft",
  expired: "Expired",
  damaged: "Damaged",
  production: "Production",
  other: "Other",
};

export default function WasteTrackingPage() {
  const { data: wasteRecords = [], isLoading } = useInventoryWaste();
  const summary = useMemo(
    () => summarizeWasteIntelligence(wasteRecords),
    [wasteRecords],
  );
  const outliers = useMemo(
    () => calculateWasteOutliers(wasteRecords).slice(0, 3),
    [wasteRecords],
  );

  if (isLoading) {
    return (
      <InventoryLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <IfCan permission="inventory.waste.view">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Waste Tracking
            </h1>
            <p className="text-muted-foreground">
              Monitor and analyze inventory waste across your operations
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Waste Records
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.totalRecords}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time waste events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Quantity Wasted
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.totalQuantity.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Units across all items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Value Lost
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${summary.totalCost.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated cost impact
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  7-Day Trend
                </CardTitle>
                {summary.trendDirection === "down" ? (
                  <TrendingDown className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary.trendPercent.toFixed(0)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  ${summary.currentPeriodCost.toFixed(2)} this week
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" />
                  Highest Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">
                    {summary.topWasteType
                      ? wasteTypeLabels[summary.topWasteType] ??
                        summary.topWasteType
                      : "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item</span>
                  <span className="font-medium">
                    {summary.topItemName ?? "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">
                    {summary.topLocationName ?? "None"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Outliers</CardTitle>
              </CardHeader>
              <CardContent>
                {outliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No high-cost outliers in the current data.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {outliers.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between rounded-lg border p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {record.item?.name || "Unknown Item"}
                          </p>
                          <p className="text-muted-foreground">
                            {wasteTypeLabels[record.waste_type] ??
                              record.waste_type}{" "}
                            · {record.location?.name ?? "No location"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${(record.cost_impact ?? 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.outlier_score.toFixed(1)}x average
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Waste Records */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Waste Events</CardTitle>
            </CardHeader>
            <CardContent>
              {wasteRecords.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No waste records found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Start tracking waste events to monitor your inventory losses
                  </p>
                  <Button asChild>
                    <Link to="/app/inventory/actions">Record Waste</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {wasteRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {record.item?.name || "Unknown Item"}
                            </span>
                            <Badge
                              className={
                                wasteTypeColors[record.waste_type] ??
                                wasteTypeColors.other
                              }
                            >
                              {wasteTypeLabels[record.waste_type] ??
                                record.waste_type}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>
                                {record.quantity}{" "}
                                {record.unit?.name ||
                                  record.item?.unit?.name ||
                                  "units"}
                              </span>
                            </div>

                            {record.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{record.location.name}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(
                                  new Date(record.created_at),
                                  { addSuffix: true },
                                )}
                              </span>
                            </div>

                            {record.cost_impact && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                <span>${record.cost_impact.toFixed(2)}</span>
                              </div>
                            )}
                          </div>

                          {record.reason && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Reason:</strong> {record.reason}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {new Date(record.waste_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
