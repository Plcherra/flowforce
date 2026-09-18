import React, { useMemo } from "react";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import { useInventoryWaste } from "@/features/inventory/hooks/useInventoryWaste";
import { useInventoryStockPositions } from "@/features/inventory/hooks/useInventoryStockPositions";
import { Link } from "@/lib/router-adapter";
import { formatCurrency } from "@/shared/utils";
import { asArray } from "@/utils/reactQueryTypes";
import {
  countLowStockItems,
  totalStockValue,
} from "@/features/inventory/utils/stockPosition";

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

export default function InventoryDashboard() {
  const { data: itemsData, isLoading: itemsLoading } = useInventoryItems();
  const { data: wasteData, isLoading: wasteLoading } = useInventoryWaste();
  const { data: stockByItem = {}, isLoading: stockLoading } =
    useInventoryStockPositions();
  const items = asArray(itemsData);
  const wasteRecords = asArray(wasteData);
  const itemCount = items.length;
  const lowStockCount = countLowStockItems(items, stockByItem);
  const inventoryValue = totalStockValue(stockByItem);

  const wasteThisMonth = useMemo(() => {
    const monthStart = startOfCurrentMonth();
    return wasteRecords.reduce((sum, record) => {
      const recordedAt = new Date(
        record.waste_date ?? record.created_at,
      ).getTime();
      if (Number.isNaN(recordedAt) || recordedAt < monthStart) {
        return sum;
      }
      return sum + (Number(record.cost_impact) || 0);
    }, 0);
  }, [wasteRecords]);

  return (
    <InventoryLayout>
      <IfCan permission="inventory.view">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Items
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {itemsLoading ? "—" : itemCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {itemCount === 0 && !itemsLoading
                    ? "No items yet"
                    : "Active inventory items"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Low Stock Items
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {itemsLoading || stockLoading ? "—" : lowStockCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lowStockCount === 0
                    ? "On-hand is at or above min"
                    : "On-hand below min"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Inventory Value
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stockLoading ? "—" : formatCurrency(inventoryValue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {inventoryValue === 0
                    ? "No count or receive yet"
                    : "On-hand × cost basis"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Waste This Month
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {wasteLoading ? "—" : formatCurrency(wasteThisMonth)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {wasteThisMonth === 0 && !wasteLoading
                    ? "No waste recorded"
                    : "Logged waste cost"}
                </p>
              </CardContent>
            </Card>
          </div>

          {itemCount === 0 && !itemsLoading && (
            <Card>
              <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">No items yet</h2>
                  <p className="text-sm text-muted-foreground">
                    Add an item to start the catalog, or start a count once
                    items exist.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to="/app/inventory/items">Add item</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/app/inventory/counts">Start count</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
