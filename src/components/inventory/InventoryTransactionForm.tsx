import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useCreateInventoryTransaction } from "@/hooks/useInventory";
import { useInventoryItems } from "@/hooks/useInventory";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus } from "lucide-react";
import { logger } from "@/utils/logger";

export function computeInventoryTransactionTotals(
  quantity: number,
  conversionFactor: number,
  unitPrice?: number,
) {
  const normalizedQuantity = quantity * conversionFactor;
  const totalAmount =
    unitPrice !== undefined ? normalizedQuantity * unitPrice : undefined;

  return { normalizedQuantity, totalAmount };
}

export default function InventoryTransactionForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_id: "",
    transaction_type: "",
    quantity: "",
    unit_id: "",
    unit_price: "",
    reference_number: "",
    notes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { profile, loading: profileLoading } = useProfile();
  const {
    data: items = [],
    isLoading: itemsLoading,
    error: itemsError,
  } = useInventoryItems();
  const createTransaction = useCreateInventoryTransaction();

  const selectedItem = items.find((item) => item.id === formData.item_id);
  const itemUnits = selectedItem?.units || [];
  const primaryUnit =
    itemUnits.find((unit) => unit.unit_level === 1) || itemUnits[0];
  const selectedUnit =
    itemUnits.find((unit) => unit.unit_id === formData.unit_id) || primaryUnit;
  const baseCostPerUnit =
    selectedItem?.calculated_cost_per_unit ??
    selectedItem?.cost_per_unit ??
    undefined;
  const conversionFactor = selectedUnit?.conversion_factor || 1;
  const suggestedUnitPrice =
    selectedUnit?.cost_per_unit ??
    (baseCostPerUnit !== undefined
      ? baseCostPerUnit * conversionFactor
      : undefined);
  const quantityValue = parseFloat(formData.quantity);
  const previewQuantity = Number.isFinite(quantityValue)
    ? quantityValue * conversionFactor
    : null;
  const selectedUnitLabel =
    selectedUnit?.unit?.abbreviation || selectedUnit?.unit?.name || "unit";
  const baseUnitLabel =
    primaryUnit?.unit?.abbreviation || primaryUnit?.unit?.name || "base unit";
  const quantityInvalid = !Number.isFinite(quantityValue) || quantityValue <= 0;
  const noItemsAvailable = !itemsLoading && items.length === 0;
  const submitInFlight = isSubmitting || createTransaction.isPending;
  const isSubmitDisabled =
    submitInFlight ||
    profileLoading ||
    !profile ||
    !formData.item_id ||
    !formData.transaction_type ||
    quantityInvalid ||
    Boolean(itemsError) ||
    noItemsAvailable;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (profileLoading) {
      setFormError(
        "Your profile is still loading. Please wait a moment and try again.",
      );
      return;
    }

    if (!profile) {
      setFormError("We could not load your profile. Please sign in again.");
      return;
    }

    if (!formData.item_id) {
      setFormError("Please select an item.");
      return;
    }

    if (!formData.transaction_type) {
      setFormError("Please choose the type of transaction you are recording.");
      return;
    }

    if (quantityInvalid) {
      setFormError("Quantity must be greater than zero.");
      return;
    }

    if (!selectedItem) {
      setFormError(
        "We were unable to load the selected item. Refresh and try again.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const conversion = selectedUnit?.conversion_factor || 1;
      const unitPrice = formData.unit_price
        ? parseFloat(formData.unit_price)
        : suggestedUnitPrice !== undefined
          ? suggestedUnitPrice
          : undefined;

      // The legacy inventory_transactions table still references inventory_items.
      // Confirm the selected inv_item is synced before attempting the insert
      // so we can surface a friendly validation error instead of an FK failure.
      const { data: legacyItem, error: legacyError } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("id", selectedItem.id)
        .maybeSingle();

      if (legacyError) {
        throw new Error(
          legacyError.message ||
            "Failed to confirm the legacy inventory mapping for this item.",
        );
      }

      if (!legacyItem) {
        throw new Error(
          "Selected item is not synced with the legacy inventory ledger. Run the inventory sync or create the item in the legacy table before recording manual transactions.",
        );
      }

      const { normalizedQuantity, totalAmount } =
        computeInventoryTransactionTotals(quantityValue, conversion, unitPrice);

      await createTransaction.mutateAsync({
        item_id: formData.item_id,
        transaction_type: formData.transaction_type,
        quantity: normalizedQuantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        performed_by: profile.id,
      });

      setFormData({
        item_id: "",
        transaction_type: "",
        quantity: "",
        unit_id: "",
        unit_price: "",
        reference_number: "",
        notes: "",
      });
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create inventory transaction.";
      setFormError(message);
      logger.error("Failed to create inventory transaction:", {
        error,
        tags: ["error"],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Record Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record Inventory Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {itemsLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading inventory items…
            </div>
          )}
          {profileLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your profile…
            </div>
          )}
          {itemsError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to load inventory items</AlertTitle>
              <AlertDescription>
                {itemsError?.message || "Please refresh and try again."}
              </AlertDescription>
            </Alert>
          )}
          {!itemsLoading && noItemsAvailable && (
            <Alert>
              <AlertTitle>No items available</AlertTitle>
              <AlertDescription>
                Create an inventory item before recording manual transactions.
              </AlertDescription>
            </Alert>
          )}
          {formError && (
            <Alert variant="destructive">
              <AlertTitle>Submission blocked</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {!profile && !profileLoading && (
            <Alert variant="destructive">
              <AlertTitle>Profile required</AlertTitle>
              <AlertDescription>
                Sign in again to record transactions.
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label htmlFor="item">Item</Label>
            <Select
              value={formData.item_id}
              disabled={
                itemsLoading ||
                Boolean(itemsError) ||
                noItemsAvailable ||
                profileLoading ||
                !profile ||
                submitInFlight
              }
              onValueChange={(value) => {
                const nextItem = items.find((item) => item.id === value);
                const nextUnits = nextItem?.units || [];
                const nextPrimary =
                  nextUnits.find((unit) => unit.unit_level === 1) ||
                  nextUnits[0];
                const fallbackUnitId =
                  nextPrimary?.unit_id || nextItem?.unit_id || "";
                const baseCost =
                  nextPrimary?.cost_per_unit ??
                  nextItem?.calculated_cost_per_unit ??
                  nextItem?.cost_per_unit;

                setFormData((prev) => ({
                  ...prev,
                  item_id: value,
                  unit_id: fallbackUnitId,
                  unit_price:
                    baseCost !== undefined && baseCost !== null
                      ? baseCost.toFixed(2)
                      : "",
                  quantity: prev.quantity,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={itemsLoading ? "Loading items…" : "Select item"}
                />
              </SelectTrigger>
              <SelectContent>
                {items.length > 0 ? (
                  items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Stock: {item.min_stock_level || 0} units)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    {itemsError ? "Inventory unavailable" : "No items found"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, transaction_type: value }))
              }
              disabled={submitInFlight || profileLoading || !profile}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, quantity: e.target.value }))
                }
                required
                aria-invalid={quantityInvalid}
                disabled={submitInFlight || profileLoading || !profile}
              />
              {quantityInvalid && formData.quantity && (
                <p className="mt-1 text-xs text-destructive">
                  Enter a quantity greater than zero.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => {
                  const nextUnit = itemUnits.find(
                    (unit) => unit.unit_id === value,
                  );
                  const nextConversion = nextUnit?.conversion_factor || 1;
                  const baseCost =
                    selectedItem?.calculated_cost_per_unit ??
                    selectedItem?.cost_per_unit;
                  const nextCost =
                    nextUnit?.cost_per_unit ??
                    (baseCost !== undefined
                      ? baseCost * nextConversion
                      : undefined);

                  setFormData((prev) => ({
                    ...prev,
                    unit_id: value,
                    unit_price:
                      nextCost !== undefined && nextCost !== null
                        ? nextCost.toFixed(2)
                        : prev.unit_price,
                  }));
                }}
                disabled={!selectedItem || submitInFlight}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedItem ? "Select unit" : "Select item first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {selectedItem ? (
                    itemUnits.length > 0 ? (
                      itemUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.unit_id}>
                          {unit.unit?.name || "Unit"}
                          {unit.unit?.abbreviation
                            ? ` (${unit.unit.abbreviation})`
                            : ""}
                          {unit.unit_level > 1
                            ? ` · ${unit.conversion_factor}× base`
                            : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={selectedItem.unit_id || ""}>
                        {selectedItem.unit?.name || "Default unit"}
                      </SelectItem>
                    )
                  ) : (
                    <SelectItem value="" disabled>
                      Select an item first
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unit_price">Unit Price</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                placeholder={
                  suggestedUnitPrice !== undefined
                    ? suggestedUnitPrice.toFixed(2)
                    : "0.00"
                }
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    unit_price: e.target.value,
                  }))
                }
                disabled={submitInFlight || !selectedItem}
              />
            </div>
          </div>

          {selectedItem &&
            previewQuantity !== null &&
            Number.isFinite(previewQuantity) && (
              <p className="text-xs text-muted-foreground">
                ≈ {previewQuantity.toFixed(2)} {baseUnitLabel} (
                {conversionFactor} × {selectedUnitLabel})
              </p>
            )}

          <div>
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  reference_number: e.target.value,
                }))
              }
              placeholder="PO#, Invoice#, etc."
              disabled={submitInFlight}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              placeholder="Additional notes..."
              disabled={submitInFlight}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitInFlight}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {submitInFlight ? "Recording..." : "Record Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
