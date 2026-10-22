import { useTranslation } from "react-i18next";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceFormState } from "../../types/purchasing";

interface VendorInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: InvoiceFormState;
  onFormChange: (form: Partial<InvoiceFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}

export function VendorInvoiceDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
}: VendorInvoiceDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("inventory.logVendorInvoice")}</DialogTitle>
            <DialogDescription>
              {t("inventory.captureInvoiceDetailsToReconcileAgainstThePurchaseOrder")} </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invoice-number">{t("inventory.invoiceNumber")}</Label>
                <Input
                  id="invoice-number"
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    onFormChange({ invoiceNumber: event.target.value })
                  }
                  placeholder={t("inventory.invoice2")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-amount">{t("inventory.amount")}</Label>
                <Input
                  id="invoice-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    onFormChange({ amount: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-due">{t("forms.dueDate")}</Label>
                <Input
                  id="invoice-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    onFormChange({ dueDate: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">{t("inventory.paymentMethod")}</Label>
                <Select
                  value={form.paymentMethod}
                  onValueChange={(value) =>
                    onFormChange({ paymentMethod: value })
                  }
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">
                      {t("inventory.bankTransferAch")} </SelectItem>
                    <SelectItem value="check">{t("inventory.check")}</SelectItem>
                    <SelectItem value="credit_card">{t("inventory.creditCard2")}</SelectItem>
                    <SelectItem value="cash">{t("inventory.cash")}</SelectItem>
                    <SelectItem value="other">{t("schedule.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-notes">{t("schedule.notes")}</Label>
              <Textarea
                id="invoice-notes"
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  onFormChange({ notes: event.target.value })
                }
                placeholder={t("inventory.addMemoOrReconciliationDetails")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")} </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
