
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

export default function InventoryTransactionForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    transaction_type: '',
    quantity: '',
    unit_price: '',
    reference_number: '',
    notes: '',
  });

  const { profile } = useProfile();
  const { data: items } = useInventoryItems();
  const createTransaction = useCreateInventoryTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const quantity = parseInt(formData.quantity);
      const unitPrice = formData.unit_price ? parseFloat(formData.unit_price) : undefined;
      
      await createTransaction.mutateAsync({
        item_id: formData.item_id,
        transaction_type: formData.transaction_type as any,
        quantity,
        unit_price: unitPrice,
        total_amount: unitPrice ? quantity * unitPrice : undefined,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined,
        performed_by: profile.id,
      });
      
      setFormData({
        item_id: '',
        transaction_type: '',
        quantity: '',
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
            <Select value={formData.item_id} onValueChange={(value) => setFormData({ ...formData, item_id: value })}>
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="unit_price">Unit Price</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
            </div>
          </div>

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
