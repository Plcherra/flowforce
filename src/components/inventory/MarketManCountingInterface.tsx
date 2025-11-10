import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';
import { InventoryService } from '@/features/inventory/services/inventoryService';
import type { InventoryCountLine } from '@/features/inventory/hooks/types';
import { Barcode, Trash } from 'lucide-react';

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
  const barcodeEnabled = useFeatureFlag('inventory.barcodeScanning');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showUnsavedOnly, setShowUnsavedOnly] = useState(false);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        lines
          .map((line) => line.item?.category)
          .filter((category): category is string => Boolean(category))
      )
    );
  }, [lines]);

  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      const itemName = line.item?.name?.toLowerCase() || '';
      const sku = line.item?.sku?.toLowerCase() || '';
      const unitLabel = line.unit?.abbreviation?.toLowerCase() || line.unit?.name?.toLowerCase() || '';
      const term = searchTerm.toLowerCase();

      const matchesSearch = !term || itemName.includes(term) || sku.includes(term) || unitLabel.includes(term);
      const matchesCategory = categoryFilter === 'all' || line.item?.category === categoryFilter;

      const currentQuantity = quantities[line.id];
      const originalQuantity = line.counted_quantity ?? 0;
      const isDirty = currentQuantity !== undefined ? currentQuantity !== originalQuantity : false;
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

  const handleQuantityInput = (lineId: string, value: string) => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      onQuantityChange(lineId, 0);
      return;
    }
    onQuantityChange(lineId, parsed);
  };

  const handleBarcodeLog = async (line: InventoryCountLine) => {
    const scannedCode = window.prompt('Scan or enter the barcode to log for this item:');
    if (!scannedCode) {
      return;
    }

    try {
      await InventoryService.recordCountScan(countId, scannedCode, {
        itemId: line.item_id,
        scanType: 'barcode',
      });
      toast({
        title: 'Scan Logged',
        description: 'Barcode has been recorded for this count.',
      });
    } catch (error) {
      console.error('Error logging barcode scan:', error);
      toast({
        title: 'Scan Failed',
        description: 'Unable to record the barcode scan.',
        variant: 'destructive',
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-64">Item</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Counted</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLines.map((line) => {
              const currentQuantity = quantities[line.id] ?? line.counted_quantity ?? 0;
              const expectedQuantity = line.expected_quantity ?? 0;
              const variance = currentQuantity - expectedQuantity;
              const isDirty = quantities[line.id] !== undefined && currentQuantity !== (line.counted_quantity ?? 0);

              return (
                <TableRow key={line.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{line.item?.name ?? 'Unknown item'}</div>
                      <div className="text-xs text-muted-foreground">
                        {line.item?.sku && <span>SKU: {line.item.sku}</span>}
                        {line.item?.category && <span className="ml-2">Category: {line.item.category}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {line.unit?.abbreviation || line.unit?.name || 'Unit'}
                    </div>
                    {line.conversion_factor && line.conversion_factor !== 1 && (
                      <div className="text-xs text-muted-foreground">
                        × {line.conversion_factor} base units
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {expectedQuantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={currentQuantity}
                      disabled={readOnly}
                      onChange={(event) => handleQuantityInput(line.id, event.target.value)}
                      className="text-right"
                    />
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm ${variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-destructive' : ''}`}>
                    {variance.toFixed(2)}
                  </TableCell>
                  <TableCell>{renderStatusBadge(line, isDirty)}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    {barcodeEnabled && !readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBarcodeLog(line)}
                        title="Log barcode scan"
                      >
                        <Barcode className="h-4 w-4" />
                      </Button>
                    )}
                    {onRemoveLine && !readOnly && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (onRemoveLine) {
                            await onRemoveLine(line.id);
                          }
                        }}
                        title="Remove from count"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredLines.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  No count lines match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          Total items: <strong>{lines.length}</strong>
        </span>
        <span>
          Counted items: <strong>{lines.filter((line) => (quantities[line.id] ?? line.counted_quantity ?? 0) > 0).length}</strong>
        </span>
        <span>
          Unsaved changes: <strong>{unsavedCount}</strong>
        </span>
      </div>
    </div>
  );
}
