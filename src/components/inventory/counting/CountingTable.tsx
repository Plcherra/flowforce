import { Save, CheckCircle2, Package, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InventoryItem, InventoryItemUnit } from '@/features/inventory/hooks/types';
import { CountData } from '@/features/inventory/hooks/useCountingStats';

interface CountingTableProps {
  items: InventoryItem[];
  counts: Record<string, CountData>;
  savedItems: Set<string>;
  isCountCompleted: boolean;
  onUpdateCount: (itemId: string, unitId: string, quantity: number) => void;
  onSaveItem: (itemId: string) => void;
  calculateItemTotalPrice: (item: InventoryItem, count: CountData) => number;
  calculateVariance: (item: InventoryItem, count: CountData) => number;
  getVarianceStatus: (variance: number) => { status: string; color: string };
}

export function CountingTable({
  items,
  counts,
  savedItems,
  isCountCompleted,
  onUpdateCount,
  onSaveItem,
  calculateItemTotalPrice,
  calculateVariance: _calculateVariance,
  getVarianceStatus: _getVarianceStatus,
}: CountingTableProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No items match your current filters.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold w-48">Item Details</TableHead>
                <TableHead className="font-semibold w-32">Category</TableHead>
                <TableHead className="font-semibold w-32">Location</TableHead>
                <TableHead className="font-semibold w-24">Min/Max</TableHead>
                <TableHead className="font-semibold w-24">Shelf Life</TableHead>
                <TableHead className="text-center font-semibold">Units to Count</TableHead>
                <TableHead className="text-center font-semibold w-24">Total Price</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const itemCounts = counts[item.id] || { item_id: item.id, unit_counts: {} };
                const isSaved = savedItems.has(item.id);

                const sortedUnits: InventoryItemUnit[] = item.units && item.units.length > 0
                  ? [...item.units].sort((a, b) => a.unit_level - b.unit_level)
                  : [
                      {
                        id: `${item.id}-base`,
                        item_id: item.id,
                        unit_id: item.unit_id,
                        unit_level: 1,
                        conversion_factor: 1,
                        cost_per_unit: item.cost_per_unit ?? null,
                        is_primary: true,
                        is_countable: true,
                        unit: item.unit,
                      } as InventoryItemUnit,
                    ];

                return (
                  <TableRow key={item.id} className={isSaved ? "bg-green-50" : ""}>
                    {/* Item Details */}
                    <TableCell className="p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        )}
                        {item.sku && (
                          <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                        )}
                        {item.is_prep_item && (
                          <Badge variant="secondary" className="text-xs">
                            Prep Item
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell className="p-4">
                      <div className="text-sm">
                        {item.category || <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="p-4">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {item.location?.name || <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>

                    {/* Min/Max Stock */}
                    <TableCell className="p-4">
                      <div className="text-xs space-y-1">
                        {item.min_stock_level && (
                          <div className="text-green-600">Min: {item.min_stock_level}</div>
                        )}
                        {item.max_stock_level && (
                          <div className="text-red-600">Max: {item.max_stock_level}</div>
                        )}
                        {!item.min_stock_level && !item.max_stock_level && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Shelf Life */}
                    <TableCell className="p-4">
                      <div className="text-xs">
                        {item.shelf_life_days ? 
                          `${item.shelf_life_days} days` : 
                          <span className="text-muted-foreground">-</span>
                        }
                      </div>
                    </TableCell>

                    {/* Units to Count */}
                    <TableCell className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          // Calculate total quantity across all units for this item
                          const totalQuantityInBaseUnits = sortedUnits.reduce((total, unit) => {
                            const unitKey = unit.id || unit.unit_id;
                            const unitValue = itemCounts.unit_counts[unitKey] || 0;
                            const factor = unit.conversion_factor || 1;
                            return total + (unitValue * factor);
                          }, 0);
                          
                          // Determine color based on total quantity vs min/max range (only for non-saved items)
                          let colorClass = "";
                          if (!isSaved && (item.min_stock_level || item.max_stock_level)) {
                            const minStock = item.min_stock_level || 0;
                            const maxStock = item.max_stock_level || Infinity;
                            
                            if (totalQuantityInBaseUnits < minStock || totalQuantityInBaseUnits > maxStock) {
                              colorClass = "text-red-600 border-red-300 focus:border-red-500";
                            } else if (totalQuantityInBaseUnits >= minStock && totalQuantityInBaseUnits <= maxStock) {
                              colorClass = "text-green-600 border-green-300 focus:border-green-500";
                            }
                          }
                          
                          return sortedUnits.map(unit => {
                            const unitKey = unit.id || unit.unit_id;
                            const factor = unit.conversion_factor || 1;
                            const unitLabel = unit.unit?.abbreviation || unit.unit?.name || 'unit';

                            return (
                              <div key={unitKey} className="flex flex-col items-center space-y-1">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={itemCounts.unit_counts[unitKey] ?? ''}
                                onChange={(e) => onUpdateCount(item.id, unitKey, parseFloat(e.target.value) || 0)}
                                className={`w-16 text-center font-mono text-xs ${colorClass}`}
                                disabled={isSaved || isCountCompleted}
                              />
                              <span className="text-xs font-medium text-muted-foreground">
                                {unitLabel}
                                {unit.unit_level > 1 ? ` · ${factor}×` : ''}
                              </span>
                            </div>
                            );
                          });
                        })()}
                      </div>
                    </TableCell>

                    {/* Total Price */}
                    <TableCell className="p-4">
                      <div className="text-sm font-medium text-right">
                        ${calculateItemTotalPrice(item, itemCounts).toFixed(2)}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="p-4">
                      {!isSaved && !isCountCompleted ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSaveItem(item.id)}
                          className="h-8"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="h-8 px-2">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {isCountCompleted ? 'Locked' : 'Saved'}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
