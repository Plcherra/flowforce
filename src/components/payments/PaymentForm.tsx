
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePayments } from '@/hooks/usePayments';
import { useProfile } from '@/hooks/useProfile';
import { Plus } from 'lucide-react';
import { logger } from '@/utils/logger';

export default function PaymentForm() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    payment_type: '',
    recipient_type: '',
    recipient_name: '',
    amount: '',
    payment_method: '',
    reference_number: '',
    description: '',
    due_date: '',
    notes: '',
  });

  const { profile } = useProfile();
  const { createPayment } = usePayments();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      await createPayment.mutateAsync({
        ...formData,
        amount: parseFloat(formData.amount),
        currency: 'USD',
        status: 'pending',
        created_by: profile.id,
        due_date: formData.due_date || undefined,
        notes: formData.notes || undefined,
        reference_number: formData.reference_number || undefined,
        payment_method: formData.payment_method || undefined,
      });
      
      setFormData({
        payment_type: '',
        recipient_type: '',
        recipient_name: '',
        amount: '',
        payment_method: '',
        reference_number: '',
        description: '',
        due_date: '',
        notes: '',
      });
      setOpen(false);
    } catch (error) {
      logger.error('Failed to create payment:', { error, tags: ['error'] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_type">Payment Type</Label>
              <Select value={formData.payment_type} onValueChange={(value) => setFormData({ ...formData, payment_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wage">Employee Wage</SelectItem>
                  <SelectItem value="vendor">Vendor Payment</SelectItem>
                  <SelectItem value="expense_reimbursement">Expense Reimbursement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recipient_type">Recipient Type</Label>
              <Select value={formData.recipient_type} onValueChange={(value) => setFormData({ ...formData, recipient_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="recipient_name">Recipient Name</Label>
            <Input
              id="recipient_name"
              value={formData.recipient_name}
              onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Invoice #, PO #, etc."
              />
            </div>
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
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
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? 'Creating...' : 'Create Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
