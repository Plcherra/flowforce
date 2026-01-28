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
  provider: "toast" | "marketman" | "quickbooks" | "connecteam" | null;
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
  po_id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  notes: string | null;
  payment_status: string;
  created_at: string;
}

export const PROVIDER_OPTIONS: Array<{
  value: "toast" | "marketman" | "quickbooks" | "connecteam";
  label: string;
  description: string;
}> = [
  {
    value: "toast",
    label: "Toast",
    description: "Restaurant POS and inventory management",
  },
  {
    value: "marketman",
    label: "MarketMan",
    description: "Foodservice inventory and ordering platform",
  },
  {
    value: "quickbooks",
    label: "QuickBooks",
    description: "Accounting and financial management",
  },
  {
    value: "connecteam",
    label: "Connecteam",
    description: "Employee management and scheduling",
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
