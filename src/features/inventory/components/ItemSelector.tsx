import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Package, Plus } from "lucide-react";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";

interface ItemSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemsSelected: (
    items: Array<{ id: string; name: string }>,
  ) => void;
  excludeIds?: string[];
}

export function ItemSelector({
  open,
  onOpenChange,
  onItemsSelected,
  excludeIds = [],
}: ItemSelectorProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { data: items, isLoading } = useInventoryItems();

  const filteredItems =
    items?.filter(
      (item) =>
        !excludeIds.includes(item.id) &&
        item.name.toLowerCase().includes(search.toLowerCase()),
    ) || [];

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleConfirm = () => {
    const selectedItemsData = Array.from(selectedItems).map((itemId) => {
      const item = filteredItems.find((i) => i.id === itemId);
      return {
        id: itemId,
        name: item?.name || "",
      };
    });

    onItemsSelected(selectedItemsData);
    onOpenChange(false);

    setSelectedItems(new Set());
    setSearch("");
  };

  const handleCancel = () => {
    setSelectedItems(new Set());
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("inventory.selectItemsForCount")} </DialogTitle>
          <DialogDescription>
            {t("inventory.chooseCatalogItemsToIncludeExpectedQuantityComesFromCurrentOnHandNotATypedGuess")} </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t("inventory.searchItems")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Items List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8">{t("inventory.loadingItems")}</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("inventory.noItemsFound")} </div>
            ) : (
              filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={
                    selectedItems.has(item.id) ? "ring-2 ring-primary" : ""
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => handleItemToggle(item.id)}
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        {item.sku && (
                          <p className="text-xs text-muted-foreground">
                            {t("inventory.sku")} {item.sku}
                          </p>
                        )}
                        {item.description && (
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {item.category || "Uncategorized"}
                          </span>
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {item.unit?.name || "No unit"}
                          </span>
                          {item.location && (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {item.location.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Summary */}
          {selectedItems.size > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">
                {selectedItems.size === 1
                  ? t("inventory.oneItemSelected", { count: selectedItems.size })
                  : t("inventory.manyItemsSelected", { count: selectedItems.size })} </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel}>
            {t("common.cancel")} </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedItems.size === 0}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {selectedItems.size === 1
              ? t("inventory.addOneItem", { count: selectedItems.size })
              : t("inventory.addManyItems", { count: selectedItems.size })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
