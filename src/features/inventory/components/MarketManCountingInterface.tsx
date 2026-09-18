import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import { recordInventoryCountScan } from "@/features/inventory/repositories/countsRepository";
import type { InventoryCountLine } from "@/features/inventory/hooks/types";
import {
  calculateCountVariance,
  clampCountedQuantity,
  summarizeCountLines,
} from "@/features/inventory/utils/stockPosition";
import { Barcode, ChevronLeft, ChevronRight, Trash } from "lucide-react";
import { logger } from "@/utils/logger";

interface MarketManCountingInterfaceProps {
  countId: string;
  lines: InventoryCountLine[];
  quantities: Record<string, number>;
  onQuantityChange: (lineId: string, value: number) => void;
  onRemoveLine?: (lineId: string) => Promise<void> | void;
  readOnly?: boolean;
}

export function MarketManCountingInterface({
  countId,
  lines,
  quantities,
  onQuantityChange,
  onRemoveLine,
  readOnly = false,
}: MarketManCountingInterfaceProps) {
  const { toast } = useToast();
  const barcodeEnabled = useFeatureFlag("inventory.barcodeScanning");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showUnsavedOnly, setShowUnsavedOnly] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        lines
          .map((line) => line.item?.category)
          .filter((category): category is string => Boolean(category)),
      ),
    );
  }, [lines]);

  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      const itemName = line.item?.name?.toLowerCase() || "";
      const sku = line.item?.sku?.toLowerCase() || "";
      const unitLabel =
        line.unit?.abbreviation?.toLowerCase() ||
        line.unit?.name?.toLowerCase() ||
        "";
      const term = searchTerm.toLowerCase();

      const matchesSearch =
        !term ||
        itemName.includes(term) ||
        sku.includes(term) ||
        unitLabel.includes(term);
      const matchesCategory =
        categoryFilter === "all" || line.item?.category === categoryFilter;

      const currentQuantity = quantities[line.id];
      const originalQuantity = line.counted_quantity ?? 0;
      const isDirty =
        currentQuantity !== undefined
          ? currentQuantity !== originalQuantity
          : false;
      const isSaved = Boolean(line.counted_at);
      const matchesUnsaved = !showUnsavedOnly || isDirty || !isSaved;

      return matchesSearch && matchesCategory && matchesUnsaved;
    });
  }, [lines, searchTerm, categoryFilter, showUnsavedOnly, quantities]);

  const unsavedCount = useMemo(() => {
    return lines.reduce((total, line) => {
      if (!(line.id in quantities)) {
        return total;
      }
      const current = quantities[line.id];
      const original = line.counted_quantity ?? 0;
      return current !== original ? total + 1 : total;
    }, 0);
  }, [lines, quantities]);
  const summary = useMemo(
    () => summarizeCountLines(lines, quantities),
    [lines, quantities],
  );

  const focusedLine =
    filteredLines[
      Math.min(focusIndex, Math.max(filteredLines.length - 1, 0))
    ] ?? null;

  const handleQuantityInput = (lineId: string, value: string) => {
    onQuantityChange(lineId, clampCountedQuantity(value));
  };

  const handleBarcodeLog = async (line: InventoryCountLine) => {
    const scannedCode = window.prompt(
      "Scan or enter the barcode to log for this item:",
    );
    if (!scannedCode) {
      return;
    }

    try {
      await recordInventoryCountScan(countId, scannedCode, {
        itemId: line.item_id,
        scanType: "barcode",
      });
      toast({
        title: "Scan Logged",
        description: "Barcode has been recorded for this count.",
      });
    } catch (error) {
      logger.error("Error logging barcode scan:", { error, tags: ["error"] });
      toast({
        title: "Scan Failed",
        description: "Unable to record the barcode scan.",
        variant: "destructive",
      });
    }
  };

  const renderStatusBadge = (line: InventoryCountLine, isDirty: boolean) => {
    if (isDirty) {
      return <Badge variant="secondary">Pending Save</Badge>;
    }

    if (line.counted_at) {
      return <Badge variant="default">Saved</Badge>;
    }

    return <Badge variant="outline">Not Counted</Badge>;
  };

  const renderLineCard = (line: InventoryCountLine, compact = false) => {
    const currentQuantity = quantities[line.id] ?? line.counted_quantity ?? 0;
    const expectedQuantity = line.expected_quantity ?? 0;
    const variance = calculateCountVariance(currentQuantity, expectedQuantity);
    const isDirty =
      quantities[line.id] !== undefined &&
      currentQuantity !== (line.counted_quantity ?? 0);
    const unitLabel = line.unit?.abbreviation || line.unit?.name || "Unit";

    return (
      <Card key={line.id} className={compact ? "" : "border-primary/30"}>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">
                {line.item?.name ?? "Unknown item"}
              </p>
              <p className="text-sm text-muted-foreground">{unitLabel}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {renderStatusBadge(line, isDirty)}
              {!line.counted_at && !isDirty ? (
                <Badge variant="outline">Missing</Badge>
              ) : null}
              {Math.abs(variance) > 0.0001 ? (
                <Badge variant="secondary">Variance</Badge>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Expected
              </p>
              <p className="font-mono text-lg">{expectedQuantity}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Counted
              </p>
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={currentQuantity}
                disabled={readOnly}
                onChange={(event) =>
                  handleQuantityInput(line.id, event.target.value)
                }
                className="h-12 text-center text-xl font-semibold"
              />
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Variance
              </p>
              <p
                className={`font-mono text-lg ${variance > 0 ? "text-emerald-600" : variance < 0 ? "text-destructive" : ""}`}
              >
                {variance.toFixed(2)}
              </p>
            </div>
          </div>

          {!readOnly && (
            <div className="flex justify-end gap-2">
              {barcodeEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleBarcodeLog(line)}
                >
                  <Barcode className="mr-2 h-4 w-4" />
                  Scan
                </Button>
              )}
              {onRemoveLine && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveLine(line.id)}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search items or units..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={showUnsavedOnly}
            onCheckedChange={(checked) => setShowUnsavedOnly(Boolean(checked))}
          />
          Show unsaved only
        </label>
      </div>

      {filteredLines.length === 0 ? (
        <div className="rounded-md border py-8 text-center text-sm text-muted-foreground">
          No count lines match your filters.
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {focusedLine && renderLineCard(focusedLine)}
            {filteredLines.length > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={focusIndex <= 0}
                  onClick={() => setFocusIndex((index) => Math.max(0, index - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {Math.min(focusIndex + 1, filteredLines.length)} of{" "}
                  {filteredLines.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={focusIndex >= filteredLines.length - 1}
                  onClick={() =>
                    setFocusIndex((index) =>
                      Math.min(filteredLines.length - 1, index + 1),
                    )
                  }
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="hidden space-y-2 md:block">
            {filteredLines.map((line) => renderLineCard(line, true))}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          Total items: <strong>{lines.length}</strong>
        </span>
        <span>
          Counted items: <strong>{summary.countedLines}</strong>
        </span>
        <span>
          Unsaved changes: <strong>{unsavedCount}</strong>
        </span>
        <span>
          Missing: <strong>{summary.missingLines}</strong>
        </span>
        <span>
          Variance lines: <strong>{summary.varianceLines}</strong>
        </span>
        <span>
          Net variance: <strong>{summary.netVariance.toFixed(2)}</strong>
        </span>
      </div>
    </div>
  );
}
