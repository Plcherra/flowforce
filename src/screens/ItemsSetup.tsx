import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Search, Filter, Edit, Trash2, History } from 'lucide-react';
import { useInventoryItems, useDeleteInventoryItem } from '@/hooks/useInventory';
import { useInventoryCategories } from '@/features/inventory/hooks/useInventoryCategories';
import InventoryItemForm from '@/components/inventory/InventoryItemForm';
import { InventoryRecipeDialog } from '@/components/inventory/InventoryRecipeDialog';
import { getUnitHierarchyDisplay } from '@/features/inventory/hooks/useItemUnits';
import type { InventoryItem } from '@/features/inventory/hooks/types';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

export default function ItemsSetup() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [recipeItem, setRecipeItem] = useState<InventoryItem | undefined>();
  const [isRecipeDialogOpen, setRecipeDialogOpen] = useState(false);
  
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: categories = [] } = useInventoryCategories();
  const deleteItem = useDeleteInventoryItem();

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredItems = items.filter(item => {
    const matchesSearch = !normalizedSearch ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.description?.toLowerCase().includes(normalizedSearch) ||
      item.sku?.toLowerCase().includes(normalizedSearch) ||
      item.barcode?.toLowerCase().includes(normalizedSearch) ||
      item.preferred_supplier?.name?.toLowerCase().includes(normalizedSearch);

    const matchesCategory = selectedCategory === 'all' ||
      item.category_id === selectedCategory ||
      item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleNewItem = () => {
    setEditingItem(undefined);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await deleteItem.mutateAsync(item.id);
      } catch (error) {
        logger.error('Failed to delete item:', { error, tags: ['error'] });
      }
    }
  };

  const handleManageRecipe = (item: InventoryItem) => {
    setRecipeItem(item);
    setRecipeDialogOpen(true);
  };

  const handleViewHistory = (_item: InventoryItem) => {
    // Feature not yet implemented - could open history dialog
    toast({
      title: "Coming Soon",
      description: "Item history tracking will be available in a future update",
    });
  };

  const getStockStatus = (item: InventoryItem) => {
    if (!item.min_stock_level) return 'unknown';
    const currentStock = item.min_stock_level || 0; // Use min level as proxy for current stock
    if (currentStock < item.min_stock_level) return 'low';
    if (item.max_stock_level && currentStock > item.max_stock_level) return 'high';
    return 'normal';
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'low': return <Badge variant="destructive">Low Stock</Badge>;
      case 'high': return <Badge variant="secondary">Overstocked</Badge>;
      case 'normal': return <Badge variant="default">Normal</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatCurrency = (value?: number | null) =>
    typeof value === 'number' && Number.isFinite(value)
      ? `$${value.toFixed(2)}`
      : 'N/A';

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8" />
              Items & Setup
            </h1>
            <p className="text-muted-foreground">
              Manage inventory items, stock levels, and configurations
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline">Import Items</Button>
            <Button onClick={handleNewItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Items List */}
            {isLoading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                  </div>
                </CardContent>
              </Card>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">
                    {searchTerm || selectedCategory !== 'all' ? 'No Items Found' : 'No Items Yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'Create your first inventory item to get started'
                    }
                  </p>
                  {!searchTerm && selectedCategory === 'all' && (
                    <Button onClick={handleNewItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const baseCost = item.cost_per_unit ?? null;
                  const recipeCost = item.recipe_cost_per_unit ?? item.calculated_cost_per_unit ?? null;
                  const supplierName = item.preferred_supplier?.name || 'No supplier linked';
                  const unitHierarchy = item.units && item.units.length > 0
                    ? getUnitHierarchyDisplay(item.units)
                    : null;
                  const primaryUnit = item.unit?.name
                    ? `${item.unit?.name}${item.unit?.abbreviation ? ` (${item.unit?.abbreviation})` : ''}`
                    : 'N/A';
                  const categoryName = item.category_details?.name || item.category || 'Uncategorized';
                  const recipeLineCount = item.recipes?.[0]?.lines?.length || 0;
                  
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                  {item.name}
                                  {getStockBadge(stockStatus)}
                                </h3>
                                {item.description && (
                                  <p className="text-muted-foreground">{item.description}</p>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                              <div>
                                <span className="font-medium">SKU / Barcode:</span>
                                <p className="text-muted-foreground">
                                  {item.sku || 'N/A'}
                                  {item.barcode ? ` • ${item.barcode}` : ''}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">Category:</span>
                                <p className="text-muted-foreground">{categoryName}</p>
                              </div>
                              <div>
                                <span className="font-medium">Supplier:</span>
                                <p className="text-muted-foreground">{supplierName}</p>
                              </div>
                              <div>
                                <span className="font-medium">Stock Targets:</span>
                                <p className={`font-medium ${
                                  stockStatus === 'low' ? 'text-destructive' : 
                                  stockStatus === 'high' ? 'text-amber-600' : ''
                                }`}>
                                  Min {item.min_stock_level || 0} / Max {item.max_stock_level || '∞'}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">Cost:</span>
                                <p className="text-muted-foreground">Base {formatCurrency(baseCost)}</p>
                                {recipeCost && baseCost !== recipeCost && (
                                  <p className="text-muted-foreground">Recipe {formatCurrency(recipeCost)}</p>
                                )}
                              </div>
                              <div>
                                <span className="font-medium">Location / Unit:</span>
                                <p className="text-muted-foreground">{item.location?.name || 'No location set'}</p>
                                <p className="text-muted-foreground">Unit: {primaryUnit}</p>
                              </div>
                            </div>

                            {unitHierarchy && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Unit hierarchy: {unitHierarchy}
                              </p>
                            )}
                            {recipeLineCount > 0 && (
                              <p className="text-xs text-muted-foreground">
                                Recipe ingredients: {recipeLineCount}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageRecipe(item)}
                            >
                              Recipe
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditItem(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewHistory(item)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteItem(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Organize items into categories</CardDescription>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No categories defined yet
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <Card key={category.id}>
                        <CardContent className="p-4">
                          <h3 className="font-medium">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-muted-foreground">{category.description}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Suppliers</CardTitle>
                <CardDescription>Manage supplier information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Supplier management coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Storage Locations</CardTitle>
                <CardDescription>Configure storage areas and locations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Location management coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Settings</CardTitle>
                <CardDescription>Configure system preferences and defaults</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-4">
                  Settings coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Item Form Dialog */}
        <InventoryItemForm 
          editItem={editingItem}
          open={showItemForm}
          onOpenChange={setShowItemForm}
        />
        {recipeItem && (
          <InventoryRecipeDialog
            item={recipeItem}
            open={isRecipeDialogOpen}
            onOpenChange={(open) => {
              setRecipeDialogOpen(open);
              if (!open) {
                setRecipeItem(undefined);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
