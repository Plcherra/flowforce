import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "@/lib/router-adapter";
import { useQueryClient } from "@tanstack/react-query";
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
  ArrowLeft,
  Calculator,
  CheckCircle,
  Clock,
  AlertCircle,
  Save,
  FileCheck,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useInventoryCounts,
  useInventoryCountLines,
} from "@/features/inventory/hooks/useInventoryCounts";
import { MarketManCountingInterface } from "@/features/inventory/components/MarketManCountingInterface";
import { ItemSelector } from "@/features/inventory/components/ItemSelector";
import { InventoryLayout } from "../components/InventoryLayout";
import { IfCan } from "@/components/permissions/IfCan";
import {
  listInventoryCountEvents,
  saveInventoryCountLineQuantities,
} from "@/features/inventory/repositories/countsRepository";
import {
  clampCountedQuantity,
  summarizeCountLines,
} from "@/features/inventory/utils/stockPosition";
import { logger } from "@/utils/logger";

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "default";
    case "completed":
      return "default";
    case "awaiting_review":
      return "secondary";
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
    case "approved":
      return CheckCircle;
    case "completed":
      return CheckCircle;
    case "in_progress":
      return Clock;
    case "awaiting_review":
      return Clock;
    case "planned":
      return AlertCircle;
    default:
      return AlertCircle;
  }
};

