import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calculateProductionMaterials } from "@/lib/inventory/production";
import { useCreateProductionEvent } from "@/features/inventory/hooks/useInventoryProductionEvents";
import { useInventoryItems } from "@/features/inventory/hooks/useInventoryItems";
import { useInventoryUnits } from "@/features/inventory/hooks/useInventoryUnits";
import type {
  InventoryItem,
  InventoryUnit,
  ProductionMaterialUsage,
  ProductionType,
} from "@/features/inventory/hooks/types";
import { collectUnits } from "@/utils/inventoryUnits";
import { Loader2, AlertTriangle } from "lucide-react";

const PRODUCTION_TYPES: { value: ProductionType; label: string }[] = [
  { value: "prep", label: "Prep" },
  { value: "batch", label: "Batch" },
  { value: "cooked", label: "Cooked" },
  { value: "baked", label: "Baked" },
  { value: "other", label: "Other" },
];

type FormState = {
  item_id: string;
  production_type: ProductionType;
  produced_quantity: string;
  produced_unit_id: string;
  produced_at: string;
  labor_cost: string;
  overhead_cost: string;
  yield_quantity: string;
  yield_unit_id: string;
  waste_quantity: string;
  waste_unit_id: string;
  batch_reference: string;
  notes: string;
  submission_note: string;
};

const defaultFormState: FormState = {
  item_id: "",
  production_type: "prep",
  produced_quantity: "",
  produced_unit_id: "",
  produced_at: "",
  labor_cost: "",
  overhead_cost: "",
  yield_quantity: "",
  yield_unit_id: "",
  waste_quantity: "",
  waste_unit_id: "",
  batch_reference: "",
  notes: "",
  submission_note: "",
};

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
});

const unitLabel = (unit?: InventoryUnit | null) => {
  if (!unit) return "units";
  return unit.abbreviation ? `${unit.name} (${unit.abbreviation})` : unit.name;
};

