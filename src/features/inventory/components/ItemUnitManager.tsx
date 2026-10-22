import { useTranslation } from "react-i18next";
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
import { Plus, Package } from "lucide-react";
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
  const { t } = useTranslation();
  const { units: itemUnits, isLoading } = useItemUnits(itemId);
  const { data: availableUnits } = useInventoryUnits();
  const createItemUnit = useCreateItemUnit();
  const updateItemUnit = useUpdateItemUnit();

  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitData, setNewUnitData] = useState({
    unitid: "",
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
    if (!newUnitData.unitid) return;

    try {
      await createItemUnit.mutateAsync({
        item_id: itemId,
        unitid: newUnitData.unitid,
        unit_level: newUnitData.unit_level || nextLevel,
        conversion_factor: newUnitData.conversion_factor,
        is_primary: newUnitData.is_primary,
        is_countable: newUnitData.is_countable,
        cost_per_unit: newUnitData.cost_per_unit
          ? parseFloat(newUnitData.cost_per_unit)
          : undefined,
      });

      setNewUnitData({
        unitid: "",
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
            {t("inventory.unitConfiguration")} {itemName}
          </DialogTitle>
          <DialogDescription>
            {t("inventory.configureMultiLevelUnitHierarchyForThisItem")} </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Example Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("inventory.itemDisplayPreview")}</CardTitle>
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
                {t("inventory.currentUnitConfiguration")} <Button
                  size="sm"
                  onClick={() => setIsAddingUnit(true)}
                  disabled={isAddingUnit}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("inventory.addUnitLevel")} </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>{t("inventory.loadingUnits")}</div>
              ) : sortedUnits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("inventory.noUnitsConfiguredAddYourFirstUnitLevelToGetStarted")} </div>
              ) : (
                <div className="space-y-4">
                  {sortedUnits.map((unit, _index) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Badge variant="outline">{t("inventory.level")} {unit.unit_level}</Badge>
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
                              {t("inventory.cost2")}{unit.cost_per_unit.toFixed(2)} {t("inventory.per")}{" "}
                              {unit.unit?.abbreviation}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {unit.is_primary && <Badge>{t("inventory.primary")}</Badge>}
                        {unit.is_countable && (
                          <Badge variant="outline">{t("inventory.countable")}</Badge>
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
                <CardTitle>{t("inventory.addNewUnitLevel")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit-type">{t("inventory.unitType")}</Label>
                    <select
                      id="unit-type"
                      value={newUnitData.unitid}
                      onChange={(e) =>
                        setNewUnitData((prev) => ({
                          ...prev,
                          unitid: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">{t("inventory.selectUnitType")}</option>
                      {availableUnits
                        ?.filter(
                          (unit) =>
                            !itemUnits.some((iu) => iu.unitid === unit.id),
                        )
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name} ({unit.abbreviation})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="unit-level">{t("inventory.unitLevel")}</Label>
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
                      {t("inventory.conversionFactor")} <div className="text-xs text-muted-foreground">
                        {t("inventory.howMany")}{" "}
                        {sortedUnits.length > 0
                          ? "of the previous level"
                          : "base units"}{" "}
                        {t("inventory.thisContains")} </div>
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
                      {t("inventory.costPerUnitOptional")} </Label>
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
                    <span className="text-sm">{t("inventory.setAsPrimaryUnit")}</span>
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
                    <span className="text-sm">{t("inventory.countableInInventory")}</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingUnit(false)}
                  >
                    {t("common.cancel")} </Button>
                  <Button
                    onClick={handleAddUnit}
                    disabled={!newUnitData.unitid || createItemUnit.isPending}
                  >
                    {t("inventory.addUnitLevel")} </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Unit Hierarchy Example */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {t("inventory.exampleHot16ozCupLid")} </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>{t("inventory.level1EaEachBaseUnit")}</div>
                <div>
                  {t("inventory.level2PkPackOf50EaContains50IndividualLids")} </div>
                <div>
                  {t("inventory.level3CsCaseOf20PacksContains1000Ea2050")} </div>
                <div className="text-muted-foreground mt-3">
                  {t("inventory.thisCreatesTheHierarchyEaPackOf50Case2050Ea")} </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
