/**
 * Types for inventory purchasing feature
 */

export interface DraftLineItem {
  id: string;
  itemId?: string;
  itemName: string;
  category?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IntegrationFormState {
  provider: "marketman" | "us_foods" | "baldor" | "sysco" | "other" | null;
  account_id: string;
  api_key: string;
  notes: string;
}

export interface InvoiceFormState {
  po_id: string;
  invoiceNumber: string; // camelCase to match component usage
  amount: string; // Stored as string for form input, converted to number on submit
  dueDate: string; // camelCase to match component usage
  notes: string;
  paymentMethod: string; // camelCase to match component usage
}

export interface VendorInvoiceRecord {
  id: string;
  po_id?: string | null;
  invoice_number?: string | null;
  reference_number?: string | null;
  amount?: number | null;
  due_date?: string | null;
  notes?: string | null;
  description?: string | null;
  payment_status?: string | null;
  payment_method?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export const PROVIDER_OPTIONS: Array<{
  value: "marketman" | "us_foods" | "baldor" | "sysco" | "other";
  label: string;
  description: string;
}> = [
  {
    value: "marketman",
    label: "MarketMan",
    description: "Foodservice inventory and ordering platform",
  },
  {
    value: "us_foods",
    label: "US Foods",
    description: "Foodservice distributor catalog and ordering",
  },
  {
    value: "baldor",
    label: "Baldor",
    description: "Fresh produce and specialty food supplier",
  },
  {
    value: "sysco",
    label: "Sysco",
    description: "Broadline foodservice distributor",
  },
  {
    value: "other",
    label: "Other",
    description: "Custom supplier integration",
  },
];

/**
 * Extract invoice number from notes or description
 */
export function extractInvoiceNumber(
  notes?: string | null,
  description?: string | null,
): string | null {
  if (notes) {
    const match = notes.match(/Invoice\s?#([^•]+)/i);
    if (match) return match[1].trim();
  }
  if (description) {
    const match = description.match(/Invoice\s+([^\s]+)\s+for/i);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Generate a unique line item ID
 */
export function generateLineId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Create a new draft line item
 */
export function createDraftLineItem(): DraftLineItem {
  return {
    id: generateLineId(),
    itemId: undefined,
    itemName: "",
    category: null,
    quantity: 1,
    unitPrice: 0,
    total: 0,
  };
}