export function ProductionEventForm() {
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [submissionWarnings, setSubmissionWarnings] = useState<string[]>([]);

  const { data: items = [], isLoading: itemsLoading } = useInventoryItems();
  const { data: allUnits = [], isLoading: unitsLoading } = useInventoryUnits();
  const createProductionEvent = useCreateProductionEvent();

  const selectedItem = useMemo<InventoryItem | undefined>(
    () => items.find((item) => item.id === form.item_id),
    [items, form.item_id],
  );

  const recipeLines = selectedItem?.recipes?.[0]?.lines ?? [];
  const relevantUnits = useMemo<InventoryUnit[]>(() => {
    const gathered = collectUnits([
      selectedItem?.unit,
      selectedItem?.recipe_yield_unit,
      selectedItem?.units?.map((entry) => entry.unit),
      allUnits,
      recipeLines.map((line) => line.unit),
      recipeLines.map((line) => line.ingredient?.unit),
    ]) as InventoryUnit[];
    return gathered;
  }, [allUnits, selectedItem, recipeLines]);

  const preview = useMemo(() => {
    if (!selectedItem || !form.produced_unit_id || !form.produced_quantity) {
      return null;
    }

    const producedQuantityNumber = Number(form.produced_quantity);
    if (
      !Number.isFinite(producedQuantityNumber) ||
      producedQuantityNumber <= 0
    ) {
      return null;
    }

    return calculateProductionMaterials({
      item: selectedItem,
      producedQuantity: producedQuantityNumber,
      producedUnitId: form.produced_unit_id,
      recipeLines: recipeLines.map((line) => ({
        ingredient_id: line.ingredient_id,
        quantity_needed: Number(line.quantity_needed ?? 0),
        unit_id: line.unit_id,
        yield_amount: Number.isFinite(line.yield_amount)
          ? Number(line.yield_amount)
          : Number(selectedItem.recipe_yield_quantity ?? 1),
        ingredient: line.ingredient,
        unit: line.unit,
      })),
      units: relevantUnits,
    });
  }, [
    form.produced_quantity,
    form.produced_unit_id,
    recipeLines,
    relevantUnits,
    selectedItem,
  ]);

  const laborCost = Number(form.labor_cost || 0);
  const overheadCost = Number(form.overhead_cost || 0);
  const materialCost = preview?.materialCostTotal ?? 0;
  const totalCost =
    materialCost +
    (Number.isFinite(laborCost) ? laborCost : 0) +
    (Number.isFinite(overheadCost) ? overheadCost : 0);
  const costPerUnit =
    preview && preview.producedQuantityInItemUnit > 0
      ? totalCost / preview.producedQuantityInItemUnit
      : 0;

  const handleItemChange = (itemId: string) => {
    const item = items.find((candidate) => candidate.id === itemId);
    setForm((prev) => ({
      ...prev,
      item_id: itemId,
      produced_unit_id: item?.unit_id || "",
      yield_unit_id:
        item?.recipe_yield_unit_id || item?.unit_id || prev.yield_unit_id,
    }));
    setSubmissionWarnings([]);
  };

  const resetForm = () => {
    setForm((prev) => ({
      ...defaultFormState,
      production_type: prev.production_type,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionWarnings([]);

    if (!form.item_id) {
      return;
    }

    const producedQuantityNumber = Number(form.produced_quantity);
    if (
      !Number.isFinite(producedQuantityNumber) ||
      producedQuantityNumber <= 0
    ) {
      return;
    }

    try {
      const result = await createProductionEvent.mutateAsync({
        item_id: form.item_id,
        production_type: form.production_type,
        produced_quantity: producedQuantityNumber,
        produced_unit_id: form.produced_unit_id,
        produced_at: form.produced_at
          ? new Date(form.produced_at).toISOString()
          : undefined,
        labor_cost: Number.isFinite(laborCost) ? laborCost : undefined,
        overhead_cost: Number.isFinite(overheadCost) ? overheadCost : undefined,
        yield_quantity: form.yield_quantity
          ? Number(form.yield_quantity)
          : undefined,
        yield_unit_id: form.yield_unit_id || undefined,
        waste_quantity: form.waste_quantity
          ? Number(form.waste_quantity)
          : undefined,
        waste_unit_id: form.waste_unit_id || undefined,
        notes: form.notes || undefined,
        batch_reference: form.batch_reference || undefined,
        submission_note: form.submission_note || undefined,
      });

      if (result?.warnings?.length) {
        setSubmissionWarnings(result.warnings);
      }

      resetForm();
    } catch (error) {
      // Error handling delegated to mutation toast
    }
  };

  const disableSubmit =
    !form.item_id ||
    !form.produced_unit_id ||
    !form.produced_quantity ||
    Number(form.produced_quantity) <= 0 ||
    createProductionEvent.isPending;

  const unitsForSelect = useMemo<InventoryUnit[]>(() => {
    if (!relevantUnits.length) {
      return allUnits;
    }
    return relevantUnits;
  }, [allUnits, relevantUnits]);

  const materialRows: ProductionMaterialUsage[] = preview?.materials ?? [];

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Item *</Label>
          <Select
            disabled={itemsLoading}
            value={form.item_id}
            onValueChange={handleItemChange}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={itemsLoading ? "Loading items..." : "Select item"}
              />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Production Type *</Label>
          <Select
            value={form.production_type}
            onValueChange={(value) =>
              setForm((prev) => ({
                ...prev,
                production_type: value as ProductionType,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Production type" />
            </SelectTrigger>
            <SelectContent>
              {PRODUCTION_TYPES.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Produced Quantity *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.produced_quantity}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                produced_quantity: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Produced Unit *</Label>
          <Select
            disabled={unitsLoading}
            value={form.produced_unit_id}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, produced_unit_id: value }))
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={unitsLoading ? "Loading units..." : "Select unit"}
              />
            </SelectTrigger>
            <SelectContent>
              {unitsForSelect.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unitLabel(unit)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Batch / Reference</Label>
          <Input
            value={form.batch_reference}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                batch_reference: event.target.value,
              }))
            }
            placeholder="Optional batch identifier"
          />
        </div>

        <div className="space-y-2">
          <Label>Production Date &amp; Time</Label>
          <Input
            type="datetime-local"
            value={form.produced_at}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, produced_at: event.target.value }))
            }
          />
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Labor Cost</Label>
          <Input
            type="number"
            step="0.01"
            value={form.labor_cost}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, labor_cost: event.target.value }))
            }
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Overhead Cost</Label>
          <Input
            type="number"
            step="0.01"
            value={form.overhead_cost}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                overhead_cost: event.target.value,
              }))
            }
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Yield Quantity</Label>
          <Input
            type="number"
            step="0.01"
            value={form.yield_quantity}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                yield_quantity: event.target.value,
              }))
            }
            placeholder="Optional actual yield"
          />
        </div>

        <div className="space-y-2">
          <Label>Yield Unit</Label>
          <Select
            value={form.yield_unit_id}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, yield_unit_id: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select yield unit" />
            </SelectTrigger>
            <SelectContent>
              {unitsForSelect.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unitLabel(unit)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Waste Quantity</Label>
          <Input
            type="number"
            step="0.01"
            value={form.waste_quantity}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                waste_quantity: event.target.value,
              }))
            }
            placeholder="Optional waste"
          />
        </div>

        <div className="space-y-2">
          <Label>Waste Unit</Label>
          <Select
            value={form.waste_unit_id}
            onValueChange={(value) =>
              setForm((prev) => ({ ...prev, waste_unit_id: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select waste unit" />
            </SelectTrigger>
            <SelectContent>
              {unitsForSelect.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unitLabel(unit)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Internal Notes</Label>
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
            placeholder="Notes about this production run..."
          />
        </div>
        <div className="space-y-2">
          <Label>Submission Note (for approvers)</Label>
          <Textarea
            rows={4}
            value={form.submission_note}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                submission_note: event.target.value,
              }))
            }
            placeholder="Optional note for approvers"
          />
        </div>
      </div>

      {preview && (
        <div className="space-y-4 rounded-md border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold">Production Summary</h4>
              <p className="text-sm text-muted-foreground">
                Yield estimates and costs update automatically as you change
                quantities.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-sm text-muted-foreground">
                Total Material Cost
              </span>
              <span className="text-xl font-semibold">
                {currencyFormatter.format(materialCost || 0)}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Yield</p>
              <p className="text-lg font-semibold">
                {preview.producedQuantityInItemUnit.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                {unitLabel(selectedItem?.unit)}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Labor</p>
              <p className="text-lg font-semibold">
                {currencyFormatter.format(
                  Number.isFinite(laborCost) ? laborCost : 0,
                )}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">
                Overhead
              </p>
              <p className="text-lg font-semibold">
                {currencyFormatter.format(
                  Number.isFinite(overheadCost) ? overheadCost : 0,
                )}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">
                Cost per Unit
              </p>
              <p className="text-lg font-semibold">
                {currencyFormatter.format(costPerUnit || 0)}
              </p>
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Conversion warnings</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-6">
                  {preview.warnings.map((warning, index) => (
                    <li key={index} className="text-sm">
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead className="text-right">Required Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-sm text-muted-foreground"
                    >
                      No recipe lines configured for this item.
                    </TableCell>
                  </TableRow>
                ) : (
                  materialRows.map((material) => (
                    <TableRow key={material.ingredientId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>
                            {material.ingredient?.name || "Ingredient"}
                          </span>
                          {material.conversionFactor == null && (
                            <span className="text-xs text-muted-foreground">
                              Using recipe unit (
                              {unitLabel(material.recipeUnit)})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {material.quantityUsed.toLocaleString(undefined, {
                          maximumFractionDigits: 3,
                        })}
                      </TableCell>
                      <TableCell>{unitLabel(material.unit)}</TableCell>
                      <TableCell className="text-right">
                        {currencyFormatter.format(material.unitCost || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {currencyFormatter.format(material.totalCost || 0)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {submissionWarnings.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Recorded with warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-6">
              {submissionWarnings.map((warning, index) => (
                <li key={index} className="text-sm">
                  {warning}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={createProductionEvent.isPending}
        >
          Clear
        </Button>
        <Button type="submit" disabled={disableSubmit}>
          {createProductionEvent.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Record Production
        </Button>
      </div>
    </form>
  );
}
