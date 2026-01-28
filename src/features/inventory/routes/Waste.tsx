import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Package,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useInventoryWaste } from "@/hooks/useInventory";
import { formatDistanceToNow } from "date-fns";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";
import { Link } from "react-router-dom";

const wasteTypeColors = {
  spoilage: "bg-red-100 text-red-800",
  prep_error: "bg-orange-100 text-orange-800",
  accident: "bg-yellow-100 text-yellow-800",
  theft: "bg-purple-100 text-purple-800",
  expired: "bg-red-100 text-red-800",
  damaged: "bg-gray-100 text-gray-800",
  other: "bg-blue-100 text-blue-800",
};

const wasteTypeLabels = {
  spoilage: "Spoilage",
  prep_error: "Prep Error",
  accident: "Accident",
  theft: "Theft",
  expired: "Expired",
  damaged: "Damaged",
  other: "Other",
};

export default function WasteTrackingPage() {
  const { data: wasteRecords = [], isLoading } = useInventoryWaste();

  const totalWasteValue = wasteRecords.reduce(
    (sum, record) => sum + (record.cost_impact || 0),
    0,
  );
  const totalWasteQuantity = wasteRecords.reduce(
    (sum, record) => sum + record.quantity,
    0,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Waste Records
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{wasteRecords.length}</div>
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
                  {totalWasteQuantity.toFixed(1)}
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
                  ${totalWasteValue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated cost impact
                </p>
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
                    <Link to="/inventory/actions">Record Waste</Link>
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
                              className={wasteTypeColors[record.waste_type]}
                            >
                              {wasteTypeLabels[record.waste_type]}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              <span>
                                {record.quantity}{" "}
                                {record.item?.unit?.name || "units"}
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
