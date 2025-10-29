
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateInventoryTransaction } from '@/hooks/useInventory';
import { useInventoryItems } from '@/hooks/useInventory';
import { useProfile } from '@/hooks/useProfile';
import { Plus } from 'lucide-react';

export function computeInventoryTransactionTotals(quantity: number, conversionFactor: number, unitPrice?: number) {
  const normalizedQuantity = quantity * conversionFactor;
  const totalAmount = unitPrice !== undefined ? normalizedQuantity * unitPrice : undefined;

  return { normalizedQuantity, totalAmount };
}

export default function InventoryTransactionForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    transaction_type: '',
    quantity: '',
    unit_id: '',
    unit_price: '',
    reference_number: '',
    notes: '',
  });

  const { profile } = useProfile();
  const { data: items } = useInventoryItems();
  const createTransaction = useCreateInventoryTransaction();

  const selectedItem = items?.find((item) => item.id === formData.item_id);
  const itemUnits = selectedItem?.units || [];
  const primaryUnit = itemUnits.find((unit) => unit.unit_level === 1) || itemUnits[0];
  const selectedUnit = itemUnits.find((unit) => unit.unit_id === formData.unit_id) || primaryUnit;
  const baseCostPerUnit = selectedItem?.calculated_cost_per_unit ?? selectedItem?.cost_per_unit ?? undefined;
  const conversionFactor = selectedUnit?.conversion_factor || 1;
  const suggestedUnitPrice = selectedUnit?.cost_per_unit ?? (baseCostPerUnit !== undefined ? baseCostPerUnit * conversionFactor : undefined);
  const quantityValue = parseFloat(formData.quantity);
  const previewQuantity = Number.isFinite(quantityValue) ? quantityValue * conversionFactor : null;
  const selectedUnitLabel = selectedUnit?.unit?.abbreviation || selectedUnit?.unit?.name || 'unit';
  const baseUnitLabel = primaryUnit?.unit?.abbreviation || primaryUnit?.unit?.name || 'base unit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      if (!formData.item_id) {
        throw new Error('Please select an item');
      }

      const quantity = parseFloat(formData.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error('Quantity must be greater than zero');
      }

      const conversion = selectedUnit?.conversion_factor || 1;
      const unitPrice = formData.unit_price
        ? parseFloat(formData.unit_price)
        : (suggestedUnitPrice !== undefined ? suggestedUnitPrice : undefined);
      const { normalizedQuantity, totalAmount } = computeInventoryTransactionTotals(quantity, conversion, unitPrice);

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
        item_id: '',
        transaction_type: '',
        quantity: '',
        unit_id: '',
        unit_price: '',
        reference_number: '',
        notes: '',
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to create inventory transaction:', error);
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
          <div>
            <Label htmlFor="item">Item</Label>
            <Select
              value={formData.item_id}
              onValueChange={(value) => {
                const nextItem = items?.find((item) => item.id === value);
                const nextUnits = nextItem?.units || [];
                const nextPrimary = nextUnits.find((unit) => unit.unit_level === 1) || nextUnits[0];
                const fallbackUnitId = nextPrimary?.unit_id || nextItem?.unit_id || '';
                const baseCost = nextPrimary?.cost_per_unit ?? nextItem?.calculated_cost_per_unit ?? nextItem?.cost_per_unit;

                setFormData((prev) => ({
                  ...prev,
                  item_id: value,
                  unit_id: fallbackUnitId,
                  unit_price: baseCost !== undefined && baseCost !== null ? baseCost.toFixed(2) : '',
                  quantity: prev.quantity,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} (Stock: {item.min_stock_level || 0} units)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select value={formData.transaction_type} onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}>
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
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => {
                  const nextUnit = itemUnits.find((unit) => unit.unit_id === value);
                  const nextConversion = nextUnit?.conversion_factor || 1;
                  const baseCost = selectedItem?.calculated_cost_per_unit ?? selectedItem?.cost_per_unit;
                  const nextCost = nextUnit?.cost_per_unit ?? (baseCost !== undefined ? baseCost * nextConversion : undefined);

                  setFormData((prev) => ({
                    ...prev,
                    unit_id: value,
                    unit_price: nextCost !== undefined && nextCost !== null ? nextCost.toFixed(2) : prev.unit_price,
                  }));
                }}
                disabled={!selectedItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedItem ? 'Select unit' : 'Select item first'} />
                </SelectTrigger>
                <SelectContent>
                  {selectedItem ? (
                    itemUnits.length > 0 ? (
                      itemUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.unit_id}>
                          {unit.unit?.name || 'Unit'}{unit.unit?.abbreviation ? ` (${unit.unit.abbreviation})` : ''}
                          {unit.unit_level > 1 ? ` · ${unit.conversion_factor}× base` : ''}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={selectedItem.unit_id || ''}>
                        {selectedItem.unit?.name || 'Default unit'}
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
                placeholder={suggestedUnitPrice !== undefined ? suggestedUnitPrice.toFixed(2) : '0.00'}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
            </div>
          </div>

          {selectedItem && previewQuantity !== null && Number.isFinite(previewQuantity) && (
            <p className="text-xs text-muted-foreground">
              ≈ {previewQuantity.toFixed(2)} {baseUnitLabel} ({conversionFactor} × {selectedUnitLabel})
            </p>
          )}

          <div>
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="PO#, Invoice#, etc."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTransaction.isPending}>
              {createTransaction.isPending ? 'Recording...' : 'Record Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
