
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';


interface ExpenseData {
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

interface ExpenseFormProps {
  onSubmit: (expenseData: ExpenseData) => Promise<void>;
  onCancel: () => void;
}

export default function ExpenseForm({ onSubmit, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    expense_date: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
      });
      setFormData({
        category: '',
        description: '',
        amount: '',
        expense_date: '',
        notes: '',
      });
    } catch (error) {
      console.error('Failed to create expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="travel">Travel</SelectItem>
            <SelectItem value="meals">Meals</SelectItem>
            <SelectItem value="office">Office Supplies</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="utilities">Utilities</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
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
        <Label htmlFor="expense_date">Expense Date</Label>
        <Input
          id="expense_date"
          type="date"
          value={formData.expense_date}
          onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
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
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Expense'}
        </Button>
      </div>
    </form>
  );
}
