/**
 * Utility functions for filtering vendors
 */

import type { InventorySupplier } from "@/hooks/useInventory";

/**
 * Filter vendors by search term
 */
export function filterVendorsBySearch(
  vendors: InventorySupplier[],
  searchTerm: string,
): InventorySupplier[] {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return vendors;

  return vendors.filter((vendor) => {
    const contact = vendor.contact_name?.toLowerCase() ?? "";
    const email = vendor.email?.toLowerCase() ?? "";
    return (
      vendor.name.toLowerCase().includes(term) ||
      contact.includes(term) ||
      email.includes(term)
    );
  });
}
