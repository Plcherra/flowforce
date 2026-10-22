/**
 * Vendor table component
 */

import { useTranslation } from "react-i18next";
import { Mail, Phone, Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { InventorySupplier } from "@/hooks/useInventory";

interface VendorTableProps {
  vendors: InventorySupplier[];
  isLoading: boolean;
}

export function VendorTable({ vendors, isLoading }: VendorTableProps) {
  const { t } = useTranslation();
  if (isLoading) {
    return null; // Loading handled by parent
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">{t("registration.companyInfo.name")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("employees.contact")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("auth.email")}</TableHead>
            <TableHead className="hidden md:table-cell">{t("onboarding.userInfo.fields.phone")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-warning-muted text-warning">
                      <Truck className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{vendor.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t("schedule.vendor")}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {vendor.contact_name || "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{vendor.email || "—"}</span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{vendor.phone || "—"}</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {vendors.length === 0 && (
          <TableCaption>{t("employees.noVendorsMatchYourFilters")}</TableCaption>
        )}
      </Table>
    </div>
  );
}
