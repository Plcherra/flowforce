import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Package, Trash2, Edit } from "lucide-react";
import {
  useItemUnits,
  useCreateItemUnit,
  useUpdateItemUnit,
  formatUnitDisplay,
} from "@/features/inventory/hooks/useItemUnits";
import { useInventoryUnits } from "@/features/inventory/hooks/useInventoryUnits";
import { logger } from "@/utils/logger";

interface ItemUnitManagerProps {
  itemId: string;
  itemName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemUnitManager({
  itemId,
  itemName,
  open,
  onOpenChange,
}: ItemUnitManagerProps) {
  const { units: itemUnits, isLoading } = useItemUnits(itemId);
  const { data: availableUnits } = useInventoryUnits();
  const createItemUnit = useCreateItemUnit();
  const updateItemUnit = useUpdateItemUnit();

  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitData, setNewUnitData] = useState({
    unit_id: "",
    unit_level: 1,
    conversion_factor: 1,
    is_primary: false,
    is_countable: true,
    cost_per_unit: "",
  });

  const sortedUnits = itemUnits.sort((a, b) => a.unit_level - b.unit_level);
  const nextLevel =
    sortedUnits.length > 0
      ? Math.max(...sortedUnits.map((u) => u.unit_level)) + 1
      : 1;

  const handleAddUnit = async () => {
    if (!newUnitData.unit_id) return;

    try {
      await createItemUnit.mutateAsync({
        item_id: itemId,
        unit_id: newUnitData.unit_id,
        unit_level: newUnitData.unit_level || nextLevel,
        conversion_factor: newUnitData.conversion_factor,
        is_primary: newUnitData.is_primary,
        is_countable: newUnitData.is_countable,
        cost_per_unit: newUnitData.cost_per_unit
          ? parseFloat(newUnitData.cost_per_unit)
          : undefined,
      });

      setNewUnitData({
        unit_id: "",
        unit_level: nextLevel + 1,
        conversion_factor: 1,
        is_primary: false,
        is_countable: true,
        cost_per_unit: "",
      });
      setIsAddingUnit(false);
    } catch (error) {
      logger.error("Failed to add unit:", { error, tags: ["error"] });
    }
  };

  const togglePrimary = async (unitId: string) => {
    const unit = itemUnits.find((u) => u.id === unitId);
    if (!unit) return;

    // First remove primary flag from all other units
    await Promise.all(
      itemUnits
        .filter((u) => u.id !== unitId && u.is_primary)
        .map((u) =>
          updateItemUnit.mutateAsync({ id: u.id, is_primary: false }),
        ),
    );

    // Then set this unit as primary
    await updateItemUnit.mutateAsync({
      id: unitId,
      is_primary: !unit.is_primary,
    });
  };

  // Get example item display like "Hot 16oz Cup Lid"
  const getExampleDisplay = () => {
    if (sortedUnits.length === 0) return itemName;

    const displayParts = [itemName];
    sortedUnits.forEach((unit) => {
      if (unit.unit?.abbreviation) {
        displayParts.push(unit.unit.abbreviation);
        if (unit.conversion_factor > 1) {
          displayParts.push(`Pack of ${unit.conversion_factor}`);
        }
      }
    });

    return displayParts.join(" | ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Unit Configuration - {itemName}
          </DialogTitle>
          <DialogDescription>
            Configure multi-level unit hierarchy for this item
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Example Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Item Display Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-mono text-lg bg-muted p-3 rounded">
                {getExampleDisplay()}
              </div>
            </CardContent>
          </Card>

          {/* Current Units */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Current Unit Configuration
                <Button
                  size="sm"
                  onClick={() => setIsAddingUnit(true)}
                  disabled={isAddingUnit}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Unit Level
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading units...</div>
              ) : sortedUnits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No units configured. Add your first unit level to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedUnits.map((unit, index) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">Level {unit.unit_level}</Badge>
                        <div>
                          <div className="font-medium">
                            {formatUnitDisplay(unit)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {unit.conversion_factor > 1 &&
                              `Contains ${unit.conversion_factor} ${unit.unit_level === 1 ? "base units" : "of previous level"}`}
                          </div>
                          {unit.cost_per_unit && (
                            <div className="text-sm text-muted-foreground">
                              Cost: ${unit.cost_per_unit.toFixed(2)} per{" "}
                              {unit.unit?.abbreviation}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {unit.is_primary && <Badge>Primary</Badge>}
                        {unit.is_countable && (
                          <Badge variant="outline">Countable</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => togglePrimary(unit.id)}
                        >
                          {unit.is_primary ? "Remove Primary" : "Set Primary"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Unit Form */}
          {isAddingUnit && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Unit Level</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit-type">Unit Type</Label>
                    <select
                      id="unit-type"
                      value={newUnitData.unit_id}
                      onChange={(e) =>
                        setNewUnitData((prev) => ({
                          ...prev,
                          unit_id: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select unit type...</option>
                      {availableUnits
                        ?.filter(
                          (unit) =>
                            !itemUnits.some((iu) => iu.unit_id === unit.id),
                        )
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="unit-level">Unit Level</Label>
                    <Input
                      id="unit-level"
                      type="number"
                      min="1"
                      value={newUnitData.unit_level}
                      onChange={(e) =>
                        setNewUnitData((prev) => ({
                          ...prev,
                          unit_level: parseInt(e.target.value) || nextLevel,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="conversion-factor">
                      Conversion Factor
                      <div className="text-xs text-muted-foreground">
                        How many{" "}
                        {sortedUnits.length > 0
                          ? "of the previous level"
                          : "base units"}{" "}
                        this contains
                      </div>
                    </Label>
                    <Input
                      id="conversion-factor"
                      type="number"
                      step="0.01"
                      min="1"
                      value={newUnitData.conversion_factor}
                      onChange={(e) =>
                        setNewUnitData((prev) => ({
                          ...prev,
                          conversion_factor: parseFloat(e.target.value) || 1,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label htmlFor="cost-per-unit">
                      Cost Per Unit (Optional)
                    </Label>
                    <Input
                      id="cost-per-unit"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newUnitData.cost_per_unit}
                      onChange={(e) =>
                        setNewUnitData((prev) => ({
                          ...prev,
                          cost_per_unit: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUnitData.is_primary}
                      onChange={(e) =>
                        setNewUnitData((prev) => ({
                          ...prev,
                          is_primary: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm">Set as primary unit</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUnitData.is_countable}
                      onChange={(e) =>
                        setNewUnitData((prev) => ({
                          ...prev,
                          is_countable: e.target.checked,
                        }))
                      }
                    />
                    <span className="text-sm">Countable in inventory</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingUnit(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddUnit}
                    disabled={!newUnitData.unit_id || createItemUnit.isPending}
                  >
                    Add Unit Level
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unit Hierarchy Example */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Example: Hot 16oz Cup Lid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>• Level 1: EA (Each) - Base unit</div>
                <div>
                  • Level 2: PK (Pack of 50 EA) - Contains 50 individual lids
                </div>
                <div>
                  • Level 3: CS (Case of 20 packs) - Contains 1,000 EA (20 × 50)
                </div>
                <div className="text-muted-foreground mt-3">
                  This creates the hierarchy: EA → Pack of 50 → Case (20 × 50
                  EA)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
