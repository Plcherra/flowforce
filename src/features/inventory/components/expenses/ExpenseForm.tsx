import { ChangeEvent, FormEvent, useState } from "react";
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
import { logger } from "@/utils/logger";

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

type ExpenseFormState = {
  category: string;
  description: string;
  amount: string;
  expense_date: string;
  notes: string;
};

type ExpenseFormErrors = Partial<Record<"category" | "amount", string>>;

const createInitialFormState = (): ExpenseFormState => ({
  category: "",
  description: "",
  amount: "",
  expense_date: "",
  notes: "",
});

export default function ExpenseForm({ onSubmit, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormState>(
    createInitialFormState(),
  );
  const [errors, setErrors] = useState<ExpenseFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFieldError = (field: keyof ExpenseFormErrors) => {
    setErrors((prevErrors) => {
      if (!prevErrors[field]) {
        return prevErrors;
      }
      const nextErrors = { ...prevErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const resetForm = () => {
    setFormData(createInitialFormState());
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors: ExpenseFormErrors = {};
    const trimmedAmountInput = formData.amount.trim();
    const parsedAmount = Number(trimmedAmountInput);

    if (!formData.category) {
      validationErrors.category = "Select a category.";
    }

    if (!trimmedAmountInput) {
      validationErrors.amount = "Enter an amount.";
    } else if (!Number.isFinite(parsedAmount)) {
      validationErrors.amount = "Enter a valid number.";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const trimmedNotes = formData.notes.trim();
      await onSubmit({
        category: formData.category,
        description: formData.description.trim(),
        amount: parsedAmount,
        expense_date: formData.expense_date,
        notes: trimmedNotes ? trimmedNotes : undefined,
      });
      resetForm();
    } catch (error) {
      logger.error("Failed to create expense:", { error, tags: ["error"] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }));
    if (value) {
      clearFieldError("category");
    }
  };

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFormData((prev) => ({ ...prev, amount: value }));

    if (!errors.amount) {
      return;
    }

    const trimmedValue = value.trim();
    if (trimmedValue && Number.isFinite(Number(trimmedValue))) {
      clearFieldError("amount");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={handleCategoryChange}>
          <SelectTrigger
            id="category"
            aria-invalid={Boolean(errors.category)}
            aria-describedby={errors.category ? "category-error" : undefined}
          >
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
        {errors.category ? (
          <p id="category-error" className="mt-1 text-sm text-destructive">
            {errors.category}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              description: event.target.value,
            }))
          }
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
          inputMode="decimal"
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? "amount-error" : undefined}
          onChange={handleAmountChange}
          required
        />
        {errors.amount ? (
          <p id="amount-error" className="mt-1 text-sm text-destructive">
            {errors.amount}
          </p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="expense_date">Expense Date</Label>
        <Input
          id="expense_date"
          type="date"
          value={formData.expense_date}
          onChange={(event) =>
            setFormData((prev) => ({
              ...prev,
              expense_date: event.target.value,
            }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, notes: event.target.value }))
          }
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Expense"}
        </Button>
      </div>
    </form>
  );
}
