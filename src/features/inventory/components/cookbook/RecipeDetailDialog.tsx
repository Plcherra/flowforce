import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { CookbookRecipe } from "@/features/inventory/services/cookbook";
import { FileDown, Link as LinkIcon, UtensilsCrossed } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RecipeDetailDialogProps {
  recipe: CookbookRecipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport?: (recipeId: string) => void;
  isFavorite?: boolean;
}

export function RecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  onExport,
  isFavorite,
}: RecipeDetailDialogProps) {
  const { t } = useTranslation();
  if (!recipe) return null;

  const yieldUnit =
    recipe.yieldUnit?.abbreviation || recipe.yieldUnit?.name || "unit";
  const totalIngredients = recipe.lines.reduce(
    (acc, line) => acc + line.quantity_needed,
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-3">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              {recipe.item.name}
            </span>
            {isFavorite && <Badge variant="secondary">{t("inventory.favorite")}</Badge>}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">
              {t("inventory.yield")} {recipe.yieldQuantity} {yieldUnit}
            </Badge>
            <Badge variant="outline">
              {t("inventory.totalCost4")}{recipe.totalCost.toFixed(2)}
            </Badge>
            <Badge variant="outline">
              {t("inventory.costPer")} {yieldUnit} ${recipe.costPerUnit.toFixed(2)}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full px-6 pb-6">
          <div className="grid gap-6 pb-10">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("inventory.ingredientBreakdown")}</CardTitle>
                {onExport && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onExport(recipe.item.id)}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    {t("inventory.exportSheet")} </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-12 text-xs font-medium uppercase text-muted-foreground">
                  <span className="col-span-4">{t("inventory.inventoryItem")}</span>
                  <span className="col-span-2 text-right">{t("inventory.qtyNeeded")}</span>
                  <span className="col-span-2 text-right">{t("schedule.unit")}</span>
                  <span className="col-span-2 text-right">{t("inventory.unitCost")}</span>
                  <span className="col-span-2 text-right">{t("inventory.lineCost")}</span>
                </div>
                <Separator />
                <div className="space-y-3 text-sm">
                  {recipe.lines.map((line) => {
                    const unitLabel =
                      line.unit?.abbreviation || line.unit?.name || "";
                    const unitCost = line.ingredient?.cost_per_unit ?? 0;
                    const lineCost = unitCost * line.quantity_needed;
                    return (
                      <div
                        key={line.id}
                        className="grid grid-cols-12 items-center"
                      >
                        <span className="col-span-4 truncate">
                          {line.ingredient?.name ?? "Unknown ingredient"}
                        </span>
                        <span className="col-span-2 text-right">
                          {formatNumber(line.quantity_needed)}
                        </span>
                        <span className="col-span-2 text-right">
                          {unitLabel}
                        </span>
                        <span className="col-span-2 text-right">
                          ${unitCost.toFixed(2)}
                        </span>
                        <span className="col-span-2 text-right font-medium">
                          ${lineCost.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Separator />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    {recipe.lines.length} {t("inventory.ingredients3")}{" "}
                    {formatNumber(totalIngredients)} {t("inventory.unitsTotal")} </span>
                  <span>
                    {t("inventory.liveCostsSourcedFromItemsSetupInventoryRecords")} </span>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("inventory.nutrition")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {recipe.nutrition ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {recipe.nutrition.calories && (
                        <NutritionStat
                          label={t("inventory.calories")}
                          value={`${formatNumber(recipe.nutrition.calories)} kcal`}
                        />
                      )}
                      {recipe.nutrition.protein && (
                        <NutritionStat
                          label={t("inventory.protein")}
                          value={`${formatNumber(recipe.nutrition.protein)} g`}
                        />
                      )}
                      {recipe.nutrition.carbs && (
                        <NutritionStat
                          label={t("inventory.carbs")}
                          value={`${formatNumber(recipe.nutrition.carbs)} g`}
                        />
                      )}
                      {recipe.nutrition.fat && (
                        <NutritionStat
                          label={t("inventory.fat")}
                          value={`${formatNumber(recipe.nutrition.fat)} g`}
                        />
                      )}
                      {recipe.nutrition.sodium && (
                        <NutritionStat
                          label={t("inventory.sodium")}
                          value={`${formatNumber(recipe.nutrition.sodium)} mg`}
                        />
                      )}
                      {recipe.nutrition.fiber && (
                        <NutritionStat
                          label={t("inventory.fiber")}
                          value={`${formatNumber(recipe.nutrition.fiber)} g`}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Add nutrition notes to the inventory item description
                      (e.g., “Calories: 220; Protein: 12g”) to surface values
                      here.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("inventory.inventoryLink")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground block">
                      {t("inventory.inventoryItemId")} </span>
                    <span className="font-medium">{recipe.item.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">
                      {t("inventory.unitOfMeasure")} </span>
                    <span className="font-medium">
                      {recipe.item.unit?.name} ({recipe.item.unit?.abbreviation}
                      )
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href="/app/inventory/items" target="_blank" rel="noreferrer">
                      <LinkIcon className="h-4 w-4" />
                      {t("inventory.openInItemsSetup")} </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function NutritionStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </span>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}
