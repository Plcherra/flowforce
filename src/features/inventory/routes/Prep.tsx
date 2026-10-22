import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";

interface PrepItem {
  id: string;
  name: string;
  currentStock: number;
  parMin: number;
  parMax: number;
  unit: string;
  batchSize: number;
  batchYield: string;
  status: "planned" | "in_progress" | "completed";
  lastPrepped: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "default";
    case "in_progress":
      return "secondary";
    case "planned":
      return "outline";
    default:
      return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return CheckCircle;
    case "in_progress":
      return Clock;
    case "planned":
      return AlertCircle;
    default:
      return AlertCircle;
  }
};

export default function PrepParPage() {
  const { t } = useTranslation();
  const { data: _inventoryItems = [] } = useInventoryItems();
  const { toast } = useToast();

  // Live PAR list is Phase 6. Do not show demo burgers as this company's stock.
  const mockPrepItems: PrepItem[] = [];

  const [prepStatuses, setPrepStatuses] = useState<Record<string, string>>({});

  const calculateNeeded = (item: PrepItem) => {
    const needed = Math.max(0, item.parMax - item.currentStock);
    const batches = Math.ceil(needed / item.batchSize);
    return { needed, batches };
  };

  const handleStatusChange = (itemId: string, newStatus: string) => {
    setPrepStatuses((prev) => ({
      ...prev,
      [itemId]: newStatus,
    }));

    const statusMessages = {
      in_progress: "Prep started",
      completed: "Prep completed",
      planned: "Reset to planned",
    };

    const item = mockPrepItems.find((i) => i.id === itemId);
    toast({
      title: statusMessages[newStatus as keyof typeof statusMessages],
      description: `Updated prep status for ${item?.name}`,
    });
  };

  const getItemStatus = (itemId: string) => {
    return prepStatuses[itemId] || "planned";
  };

  const isWeekend = () => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const completedCount = Object.values(prepStatuses).filter(
    (status) => status === "completed",
  ).length;
  const inProgressCount = Object.values(prepStatuses).filter(
    (status) => status === "in_progress",
  ).length;
  const plannedCount = mockPrepItems.length - completedCount - inProgressCount;

  return (
    <InventoryLayout>
      <IfCan permission="inventory.prep.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <ChefHat className="h-8 w-8" />
                {t("inventory.prepPar")} </h1>
              <p className="text-muted-foreground">
                {isWeekend() ? "Weekend" : "Weekday"} {t("inventory.prepPlanning")}{" "}
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-primary">
                  {completedCount}
                </div>
                <p className="text-xs text-muted-foreground">{t("inventory.completed")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-secondary">
                  {inProgressCount}
                </div>
                <p className="text-xs text-muted-foreground">{t("certifications.inProgress")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-muted-foreground">
                  {plannedCount}
                </div>
                <p className="text-xs text-muted-foreground">{t("inventory.planned")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">
                  {mockPrepItems.length > 0
                    ? Math.round((completedCount / mockPrepItems.length) * 100)
                    : 0}
                  %
                </div>
                <p className="text-xs text-muted-foreground">{t("inventory.complete")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Prep Items */}
          {mockPrepItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{t("inventory.noPrepItemsFound")}</h3>
                <p className="text-muted-foreground">
                  {t("inventory.itemsMarkedForDailyPreparationWillAppearHere")} </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {mockPrepItems.map((item) => {
                const { needed, batches } = calculateNeeded(item);
                const status = getItemStatus(item.id);
                const StatusIcon = getStatusIcon(status);

                return (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        {/* Item Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {item.name}
                            </h3>
                            <Badge
                              variant={getStatusColor(status)}
                              className="flex items-center gap-1"
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.replace("_", " ")}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                {t("inventory.onHand4")} </span>
                              <div className="font-medium">
                                {item.currentStock} {item.unit}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {t("inventory.parMinMax")} </span>
                              <div className="font-medium">
                                {item.parMin}/{item.parMax} {item.unit}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {t("inventory.needToPrep")} </span>
                              <div className="font-medium text-primary">
                                {needed} {item.unit}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                {t("inventory.estimatedBatches")} </span>
                              <div className="font-medium text-primary">
                                ≈ {batches}
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mt-2">
                            {item.batchYield}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          {status === "planned" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusChange(item.id, "in_progress")
                              }
                              className="w-full sm:w-auto"
                            >
                              {t("inventory.startPrep")} </Button>
                          )}

                          {status === "in_progress" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleStatusChange(item.id, "completed")
                              }
                              className="w-full sm:w-auto"
                            >
                              {t("inventory.markComplete")} </Button>
                          )}

                          {status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleStatusChange(item.id, "planned")
                              }
                              className="w-full sm:w-auto"
                            >
                              {t("forms.reset")} </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            {t("inventory.adjustPar")} </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Summary Actions */}
          {mockPrepItems.length > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h3 className="font-semibold">{t("inventory.todaySPrepSummary")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} {t("updates.of")} {mockPrepItems.length} {t("inventory.prepItemsCompleted")} </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">{t("inventory.saveProgress")}</Button>
                  <Button disabled={completedCount !== mockPrepItems.length}>
                    {t("inventory.completeAllPrep")} </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
