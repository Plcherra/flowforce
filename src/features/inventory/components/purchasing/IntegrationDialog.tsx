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
import type { IntegrationFormState } from "../../types/purchasing";
import { PROVIDER_OPTIONS } from "../../types/purchasing";

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: IntegrationFormState;
  onFormChange: (form: Partial<IntegrationFormState>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
}

export function IntegrationDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isSubmitting,
}: IntegrationDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("inventory.linkSupplierIntegration")}</DialogTitle>
            <DialogDescription>
              {t("inventory.connectSupplierApisToSyncCatalogsPricingAndOrderStatusesAutomatically")} </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="integration-provider">{t("inventory.provider")}</Label>
              <Select
                value={form.provider ?? ""}
                onValueChange={(value) =>
                  onFormChange({
                    provider: value as IntegrationFormState["provider"],
                  })
                }
              >
                <SelectTrigger id="integration-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col text-start">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-account">{t("inventory.accountIdentifier")}</Label>
              <Input
                id="integration-account"
                value={form.account_id}
                onChange={(event) =>
                  onFormChange({ account_id: event.target.value })
                }
                placeholder={t("inventory.eGMarketmanStoreIdOrVendorAccountNumber")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-key">{t("inventory.apiKeySecret")}</Label>
              <Input
                id="integration-key"
                value={form.api_key}
                onChange={(event) =>
                  onFormChange({ api_key: event.target.value })
                }
                placeholder={t("inventory.secureCredentialStoredEncrypted")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-notes">{t("inventory.integrationNotes")}</Label>
              <Textarea
                id="integration-notes"
                rows={3}
                value={form.notes}
                onChange={(event) =>
                  onFormChange({ notes: event.target.value })
                }
                placeholder={t("inventory.connectionDetailsSyncCadenceOrContacts")}
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
              {isSubmitting ? "Linking..." : "Save Integration"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
