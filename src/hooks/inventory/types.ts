
export interface InventoryUnit {
  id: string;
  name: string;
  abbreviation: string;
  unit_type: 'weight' | 'volume' | 'count';
  conversion_factor?: number;
  base_unit_id?: string;
  is_active: boolean;
}

export interface InventoryItem {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unit_id: string;
  unit?: InventoryUnit;
  unit_quantity?: number;
  cost_per_unit?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  preferred_supplier_id?: string;
  default_location_id?: string;
  location?: { id: string; name: string; location_type: string };
  shelf_life_days?: number;
  is_prep_item?: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  unit_price?: number;
  total_amount?: number;
  reference_number?: string;
  notes?: string;
  performed_by: string;
  created_at: string;
  item?: InventoryItem;
  performer?: {
    first_name: string;
    last_name: string;
  };
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_contact?: any;
  status: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  total_amount?: number;
  currency: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
  approver?: {
    first_name: string;
    last_name: string;
  };
  purchase_order_items?: any[];
}

export interface InventoryCount {
  id: string;
  count_date: string;
  count_type: string;
  status: string;
  location_id?: string;
  notes?: string;
  counted_by: string;
  completed_at?: string;
  created_at: string;
}

export interface InventoryCountLine {
  id: string;
  count_id: string;
  item_id: string;
  expected_quantity?: number;
  counted_quantity: number;
  variance?: number;
  notes?: string;
  lot_id?: string;
  counted_at?: string;
}

export interface InventorySupplier {
  id: string;
  company_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
