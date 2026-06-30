import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { InventoryItem } from "@/features/inventory/hooks/types";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface IngredientRow {
  ingredientId: string;
  quantity: number;
}

interface NutritionForm {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
}

interface CreateRecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems: InventoryItem[];
  onCreate?: (payload: {
    item_id: string;
    ingredients: IngredientRow[];
    yield_quantity: number;
    notes?: string;
    nutrition?: NutritionForm;
  }) => Promise<void>;
}

export function CreateRecipeDialog({
  open,
  onOpenChange,
  inventoryItems,
  onCreate,
}: CreateRecipeDialogProps) {
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { ingredientId: "", quantity: 0 },
  ]);
  const [yieldQty, setYieldQty] = useState<string>("1");
  const [notes, setNotes] = useState("");
  const [nutrition, setNutrition] = useState<NutritionForm>({});
  const [saving, setSaving] = useState(false);

  const recipeCandidates = useMemo(() => {
    const prepItems = inventoryItems.filter((item) => item.isprep_item);
    return prepItems.length ? prepItems : inventoryItems;
  }, [inventoryItems]);

  const ingredientCandidates = useMemo(() => {
    if (!selectedItemId) return inventoryItems;
    return inventoryItems.filter((item) => item.id !== selectedItemId);
  }, [inventoryItems, selectedItemId]);

  const resetForm = () => {
    setSelectedItemId("");
    setIngredients([{ ingredientId: "", quantity: 0 }]);
    setYieldQty("1");
    setNotes("");
    setNutrition({});
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedItemId) {
      toast({
        title: "Select a recipe item",
        description: "Choose which inventory item this recipe produces.",
        variant: "destructive",
      });
      return;
    }

    const validIngredients = ingredients.filter(
      (row) => row.ingredientId && row.quantity > 0,
    );
    if (!validIngredients.length) {
      toast({
        title: "Add ingredients",
        description:
          "Recipes require at least one ingredient linked to an inventory item.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await onCreate?.({
        item_id: selectedItemId,
        ingredients: validIngredients,
        yield_quantity: Number(yieldQty) || 1,
        notes,
        nutrition,
      });
      toast({
        title: "Recipe draft created",
        description:
          "The recipe is ready to sync with Supabase once migrations run.",
      });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : undefined;
      toast({
        title: "Failed to create recipe",
        description: message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateIngredient = (index: number, patch: Partial<IngredientRow>) => {
    setIngredients((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const addIngredientRow = () => {
    setIngredients((prev) => [...prev, { ingredientId: "", quantity: 0 }]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Recipe</DialogTitle>
          <DialogDescription>
            Link an Items &amp; Setup product with its ingredient inventory
            items for live costing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recipe-item">Recipe Output *</Label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger id="recipe-item">
                  <SelectValue placeholder="Select prep item" />
                </SelectTrigger>
                <SelectContent>
                  {recipeCandidates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only inventory items marked as prep items appear here.
              </p>
            </div>

            <div>
              <Label htmlFor="yield">Batch Yield</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="yield"
                  type="number"
                  min={1}
                  value={yieldQty}
                  onChange={(event) => setYieldQty(event.target.value)}
                  className="flex-1"
                />
                <Badge variant="outline">
                  {inventoryItems.find((item) => item.id === selectedItemId)
                    ?.unit?.abbreviation || "unit"}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ingredients *</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addIngredientRow}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add ingredient
              </Button>
            </div>
            <div className="space-y-3">
              {ingredients.map((row, index) => {
                const ingredient = inventoryItems.find(
                  (item) => item.id === row.ingredientId,
                );
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                  >
                    <div className="md:col-span-6">
                      <Select
                        value={row.ingredientId}
                        onValueChange={(value) =>
                          updateIngredient(index, { ingredientId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select inventory item" />
                        </SelectTrigger>
                        <SelectContent>
                          {ingredientCandidates.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.quantity || ""}
                        onChange={(event) =>
                          updateIngredient(index, {
                            quantity: Number(event.target.value),
                          })
                        }
                        placeholder="Qty"
                      />
                    </div>
                    <div className="md:col-span-2 text-sm text-muted-foreground">
                      {ingredient?.unit?.abbreviation ||
                        ingredient?.unit?.name ||
                        "-"}
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      {ingredients.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeIngredientRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="notes">Prep Notes</Label>
              <Textarea
                id="notes"
                placeholder="Batch instructions, hold times, allergen notes…"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Nutrition (optional)</Label>
              <Input
                type="number"
                placeholder="Calories"
                value={nutrition.calories || ""}
                onChange={(event) =>
                  setNutrition((prev) => ({
                    ...prev,
                    calories: event.target.value,
                  }))
                }
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder="Protein g"
                  value={nutrition.protein || ""}
                  onChange={(event) =>
                    setNutrition((prev) => ({
                      ...prev,
                      protein: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Carbs g"
                  value={nutrition.carbs || ""}
                  onChange={(event) =>
                    setNutrition((prev) => ({
                      ...prev,
                      carbs: event.target.value,
                    }))
                  }
                />
                <Input
                  type="number"
                  placeholder="Fat g"
                  value={nutrition.fat || ""}
                  onChange={(event) =>
                    setNutrition((prev) => ({
                      ...prev,
                      fat: event.target.value,
                    }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Nutrition values sync to the recipe detail view and export
                sheets.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create recipe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
