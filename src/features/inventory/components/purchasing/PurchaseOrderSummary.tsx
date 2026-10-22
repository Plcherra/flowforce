import { useTranslation } from "react-i18next";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { BadgeCheck, TrendingUp, Link2 } from "lucide-react";
import { formatCurrency } from "@/shared/utils";
import type { DraftLineItem } from "../../types/purchasing";

interface Supplier {
  id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  integration?: {
    provider: string;
    account_id?: string;
  } | null;
}

interface PurchaseOrderSummaryProps {
  selectedSupplier: Supplier | null;
  selectedSupplierIntegration: Supplier["integration"];
  lineItems: DraftLineItem[];
  orderTotal: number;
  autoApprove: boolean;
  onAutoApproveChange: (value: boolean) => void;
  onLinkIntegration: () => void;
  outstandingBalance?: number;
  currency?: string;
}

export function PurchaseOrderSummary({
  selectedSupplier,
  selectedSupplierIntegration,
  lineItems,
  orderTotal,
  autoApprove,
  onAutoApproveChange,
  onLinkIntegration,
  outstandingBalance,
  currency = "USD",
}: PurchaseOrderSummaryProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4" />
            {t("inventory.supplierSnapshot")} </CardTitle>
          <CardDescription>
            {t("inventory.contactAndIntegrationDetailsFromItemsSetup")} </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {selectedSupplier ? (
            <>
              <div className="space-y-1">
                <p className="font-medium">{selectedSupplier.name}</p>
                <p className="text-muted-foreground">
                  {selectedSupplier.contact_name || "No contact on file"}
                </p>
              </div>
              <div className="space-y-1 text-muted-foreground">
                <p>{selectedSupplier.email || "No email provided"}</p>
                <p>{selectedSupplier.phone || "No phone provided"}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {t("inventory.integrationStatus")} </span>
                  {selectedSupplierIntegration ? (
                    <Badge variant="default" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      Connected ({selectedSupplierIntegration.provider})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      {t("inventory.notLinked")} </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onLinkIntegration}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  {t("inventory.linkIntegration")} </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("inventory.selectASupplierToViewContactAndIntegrationDetails")} </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {t("inventory.orderSummary")} </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>{t("inventory.lineItems")}</span>
            <span className="font-medium">{lineItems.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("inventory.estimatedTotal2")}</span>
            <span className="font-medium">
              {formatCurrency(orderTotal, currency)}
            </span>
          </div>
          {outstandingBalance !== undefined && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{t("inventory.openBalanceWithSupplier")}</span>
              <span>{formatCurrency(outstandingBalance, currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("inventory.autoApproveOrder")}</span>
            <Switch
              checked={autoApprove}
              onCheckedChange={onAutoApproveChange}
              aria-label={t("inventory.autoApprovePurchaseOrder")}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("inventory.enableToMoveThisPurchaseOrderDirectlyTo")}{" "}
            <strong>{t("inventory.ordered")}</strong> {t("inventory.withoutManagerApproval")} </p>
        </CardContent>
      </Card>
    </div>
  );
}
