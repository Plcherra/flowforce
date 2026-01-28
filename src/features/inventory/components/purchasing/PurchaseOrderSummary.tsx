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
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-4 w-4" />
            Supplier Snapshot
          </CardTitle>
          <CardDescription>
            Contact and integration details from Items & Setup.
          </CardDescription>
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
                    Integration Status
                  </span>
                  {selectedSupplierIntegration ? (
                    <Badge variant="default" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      Connected ({selectedSupplierIntegration.provider})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Link2 className="h-3 w-3" />
                      Not linked
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onLinkIntegration}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Link Integration
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a supplier to view contact and integration details.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span>Line Items</span>
            <span className="font-medium">{lineItems.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Estimated Total</span>
            <span className="font-medium">
              {formatCurrency(orderTotal, currency)}
            </span>
          </div>
          {outstandingBalance !== undefined && (
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Open Balance with Supplier</span>
              <span>{formatCurrency(outstandingBalance, currency)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-medium">Auto-approve order</span>
            <Switch
              checked={autoApprove}
              onCheckedChange={onAutoApproveChange}
              aria-label="Auto approve purchase order"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enable to move this purchase order directly to{" "}
            <strong>Ordered</strong> without manager approval.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
