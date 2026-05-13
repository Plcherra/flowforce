import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, HeartOff, Leaf, Scissors, FileDown } from "lucide-react";
import type { CookbookRecipe } from "@/features/inventory/services/cookbook";

interface CookbookGridProps {
  recipes: CookbookRecipe[];
  favoriteIds: string[];
  onSelect: (recipe: CookbookRecipe) => void;
  onToggleFavorite: (recipeId: string) => void;
  onExportRecipe: (recipeId: string) => void;
  loading?: boolean;
}

export function CookbookGrid({
  recipes,
  favoriteIds,
  onSelect,
  onToggleFavorite,
  onExportRecipe,
  loading,
}: CookbookGridProps) {
  const sortedRecipes = useMemo(
    () =>
      [...recipes].sort((a, b) => {
        const costA = a.costPerUnit ?? 0;
        const costB = b.costPerUnit ?? 0;
        return costA - costB;
      }),
    [recipes],
  );

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Loading recipes…</div>
    );
  }

  if (!sortedRecipes.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No recipes linked yet. Use “New Recipe” to connect Items &amp; Setup
          ingredients.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {sortedRecipes.map((recipe) => {
        const isFavorite = favoriteIds.includes(recipe.item.id);
        const primaryUnit =
          recipe.yieldUnit?.abbreviation || recipe.yieldUnit?.name || "unit";
        const topIngredients = recipe.lines.slice(0, 3);

        return (
          <Card key={recipe.item.id} className="flex flex-col">
            <CardHeader className="space-y-2 pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base font-semibold leading-tight flex-1">
                  {recipe.item.name}
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className={
                    isFavorite ? "text-amber-500" : "text-muted-foreground"
                  }
                  onClick={() => onToggleFavorite(recipe.item.id)}
                  aria-label={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                >
                  {isFavorite ? (
                    <HeartOff className="h-4 w-4" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {recipe.yieldQuantity} {primaryUnit} yield
                </Badge>
                <Badge variant="outline">
                  ${recipe.costPerUnit.toFixed(2)} per {primaryUnit}
                </Badge>
                <Badge variant="outline">
                  Total cost ${recipe.totalCost.toFixed(2)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Key ingredients</p>
                <ul className="space-y-1">
                  {topIngredients.map((line) => (
                    <li key={line.id} className="flex justify-between gap-4">
                      <span className="truncate">
                        {line.ingredient?.name ?? "Unknown ingredient"}
                      </span>
                      <span className="text-muted-foreground">
                        {line.quantity_needed}{" "}
                        {line.unit?.abbreviation || line.unit?.name || ""}
                      </span>
                    </li>
                  ))}
                  {recipe.lines.length > 3 && (
                    <li className="text-xs text-muted-foreground">
                      +{recipe.lines.length - 3} more ingredients
                    </li>
                  )}
                </ul>
              </div>
              {recipe.nutrition && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {recipe.nutrition.calories && (
                    <span className="flex items-center gap-1">
                      <Leaf className="h-3 w-3" /> {recipe.nutrition.calories}{" "}
                      cal
                    </span>
                  )}
                  {recipe.nutrition.protein && (
                    <span className="flex items-center gap-1">
                      <Scissors className="h-3 w-3" />{" "}
                      {recipe.nutrition.protein}g protein
                    </span>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => onSelect(recipe)}
                className="flex-1"
              >
                View Recipe
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExportRecipe(recipe.item.id)}
                aria-label="Export recipe sheet"
              >
                <FileDown className="h-4 w-4 mr-1" />
                Export
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
