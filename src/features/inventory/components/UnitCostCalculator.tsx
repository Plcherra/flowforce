import { useCurrency } from "@/hooks/useCurrency";

interface UnitLevel {
  unit_level: number;
  unit_id: string;
  conversion_factor: number;
  cost_per_unit?: number;
  unit_name?: string;
  unit_abbreviation?: string;
}

interface UnitCostCalculatorProps {
  unitLevels: UnitLevel[];
  countedQuantities: Record<number, number>; // unit_level -> counted quantity
  className?: string;
}

export function UnitCostCalculator({
  unitLevels,
  countedQuantities,
  className,
}: UnitCostCalculatorProps) {
  const { symbol: currencySymbol } = useCurrency();

  // Calculate totals
  const calculations = unitLevels.map((unit) => {
    const countedQty = countedQuantities[unit.unit_level] || 0;
    const unitCost = unit.cost_per_unit || 0;
    const totalCost = countedQty * unitCost;
    const totalBaseUnits = countedQty * unit.conversion_factor;

    return {
      unit_level: unit.unit_level,
      unit_name: unit.unit_name || `Unit ${unit.unit_level}`,
      unit_abbreviation: unit.unit_abbreviation,
      counted_quantity: countedQty,
      unit_cost: unitCost,
      total_cost: totalCost,
      total_base_units: totalBaseUnits,
    };
  });

  const grandTotalCost = calculations.reduce(
    (sum, calc) => sum + calc.total_cost,
    0,
  );
  const grandTotalBaseUnits = calculations.reduce(
    (sum, calc) => sum + calc.total_base_units,
    0,
  );

  if (calculations.length === 0) return null;

  return (
    <div className={`bg-muted/50 rounded-lg p-4 space-y-3 ${className}`}>
      <h4 className="font-medium text-sm">Cost Calculation</h4>

      {calculations.map(
        (calc) =>
          calc.counted_quantity > 0 && (
            <div key={calc.unit_level} className="flex justify-between text-sm">
              <span>
                {calc.counted_quantity} × {calc.unit_name} ({currencySymbol}
                {calc.unit_cost.toFixed(2)} ea)
              </span>
              <span className="font-medium">
                {currencySymbol}
                {calc.total_cost.toFixed(2)}
              </span>
            </div>
          ),
      )}

      {calculations.some((calc) => calc.counted_quantity > 0) && (
        <>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Total Cost:</span>
              <span>
                {currencySymbol}
                {grandTotalCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Total Base Units:</span>
              <span>{grandTotalBaseUnits.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
