import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PrepItem } from "@/hooks/useCookbook";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface PrepListProps {
  items: PrepItem[];
  suggestToMake: (item: PrepItem) => { onHand: number; needed: number };
  onLogProduction: (input: {
    item_id: string;
    qty: number;
    note?: string;
  }) => Promise<void>;
  onLogWaste: (input: {
    item_id: string;
    quantity: number;
    waste_type:
      | "spoilage"
      | "prep_error"
      | "accident"
      | "theft"
      | "expired"
      | "damaged"
      | "other";
    reason?: string;
  }) => Promise<void>;
  onViewRecipe: (recipeId: string) => void;
}

export function PrepList({
  items,
  suggestToMake,
  onLogProduction,
  onLogWaste,
  onViewRecipe,
}: PrepListProps) {
  const [savingId, setSavingId] = useState<string | null>(null);

  const prioritized = useMemo(() => {
    const rows = items.map((item) => {
      const suggestion = suggestToMake(item);
      const priority =
        item.par_min > 0 ? Math.max(0, item.par_min - suggestion.onHand) : 0;
      return { item, ...suggestion, priority };
    });
    return rows.sort((a, b) => b.priority - a.priority);
  }, [items, suggestToMake]);

  const handleProduction = async (item: PrepItem, qty: number) => {
    if (qty <= 0) return;
    setSavingId(item.id);
    try {
      await onLogProduction({
        item_id: item.id,
        qty,
        note: "Prep run from daily planner",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleWaste = async (item: PrepItem) => {
    setSavingId(item.id);
    try {
      await onLogWaste({
        item_id: item.id,
        quantity: 1,
        waste_type: "prep_error",
        reason: "Quick waste log via prep planner",
      });
    } finally {
      setSavingId(null);
    }
  };

  if (!prioritized.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No prep items found. Flag inventory items as prep-ready to populate
          this planner.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {prioritized.map(({ item, onHand, needed, priority }) => {
        const recipe = item.recipe;
        const disabled = savingId === item.id;
        const recommendedQty = Math.max(needed, 0);

        return (
          <Card
            key={item.id}
            className={priority > 0 ? "border-amber-400" : ""}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="truncate" title={item.name}>
                  {item.name}
                </span>
                <Badge variant={priority > 0 ? "destructive" : "outline"}>
                  {priority > 0 ? "Needs prep" : "In stock"}
                </Badge>
              </CardTitle>
              {recipe && (
                <p className="text-xs text-muted-foreground">
                  Linked recipe cost ${recipe.costPerUnit.toFixed(2)} /{" "}
                  {item.uom}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PAR</span>
                <span>
                  {item.par_min} – {item.par_max} {item.uom}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">On hand</span>
                <span>
                  {onHand} {item.uom}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Suggested</span>
                <span>
                  {recommendedQty} {item.uom}
                </span>
              </div>
              {recipe && (
                <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                  <p className="font-medium text-foreground mb-1">
                    Ingredient forecast
                  </p>
                  <ul className="space-y-1">
                    {recipe.lines.map((line) => (
                      <li
                        key={line.id}
                        className="flex items-center justify-between"
                      >
                        <span className="truncate">
                          {line.ingredient?.name ?? "Unknown"}
                        </span>
                        <span>
                          {(
                            line.quantity_needed *
                            Math.max(1, recommendedQty || 1)
                          ).toFixed(2)}{" "}
                          {line.unit?.abbreviation || line.unit?.name || ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between gap-2">
              <Button
                size="sm"
                variant="link"
                className="px-0"
                onClick={() => onViewRecipe(item.id)}
              >
                View recipe
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWaste(item)}
                  disabled={disabled}
                >
                  {disabled ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Waste
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleProduction(item, recommendedQty || 1)}
                  disabled={disabled}
                >
                  {disabled ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Log prep
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
