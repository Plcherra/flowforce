import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import {
  useInventoryItems,
  useDeleteInventoryItem,
  useInventoryLocations,
  useInventorySuppliers,
} from "@/hooks/useInventory";
import { asArray, safeArrayFilter } from "@/utils/reactQueryTypes";
import {
  useInventoryCategories,
  useCreateInventoryCategory,
  useUpdateInventoryCategory,
  useDeleteInventoryCategory,
} from "@/features/inventory/hooks/useInventoryCategories";
import {
  useCreateInventoryLocation,
  useUpdateInventoryLocation,
  useDeleteInventoryLocation,
} from "@/features/inventory/hooks/useInventoryLocations";
import {
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "@/features/inventory/hooks/useInventorySuppliers";
import { useInventoryStockPositions } from "@/features/inventory/hooks/useInventoryStockPositions";
import { useInventoryUnits } from "@/features/inventory/hooks/useInventoryUnits";
import { useProfile } from "@/hooks/useProfile";
import InventoryItemForm from "@/features/inventory/components/InventoryItemForm";
import { InventoryRecipeDialog } from "@/features/inventory/components/InventoryRecipeDialog";
import { CatalogCrudPanel } from "@/features/inventory/components/CatalogCrudPanel";
import { getUnitHierarchyDisplay } from "@/features/inventory/hooks/useItemUnits";
import {
  isCatalogReadyForCounts,
  summarizeSetupHealth,
} from "@/features/inventory/utils/itemSetupHealth";
import { isLowStock } from "@/features/inventory/utils/stockPosition";
import type { InventoryItem } from "@/features/inventory/hooks/types";
import { logger } from "@/utils/logger";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ItemsSetup() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>();
  const [recipeItem, setRecipeItem] = useState<InventoryItem | undefined>();
  const [isRecipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const { data: itemsData, isLoading } = useInventoryItems();
  const { data: categoriesData } = useInventoryCategories();
  const { data: locationsData, isLoading: locationsLoading } =
    useInventoryLocations();
  const { data: suppliersData, isLoading: suppliersLoading } =
    useInventorySuppliers(companyId);
  const { data: stockByItem = {} } = useInventoryStockPositions();
  const { data: unitsData, isLoading: unitsLoading } = useInventoryUnits();
  const items = asArray(itemsData);
  const categories = asArray(categoriesData);
  const locations = asArray(locationsData);
  const suppliers = asArray(suppliersData);
  const units = asArray(unitsData);
  const deleteItem = useDeleteInventoryItem();
  const createCategory = useCreateInventoryCategory();
  const updateCategory = useUpdateInventoryCategory();
  const deleteCategory = useDeleteInventoryCategory();
  const createLocation = useCreateInventoryLocation();
  const updateLocation = useUpdateInventoryLocation();
  const deleteLocation = useDeleteInventoryLocation();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const setupSummary = summarizeSetupHealth(items);
  const readyForCounts = isCatalogReadyForCounts({
    locationCount: locations.length,
    items,
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredItems = safeArrayFilter(items, (item) => {
    const matchesSearch =
      !normalizedSearch ||
      item.name.toLowerCase().includes(normalizedSearch) ||
      item.description?.toLowerCase().includes(normalizedSearch) ||
      item.sku?.toLowerCase().includes(normalizedSearch) ||
      item.barcode?.toLowerCase().includes(normalizedSearch) ||
      item.preferred_supplier?.name?.toLowerCase().includes(normalizedSearch);

    const matchesCategory =
      selectedCategory === "all" ||
      item.categoryid === selectedCategory ||
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

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await deleteItem.mutateAsync(itemToDelete.id);
      setItemToDelete(null);
    } catch (error) {
      logger.error("Failed to delete item:", { error, tags: ["error"] });
    }
  };

  const handleManageRecipe = (item: InventoryItem) => {
    setRecipeItem(item);
    setRecipeDialogOpen(true);
  };

  const getStockStatus = (item: InventoryItem) => {
    const onHand = stockByItem[item.id]?.onHand ?? 0;
    if (isLowStock(onHand, item.min_stock_level)) return "low";
    if (
      item.max_stock_level &&
      Number(item.max_stock_level) > 0 &&
      onHand > item.max_stock_level
    ) {
      return "high";
    }
    return "normal";
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case "low":
        return <Badge variant="destructive">{t("inventory.lowStock")}</Badge>;
      case "high":
        return <Badge variant="secondary">{t("inventory.overstocked")}</Badge>;
      case "normal":
        return <Badge variant="default">{t("messages.normal")}</Badge>;
      default:
        return <Badge variant="outline">{t("inventory.unknown")}</Badge>;
    }
  };

  const formatCurrency = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value)
      ? `$${value.toFixed(2)}`
      : "N/A";

  const getSetupBadge = (item: InventoryItem) => {
    const health = item.setup_health;
    if (!health) return <Badge variant="outline">{t("inventory.setupUnknown")}</Badge>;

    if (health.status === "ready") {
      return <Badge className="bg-success text-primary-foreground">{t("inventory.readyForCounts")}</Badge>;
    }

    if (health.status === "warning") {
      return <Badge variant="secondary">{t("inventory.setupWarnings")}</Badge>;
    }

    return <Badge variant="destructive">{t("inventory.setupIncomplete")}</Badge>;
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8" />
              {t("common.itemsSetup")} </h1>
            <p className="text-muted-foreground">
              {t("inventory.manageInventoryItemsStockLevelsAndConfigurations")} </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleNewItem}>
              <Plus className="h-4 w-4 mr-2" />
              {t("inventory.addItem")} </Button>
          </div>
        </div>

        <Card className={readyForCounts ? "border-success/40" : "border-warning/40"}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {t("inventory.readyForCounts")} </p>
            <p className="mt-2 text-lg font-semibold">
              {readyForCounts
                ? "Catalog has a unit and at least one room"
                : "Add a storage room and an item unit before starting a count"}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t("inventory.setupReady")} </p>
              <p className="mt-2 text-2xl font-semibold">
                {setupSummary.readyPercent}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t("inventory.countReadyItems")} </p>
              <p className="mt-2 text-2xl font-semibold">
                {setupSummary.ready}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t("tasks.warnings")} </p>
              <p className="mt-2 text-2xl font-semibold">
                {setupSummary.warning}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t("inventory.incomplete")} </p>
              <p className="mt-2 text-2xl font-semibold text-destructive">
                {setupSummary.incomplete}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="categories">{t("inventory.categories")}</TabsTrigger>
            <TabsTrigger value="suppliers">{t("inventory.suppliers")}</TabsTrigger>
            <TabsTrigger value="locations">{t("inventory.locations")}</TabsTrigger>
            <TabsTrigger value="units">{t("inventory.units4")}</TabsTrigger>
            <TabsTrigger value="settings">{t("common.settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t("inventory.searchItems")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("inventory.allCategories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("inventory.allCategories")}</SelectItem>
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
                    {searchTerm || selectedCategory !== "all"
                      ? "No Items Found"
                      : "No Items Yet"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || selectedCategory !== "all"
                      ? "Try adjusting your search or filters"
                      : "Create your first inventory item to get started"}
                  </p>
                  {!searchTerm && selectedCategory === "all" && (
                    <Button onClick={handleNewItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("inventory.addFirstItem")} </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => {
                  const stockStatus = getStockStatus(item);
                  const onHand = stockByItem[item.id]?.onHand ?? 0;
                  const stockValue = stockByItem[item.id]?.value ?? 0;
                  const baseCost = item.cost_per_unit ?? null;
                  const recipeCost =
                    item.recipe_cost_per_unit ??
                    item.calculated_cost_per_unit ??
                    null;
                  const supplierName =
                    item.preferred_supplier?.name || "No supplier linked";
                  const unitHierarchy =
                    item.units && item.units.length > 0
                      ? getUnitHierarchyDisplay(item.units)
                      : null;
                  const primaryUnit = item.unit?.name
                    ? `${item.unit?.name}${item.unit?.abbreviation ? ` (${item.unit?.abbreviation})` : ""}`
                    : "N/A";
                  const categoryName =
                    item.category_details?.name ||
                    item.category ||
                    "Uncategorized";
                  const recipeLineCount = item.recipes?.[0]?.lines?.length || 0;

                  return (
                    <Card key={item.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-lg flex flex-wrap items-center gap-2">
                                  {item.name}
                                  {getStockBadge(stockStatus)}
                                  {getSetupBadge(item)}
                                </h3>
                                {item.description && (
                                  <p className="text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                              <div>
                                <span className="font-medium">
                                  {t("inventory.skuBarcode")} </span>
                                <p className="text-muted-foreground">
                                  {item.sku || "N/A"}
                                  {item.barcode ? ` • ${item.barcode}` : ""}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">{t("updates.category")}</span>
                                <p className="text-muted-foreground">
                                  {categoryName}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">{t("inventory.supplier2")}</span>
                                <p className="text-muted-foreground">
                                  {supplierName}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">{t("inventory.onHand3")}</span>
                                <p
                                  className={`font-medium ${
                                    stockStatus === "low"
                                      ? "text-destructive"
                                      : stockStatus === "high"
                                        ? "text-warning"
                                        : ""
                                  }`}
                                >
                                  {onHand} {item.unit?.abbreviation || ""}
                                </p>
                                <p className="text-muted-foreground">
                                  {t("forms.min")} {item.min_stock_level || 0} {t("inventory.parMax")}{" "}
                                  {item.max_stock_level || "∞"}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">{t("inventory.value2")}</span>
                                <p className="text-muted-foreground">
                                  {formatCurrency(stockValue)}
                                </p>
                                <p className="text-muted-foreground">
                                  {t("inventory.fallback")} {formatCurrency(baseCost)}
                                </p>
                                {recipeCost && baseCost !== recipeCost && (
                                  <p className="text-muted-foreground">
                                    {t("inventory.recipe")} {formatCurrency(recipeCost)}
                                  </p>
                                )}
                              </div>
                              <div>
                                <span className="font-medium">
                                  {t("inventory.locationUnit")} </span>
                                <p className="text-muted-foreground">
                                  {item.location?.name || "No location set"}
                                </p>
                                <p className="text-muted-foreground">
                                  {t("inventory.unit")} {primaryUnit}
                                </p>
                              </div>
                            </div>

                            {unitHierarchy && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {t("inventory.unitHierarchy")} {unitHierarchy}
                              </p>
                            )}
                            {recipeLineCount > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {t("inventory.recipeIngredients")} {recipeLineCount}
                              </p>
                            )}
                            {item.setup_health?.issues.length ? (
                              <div className="mt-4 rounded-md border border-warning/40 bg-warning-muted p-3 text-sm text-warning-foreground">
                                <div className="flex items-center gap-2 font-medium">
                                  <ShieldCheck className="h-4 w-4" />
                                  {t("inventory.setupFixesNeeded")} </div>
                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                  {item.setup_health.issues
                                    .slice(0, 3)
                                    .map((issue) => (
                                      <li key={issue.code}>{issue.message}</li>
                                    ))}
                                </ul>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleManageRecipe(item)}
                            >
                              {t("inventory.recipe")} </Button>
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
                              onClick={() => setItemToDelete(item)}
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
            <CatalogCrudPanel
              title={t("inventory.categories")}
              description="Organize items into categories"
              emptyLabel="No categories yet"
              items={categories.map((category) => ({
                id: category.id,
                name: category.name,
                detail: category.description,
              }))}
              onCreate={(name) => createCategory.mutateAsync({ name })}
              onRename={(id, name) => updateCategory.mutateAsync({ id, name })}
              onDelete={(id) => deleteCategory.mutateAsync(id)}
              isPending={
                createCategory.isPending ||
                updateCategory.isPending ||
                deleteCategory.isPending
              }
            />
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-4">
            <CatalogCrudPanel
              title={t("inventory.suppliers")}
              description="Preferred vendors for purchasing"
              emptyLabel="No suppliers yet"
              items={suppliers.map((supplier) => ({
                id: supplier.id,
                name: supplier.name,
              }))}
              isLoading={suppliersLoading}
              onCreate={(name) => createSupplier.mutateAsync({ name })}
              onRename={(id, name) => updateSupplier.mutateAsync({ id, name })}
              onDelete={(id) => deleteSupplier.mutateAsync(id)}
              isPending={
                createSupplier.isPending ||
                updateSupplier.isPending ||
                deleteSupplier.isPending
              }
            />
          </TabsContent>

          <TabsContent value="locations" className="space-y-4">
            <CatalogCrudPanel
              title={t("inventory.storageRooms")}
              description="Walk-in, freezer, dry storage, and other count rooms"
              emptyLabel="No storage rooms yet. Add one before counts."
              createLabel="Add room"
              items={locations.map((location) => ({
                id: location.id,
                name: location.name,
                detail: location.location_type,
              }))}
              isLoading={locationsLoading}
              onCreate={(name) =>
                createLocation.mutateAsync({
                  name,
                  location_type: "storage",
                })
              }
              onRename={(id, name) =>
                updateLocation.mutateAsync({ id, name })
              }
              onDelete={(id) => deleteLocation.mutateAsync(id)}
              isPending={
                createLocation.isPending ||
                updateLocation.isPending ||
                deleteLocation.isPending
              }
            />
          </TabsContent>

          <TabsContent value="units" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("inventory.catalogUnits")}</CardTitle>
                <CardDescription>
                  {t("inventory.sharedCountWeightAndVolumeUnitsPickOneAsTheItemBaseUnitSuchAsPoundLb")} </CardDescription>
              </CardHeader>
              <CardContent>
                {unitsLoading ? (
                  <p className="text-sm text-muted-foreground">{t("inventory.loadingUnits2")}</p>
                ) : units.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("inventory.noCatalogUnitsAreAvailableYet")} </p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {units.map((unit) => (
                      <li
                        key={unit.id}
                        className="rounded-md border px-3 py-2 text-sm"
                      >
                        <p className="font-medium">
                          {unit.name} ({unit.abbreviation})
                        </p>
                        <p className="text-muted-foreground">{unit.unit_type}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("inventory.countReadiness")}</CardTitle>
                <CardDescription>
                  {t("inventory.aCountNeedsACatalogUnitAndAtLeastOneStorageRoom")} </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{t("inventory.rooms")} {locations.length}</p>
                <p>{t("inventory.catalogUnits2")} {units.length}</p>
                <p>{t("inventory.itemsWithAUnit")} {items.filter((item) => item.unitid).length}</p>
                <p>
                  {readyForCounts
                    ? "This catalog can stand a count."
                    : "Not ready for counts yet."}
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
        >
          <span className="sr-only">{t("forms.addItem")}</span>
        </InventoryItemForm>
        <AlertDialog
          open={Boolean(itemToDelete)}
          onOpenChange={(open) => {
            if (!open) setItemToDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("common.delete")} {itemToDelete?.name}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("inventory.thisRemovesTheItemFromTheCatalogYouCanAddItAgainLater")} </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleDeleteItem()}>
                {t("inventory.deleteItem")} </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
  );
}
