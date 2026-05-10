import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2 } from "lucide-react";
import {
  useInventoryRecipes,
  useUpsertRecipeLine,
  useDeleteRecipeLine,
} from "@/features/inventory/hooks/useInventoryRecipes";
import { useInventoryItems } from "@/hooks/useInventory";
import { useInventoryUnits } from "@/features/inventory/hooks/useInventoryUnits";
import type { InventoryItem } from "@/features/inventory/hooks/types";

interface InventoryRecipeDialogProps {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function InventoryRecipeDialog({
  item,
  open,
  onOpenChange,
  trigger,
}: InventoryRecipeDialogProps) {
  const { data: recipeLines = [], isLoading } = useInventoryRecipes(item?.id);
  const upsertLine = useUpsertRecipeLine(item?.id);
  const deleteLine = useDeleteRecipeLine(item?.id);
  const { data: inventoryItems = [] } = useInventoryItems();
  const { data: units = [] } = useInventoryUnits();

  const [formState, setFormState] = useState({
    ingredient_id: "",
    quantity_needed: "",
    unit_id: "",
  });

  const ingredientOptions = useMemo(
    () =>
      inventoryItems.filter((inventoryItem) => inventoryItem.id !== item.id),
    [inventoryItems, item.id],
  );

  const unitOptions = useMemo(
    () => units.filter((unit) => unit.is_active),
    [units],
  );

  const handleAddIngredient = async () => {
    if (
      !formState.ingredient_id ||
      !formState.unit_id ||
      !formState.quantity_needed
    )
      return;

    const quantity = parseFloat(formState.quantity_needed);
    if (!Number.isFinite(quantity) || quantity <= 0) return;

    await upsertLine.mutateAsync({
      id: crypto.randomUUID(), // Generate temporary ID for new lines
      item_id: item.id,
      ingredient_id: formState.ingredient_id,
      quantity_needed: quantity,
      unit_id: formState.unit_id,
      notes: null,
      yield_amount: null,
    });

    setFormState({ ingredient_id: "", quantity_needed: "", unit_id: "" });
  };

  const handleDelete = async (lineId: string) => {
    await deleteLine.mutateAsync(lineId);
  };

  const formatCurrency = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value)
      ? `$${value.toFixed(2)}`
      : "N/A";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recipe Breakdown</DialogTitle>
          <DialogDescription>
            Link ingredients to{" "}
            <span className="font-semibold">{item.name}</span> to calculate
            dynamic costs and automate production usage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ingredients
            </h3>
            <ScrollArea className="max-h-64 rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="w-24 text-right">Quantity</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-24 text-right">Cost</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        Loading ingredients...
                      </TableCell>
                    </TableRow>
                  ) : recipeLines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-sm text-muted-foreground py-6"
                      >
                        No ingredients linked yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recipeLines.map((line) => {
                      const ingredient = line.ingredient;
                      const unit = line.unit;
                      // Type guard to ensure ingredient exists and has cost properties
                      const ingredientCost = ingredient && 'cost_per_unit' in ingredient
                        ? (ingredient.cost_per_unit as number | undefined)
                        : ingredient && 'calculated_cost_per_unit' in ingredient
                          ? (ingredient.calculated_cost_per_unit as number | undefined)
                          : null;
                      const lineCost = ingredientCost
                        ? ingredientCost * (line.quantity_needed || 1)
                        : null;

                      return (
                        <TableRow key={line.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {ingredient && 'name' in ingredient ? (ingredient.name as string) : "Unknown ingredient"}
                              </span>
                              {ingredient && 'sku' in ingredient && ingredient.sku && (
                                <span className="text-xs text-muted-foreground">
                                  SKU: {ingredient.sku as string}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">
                            {line.quantity_needed}
                          </TableCell>
                          <TableCell className="text-sm">
                            {unit?.abbreviation || unit?.name || "unit"}
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">
                            {formatCurrency(lineCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(line.id)}
                              disabled={deleteLine.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Add Ingredient
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Ingredient Item
                </label>
                <Select
                  value={formState.ingredient_id}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, ingredient_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ingredient" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ingredientOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name} {option.sku ? `· ${option.sku}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Quantity
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 0.5"
                  value={formState.quantity_needed}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      quantity_needed: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Unit
                </label>
                <Select
                  value={formState.unit_id}
                  onValueChange={(value) =>
                    setFormState((prev) => ({ ...prev, unit_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {unitOptions.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name} ({unit.abbreviation})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddIngredient}
                disabled={upsertLine.isPending}
                className="h-10"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border p-4 bg-muted/30 text-xs text-muted-foreground space-y-1">
            <p>Primary unit cost: {formatCurrency(item.cost_per_unit)}</p>
            <p>
              Recipe-calculated cost:{" "}
              {formatCurrency(
                item.recipe_cost_per_unit ?? item.calculated_cost_per_unit,
              )}
            </p>
            {item.recipe_yield_quantity && (
              <p>
                Yield: {item.recipe_yield_quantity}{" "}
                {item.recipe_yield_unit?.abbreviation ||
                  item.recipe_yield_unit?.name ||
                  item.unit?.abbreviation ||
                  item.unit?.name}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
