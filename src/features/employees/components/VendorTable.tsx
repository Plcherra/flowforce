/**
 * Vendor table component
 */

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
  if (isLoading) {
    return null; // Loading handled by parent
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%]">Company Name</TableHead>
            <TableHead className="hidden md:table-cell">Contact</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden md:table-cell">Phone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.map((vendor) => (
            <TableRow key={vendor.id} className="hover:bg-muted/30">
              <TableCell>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-orange-100 text-orange-600">
                      <Truck className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{vendor.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      Vendor
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
          <TableCaption>No vendors match your filters.</TableCaption>
        )}
      </Table>
    </div>
  );
}
