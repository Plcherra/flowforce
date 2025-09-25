import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { 
  Search, 
  Filter, 
  Package, 
  Calculator, 
  Eye, 
  EyeOff,
  Save,
  CheckCircle2
} from 'lucide-react';
import { 
  useEnhancedInventoryItems, 
  formatUnitDisplay, 
  convertBetweenUnits, 
  type EnhancedInventoryItem,
  type ItemUnit
} from '@/hooks/inventory/useItemUnits';

interface CountData {
  item_id: string;
  unit_counts: Record<string, number>; // unit_id -> quantity
  notes: string;
  is_completed: boolean;
}

interface EnhancedCountingTableProps {
  countId: string;
  onCountUpdate?: (counts: Record<string, CountData>) => void;
}

export function EnhancedCountingTable({ countId, onCountUpdate }: EnhancedCountingTableProps) {
  const { items, isLoading } = useEnhancedInventoryItems();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUncountedOnly, setShowUncountedOnly] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [counts, setCounts] = useState<Record<string, CountData>>({});
  const [savedItems, setSavedItems] = useState<Set<string>>(new Set());

  // Initialize count data for each item
  useEffect(() => {
    const initialCounts: Record<string, CountData> = {};
    items.forEach(item => {
      if (!counts[item.id]) {
        initialCounts[item.id] = {
          item_id: item.id,
          unit_counts: {},
          notes: '',
          is_completed: false
        };
      }
    });
    if (Object.keys(initialCounts).length > 0) {
      setCounts(prev => ({ ...prev, ...initialCounts }));
    }
  }, [items]);

  // Filter items based on search and filters
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || item.category === selectedGroup;
    const matchesUncounted = !showUncountedOnly || !counts[item.id]?.is_completed;
    
    return matchesSearch && matchesGroup && matchesUncounted;
  });

  // Get unique categories for filtering
  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  const updateCount = (itemId: string, unitId: string, quantity: number) => {
    setCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        unit_counts: {
          ...prev[itemId]?.unit_counts,
          [unitId]: quantity
        }
      }
    }));
  };

  const updateNotes = (itemId: string, notes: string) => {
    setCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes
      }
    }));
  };

  const saveItem = (itemId: string) => {
    setCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        is_completed: true
      }
    }));
    setSavedItems(prev => new Set(prev.add(itemId)));
  };

  const calculateTotalValue = (item: EnhancedInventoryItem, itemCounts: CountData) => {
    if (!item.primary_unit || !itemCounts.unit_counts[item.primary_unit.id]) {
      return 0;
    }
    const quantity = itemCounts.unit_counts[item.primary_unit.id];
    const cost = item.primary_unit.cost_per_unit || item.cost_per_unit || 0;
    return quantity * cost;
  };

  const calculateVariance = (item: EnhancedInventoryItem, itemCounts: CountData): number => {
    if (!item.base_unit || !itemCounts.unit_counts[item.base_unit.id]) {
      return 0;
    }
    
    // Convert counted quantity to base units
    const countedInBaseUnits = Object.entries(itemCounts.unit_counts)
      .reduce((total, [unitId, quantity]) => {
        const unit = item.units.find((u: ItemUnit) => u.id === unitId);
        if (unit) {
          return total + (quantity * unit.conversion_factor);
        }
        return total;
      }, 0);

    const expectedQuantity = item.min_stock_level || 0;
    return countedInBaseUnits - expectedQuantity;
  };

  const getVarianceStatus = (variance: number) => {
    const absVariance = Math.abs(variance);
    if (absVariance === 0) return { status: 'accurate', color: 'bg-green-100 text-green-800' };
    if (absVariance <= 5) return { status: 'minor', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'significant', color: 'bg-red-100 text-red-800' };
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading inventory items...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Count - MarketMan Style
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="uncounted-only"
                checked={showUncountedOnly}
                onCheckedChange={(checked) => setShowUncountedOnly(!!checked)}
              />
              <label htmlFor="uncounted-only" className="text-sm font-medium flex items-center gap-2">
                {showUncountedOnly ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                Uncounted Only
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Counting Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-80 font-semibold">Item</TableHead>
                  <TableHead className="text-center font-semibold">UNIT 1</TableHead>
                  <TableHead className="text-center font-semibold">UNIT 2</TableHead>
                  <TableHead className="text-center font-semibold">UNIT 3</TableHead>
                  <TableHead className="text-center font-semibold">UNIT 4</TableHead>
                  <TableHead className="text-center font-semibold">Value</TableHead>
                  <TableHead className="text-center font-semibold">On Hand</TableHead>
                  <TableHead className="text-center font-semibold">Variance</TableHead>
                  <TableHead className="text-center font-semibold">Status</TableHead>
                  <TableHead className="text-center font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const itemCounts = counts[item.id] || { 
                    item_id: item.id, 
                    unit_counts: {}, 
                    notes: '', 
                    is_completed: false 
                  };
                  const variance = calculateVariance(item, itemCounts);
                  const varianceStatus = getVarianceStatus(variance);
                  const totalValue = calculateTotalValue(item, itemCounts);
                  const isSaved = savedItems.has(item.id);
                  const sortedUnits = item.units
                    .filter(u => u.is_countable)
                    .sort((a, b) => a.unit_level - b.unit_level)
                    .slice(0, 4); // Show up to 4 unit levels

                  return (
                    <TableRow 
                      key={item.id} 
                      className={`hover:bg-muted/25 ${isSaved ? 'bg-green-50 dark:bg-green-950/20' : ''}`}
                    >
                      {/* Item Info */}
                      <TableCell className="p-4">
                        <div className="space-y-1">
                          <div className="font-medium">{item.name}</div>
                          {item.sku && (
                            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Category: {item.category || 'Uncategorized'}
                          </div>
                          {item.location && (
                            <div className="text-xs text-muted-foreground">
                              Location: {item.location.name}
                            </div>
                          )}
                          <div className="text-xs font-mono text-blue-600">
                            Units: {item.units.map(u => u.unit?.abbreviation).join(' → ')}
                          </div>
                        </div>
                      </TableCell>

                      {/* Unit Input Columns */}
                      {[0, 1, 2, 3].map(index => {
                        const unit = sortedUnits[index];
                        if (!unit) {
                          return <TableCell key={index} className="text-center">-</TableCell>;
                        }

                        return (
                          <TableCell key={unit.id} className="p-2">
                            <div className="flex flex-col items-center space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                {formatUnitDisplay(unit)}
                              </div>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={itemCounts.unit_counts[unit.id] || ''}
                                onChange={(e) => updateCount(item.id, unit.id, parseFloat(e.target.value) || 0)}
                                className="w-20 text-center font-mono text-sm"
                              />
                            </div>
                          </TableCell>
                        );
                      })}

                      {/* Value Column */}
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {totalValue > 0 ? `$${totalValue.toFixed(2)}` : '-'}
                        </span>
                      </TableCell>

                      {/* On Hand (Expected) */}
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {item.min_stock_level || 0}
                        </span>
                      </TableCell>

                      {/* Variance */}
                      <TableCell className="text-center">
                        {variance !== 0 && (
                          <span className={`font-mono text-sm ${
                            variance > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {variance > 0 ? '+' : ''}{variance.toFixed(2)}
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {isSaved ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <Badge className={varianceStatus.color} variant="outline">
                            {varianceStatus.status}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveItem(item.id)}
                          disabled={isSaved}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{savedItems.size}</div>
            <div className="text-sm text-muted-foreground">Items Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{filteredItems.length - savedItems.size}</div>
            <div className="text-sm text-muted-foreground">Remaining</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              ${Object.values(counts).reduce((total, count) => {
                const item = items.find(i => i.id === count.item_id);
                return total + (item ? calculateTotalValue(item, count) : 0);
              }, 0).toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-600">
              {Object.values(counts).filter(count => {
                const item = items.find(i => i.id === count.item_id);
                return item && Math.abs(calculateVariance(item, count)) > 5;
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">Significant Variances</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}