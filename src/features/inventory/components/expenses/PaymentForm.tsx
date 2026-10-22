import { useTranslation } from "react-i18next";
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
import { usePayments } from "@/hooks/usePayments";
import { useProfile } from "@/hooks/useProfile";
import { Plus } from "lucide-react";
import { logger } from "@/utils/logger";

export default function PaymentForm() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    payment_type: "",
    recipient_type: "",
    recipient_name: "",
    amount: "",
    payment_method: "",
    reference_number: "",
    description: "",
    due_date: "",
    notes: "",
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
        currency: "USD",
        status: "pending",
        created_by: profile.id,
        due_date: formData.due_date || undefined,
        notes: formData.notes || undefined,
        reference_number: formData.reference_number || undefined,
        payment_method: formData.payment_method || undefined,
      });

      setFormData({
        payment_type: "",
        recipient_type: "",
        recipient_name: "",
        amount: "",
        payment_method: "",
        reference_number: "",
        description: "",
        due_date: "",
        notes: "",
      });
      setOpen(false);
    } catch (error) {
      logger.error("Failed to create payment:", { error, tags: ["error"] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("inventory.newPayment")} </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("inventory.createNewPayment")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_type">{t("inventory.paymentType")}</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("messages.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wage">{t("inventory.employeeWage")}</SelectItem>
                  <SelectItem value="vendor">{t("inventory.vendorPayment")}</SelectItem>
                  <SelectItem value="expense_reimbursement">
                    {t("inventory.expenseReimbursement")} </SelectItem>
                  <SelectItem value="other">{t("schedule.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recipient_type">{t("inventory.recipientType")}</Label>
              <Select
                value={formData.recipient_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, recipient_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("messages.selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">{t("schedule.employee")}</SelectItem>
                  <SelectItem value="vendor">{t("schedule.vendor")}</SelectItem>
                  <SelectItem value="contractor">{t("inventory.contractor")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="recipient_name">{t("inventory.recipientName")}</Label>
            <Input
              id="recipient_name"
              value={formData.recipient_name}
              onChange={(e) =>
                setFormData({ ...formData, recipient_name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">{t("inventory.amount")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="payment_method">{t("inventory.paymentMethod")}</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("inventory.selectMethod")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">{t("inventory.bankTransfer")}</SelectItem>
                  <SelectItem value="check">{t("inventory.check")}</SelectItem>
                  <SelectItem value="cash">{t("inventory.cash")}</SelectItem>
                  <SelectItem value="credit_card">{t("inventory.creditCard")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference_number">{t("inventory.referenceNumber")}</Label>
              <Input
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) =>
                  setFormData({ ...formData, reference_number: e.target.value })
                }
                placeholder={t("inventory.invoicePoEtc")}
              />
            </div>
            <div>
              <Label htmlFor="due_date">{t("forms.dueDate")}</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t("tasks.description")}</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">{t("schedule.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              placeholder={t("schedule.additionalNotes")}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")} </Button>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? "Creating..." : "Create Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