const formatCountType = (type?: string | null) => {
  if (!type) return "Inventory Count";
  return type
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const getPeriodLabel = (period?: string | null) => {
  switch (period) {
    case "day_start":
      return "Day Start";
    case "day_end":
      return "Day End";
    default:
      return "Custom";
  }
};

const formatCountStatus = (status?: string | null) => {
  switch (status) {
    case "approved":
    case "completed":
    case "awaiting_review":
      return "Done";
    default:
      return "Open";
  }
};

const EVENT_ICON_MAP: Record<string, LucideIcon> = {
  created: AlertCircle,
  started: Clock,
  item_counted: CheckCircle,
  note_added: AlertCircle,
  submitted: FileCheck,
  updated: FileCheck,
  approved: CheckCircle,
  rejected: AlertCircle,
  reopened: AlertCircle,
};

interface CountDetailPageProps {
  countId?: string;
}

type CountEvent = {
  id: string;
  event_type: string;
  created_at: string;
  payload?: Record<string, unknown> | null;
  actor?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

export default function CountDetailPage({
  countId: propCountId,
}: CountDetailPageProps) {
  const { countId: paramCountId } = useParams<{ countId: string }>();
  const countId = propCountId || paramCountId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    counts,
    refetch: refetchCounts,
  } = useInventoryCounts();
  const {
    countLines,
    addItemsToCount,
    removeItemFromCount,
    refetch: refetchCountLines,
  } = useInventoryCountLines(countId);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [events, setEvents] = useState<CountEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);

  const count = counts.find((c) => c.id === countId);

  useEffect(() => {
    // Initialize quantities from count lines
    const initialQuantities: Record<string, number> = {};
    countLines.forEach((line) => {
      if (line.counted_at || Number(line.counted_quantity ?? 0) > 0) {
        initialQuantities[line.id] = line.counted_quantity ?? 0;
      }
    });
    setQuantities(initialQuantities);
  }, [countLines]);

  const loadEvents = useCallback(async () => {
    if (!countId) return;
    setLoadingEvents(true);
    try {
      const data = await listInventoryCountEvents(countId);
      setEvents(data as CountEvent[]);
    } catch (error) {
      logger.error("Error loading count events", { error, tags: ["error"] });
    } finally {
      setLoadingEvents(false);
    }
  }, [countId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleQuantityChange = (lineId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [lineId]: clampCountedQuantity(value),
    }));
  };

  const handleSaveAndDone = async () => {
    if (!countId || saving) return;
    setSaving(true);
    try {
      await saveInventoryCountLineQuantities(countId, quantities);
      await queryClient.invalidateQueries({
        queryKey: ["inventory-stock-positions"],
      });
      await queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      await refetchCountLines();
      await refetchCounts();

      toast({
        title: "Count done",
        description: "Saved and registered. Open it anytime to edit again.",
      });
      navigate("/app/inventory/counts");
    } catch {
      toast({
        title: "Error",
        description: "Failed to save the count",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleItemsSelected = async (
    items: Array<{ id: string; name: string }>,
  ) => {
    try {
      await addItemsToCount(
        items.map((item) => ({
          id: item.id,
        })),
      );
      await refetchCountLines();
      await loadEvents();
    } catch {
      // Error handled in hook
    }
  };

  const handleRemoveItem = async (lineId: string) => {
    try {
      await removeItemFromCount(lineId);
      // Remove from local state
      const newQuantities = { ...quantities };
      delete newQuantities[lineId];
      setQuantities(newQuantities);
      await refetchCountLines();
      await loadEvents();
    } catch {
      // Error handled in hook
    }
  };

  if (!count) {
    return (
      <InventoryLayout>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Count not found</h1>
          <Button
            onClick={() => navigate("/app/inventory/counts")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Counts
          </Button>
        </div>
      </InventoryLayout>
    );
  }

  const StatusIcon = getStatusIcon(count.status);
  const countSummary = summarizeCountLines(countLines, quantities);

  return (
    <InventoryLayout>
      <IfCan permission="inventory.counts.view">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate("/app/inventory/counts")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-muted-foreground" />
                    <h1 className="text-2xl font-semibold">
                      {formatCountType(count.count_type)} •{" "}
                      {getPeriodLabel(count.count_period)}
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {new Date(count.count_date).toLocaleDateString()}
                    </span>
                    <Badge
                      variant={getStatusColor(count.status)}
                      className="flex items-center gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {formatCountStatus(count.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <IfCan permission="inventory.counts.edit">
                  <Button onClick={handleSaveAndDone} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save & Done"}
                  </Button>
                </IfCan>
              </div>
            </div>

            {count.locations && count.locations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {count.locations.map((location) => (
                  <Badge key={location.id} variant="secondary">
                    {location.name}
                  </Badge>
                ))}
              </div>
            )}

            {count.description && (
              <p className="text-sm text-muted-foreground">
                {count.description}
              </p>
            )}

            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Save & Done updates on-hand and keeps this count on the list. Open
              it anytime, edit, and Save & Done again.
            </p>
            {countSummary.missingLines > 0 && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                {countSummary.missingLines} line
                {countSummary.missingLines === 1 ? "" : "s"} still missing.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Counted
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {countSummary.countedLines}/{countSummary.totalLines}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Missing
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {countSummary.missingLines}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Variance Lines
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {countSummary.varianceLines}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Net Variance
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {countSummary.netVariance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="counting" className="space-y-6">
            <TabsList>
              <TabsTrigger value="counting">Counting</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="counting">
              <div className="flex justify-end mb-4">
                <IfCan permission="inventory.counts.edit">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowItemSelector(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Items
                  </Button>
                </IfCan>
              </div>
              <MarketManCountingInterface
                countId={countId!}
                lines={countLines}
                quantities={quantities}
                onQuantityChange={handleQuantityChange}
                onRemoveLine={(lineId) => handleRemoveItem(lineId)}
              />
              <ItemSelector
                open={showItemSelector}
                onOpenChange={setShowItemSelector}
                onItemsSelected={handleItemsSelected}
                excludeIds={countLines.map((line) => line.item_id)}
              />
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle>Count History</CardTitle>
                  <CardDescription>Activity log for this count</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingEvents ? (
                    <p className="text-sm text-muted-foreground">
                      Loading activity…
                    </p>
                  ) : events.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No activity recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {events.map((event) => {
                        const Icon =
                          EVENT_ICON_MAP[event.event_type] || AlertCircle;
                        const actorName = event.actor
                          ? `${event.actor.first_name ?? ""} ${event.actor.last_name ?? ""}`.trim() ||
                            "System"
                          : "System";

                        const payload = event.payload || {};
                        const notes =
                          typeof payload.notes === "string"
                            ? payload.notes
                            : null;
                        const itemId =
                          typeof payload.item_id === "string"
                            ? payload.item_id
                            : null;

                        return (
                          <div
                            key={event.id}
                            className="flex items-start gap-3 rounded-lg border p-3"
                          >
                            <Icon className="mt-1 h-4 w-4 text-muted-foreground" />
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm font-medium capitalize">
                                <span>
                                  {event.event_type.replace(/_/g, " ")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                By {actorName}
                              </p>
                              {notes && (
                                <p className="text-sm">{notes}</p>
                              )}
                              {itemId && (
                                <p className="text-xs text-muted-foreground">
                                  Item ID: {itemId}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Count Details</CardTitle>
                  <CardDescription>
                    Information about this inventory count
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <span className="font-medium">Count Type</span>
                      <p>{formatCountType(count.count_type)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Day Part</span>
                      <p>{getPeriodLabel(count.count_period)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Count Date</span>
                      <p>{new Date(count.count_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status</span>
                      <p>{formatCountStatus(count.status)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Created</span>
                      <p>{new Date(count.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="font-medium">Done</span>
                      <p>
                        {count.completed_at
                          ? new Date(count.completed_at).toLocaleString()
                          : "Not done yet"}
                      </p>
                    </div>
                  </div>

                  {(count.description || count.notes) && (
                    <div className="mt-4 space-y-3">
                      {count.description && (
                        <div>
                          <span className="font-medium">Description</span>
                          <p className="text-sm text-muted-foreground">
                            {count.description}
                          </p>
                        </div>
                      )}
                      {count.notes && (
                        <div>
                          <span className="font-medium">Notes</span>
                          <p className="text-sm text-muted-foreground">
                            {count.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </IfCan>
    </InventoryLayout>
  );
}
