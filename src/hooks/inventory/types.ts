
export interface InventoryUnit {
  id: string;
  name: string;
  abbreviation: string;
  unit_type: 'weight' | 'volume' | 'count';
  conversion_factor?: number;
  base_unit_id?: string;
  parent_unit_id?: string | null;
  conversion_to_parent?: number | null;
  is_base_unit?: boolean | null;
  is_active: boolean;
  packaging_info?: any;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItemUnit {
  id: string;
  item_id: string;
  unit_id: string;
  unit_level: number;
  conversion_factor: number;
  is_primary?: boolean | null;
  is_countable?: boolean | null;
  cost_per_unit?: number | null;
  unit?: InventoryUnit;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string | null;
  category?: string | null;
  category_id?: string | null;
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
  recipe_yield_quantity?: number | null;
  recipe_yield_unit_id?: string | null;
  recipe_yield_unit?: InventoryUnit | null;
  preferred_supplier?: InventorySupplier | null;
  category_details?: InventoryCategory | null;
  units?: InventoryItemUnit[];
  recipes?: InventoryRecipe[];
  calculated_cost_per_unit?: number;
  recipe_cost_per_unit?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type InventoryItemInsert = Omit<
  InventoryItem,
  | 'id'
  | 'unit'
  | 'location'
  | 'units'
  | 'recipes'
  | 'category_details'
  | 'preferred_supplier'
  | 'recipe_yield_unit'
  | 'calculated_cost_per_unit'
  | 'recipe_cost_per_unit'
  | 'created_at'
  | 'updated_at'
>;

export type InventoryItemUpdate = Partial<InventoryItemInsert>;

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryRecipeLine {
  id: string;
  item_id: string;
  ingredient_id: string;
  quantity_needed: number;
  unit_id: string;
  notes?: string | null;
  yield_amount?: number | null;
  ingredient?: InventoryItem;
  unit?: InventoryUnit;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryRecipe {
  id: string;
  item_id: string;
  lines: InventoryRecipeLine[];
  total_cost?: number;
  cost_per_unit?: number;
  yield_quantity?: number;
  yield_unit_id?: string | null;
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

export interface SupplierIntegrationDetails {
  provider: 'marketman' | 'us_foods' | 'baldor' | 'sysco' | 'other';
  account_id?: string;
  api_key?: string;
  status?: 'connected' | 'pending' | 'error' | 'disabled';
  last_synced_at?: string;
  sync_notes?: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity?: number | null;
  created_at: string;
  inventory_item?: InventoryItem | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  supplier_contact?: {
    email?: string;
    phone?: string;
    address?: Record<string, unknown>;
    supplier_id?: string;
    integration?: SupplierIntegrationDetails;
  } | null;
  status: 'draft' | 'pending' | 'ordered' | 'partial' | 'received' | 'cancelled' | string;
  order_date: string;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  total_amount?: number | null;
  currency: string;
  notes?: string | null;
  created_by: string;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    first_name: string;
    last_name: string;
  } | null;
  approver?: {
    first_name: string;
    last_name: string;
  } | null;
  purchase_order_items?: PurchaseOrderItem[];
}

export interface InventoryCount {
  id: string;
  count_date: string;
  count_period?: string | null;
  count_type: string;
  status: string;
  location_id?: string;
  locations?: Array<{ id: string; name: string; location_type?: string }>;
  description?: string | null;
  notes?: string;
  counted_by: string;
  submitted_at?: string | null;
  review_status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
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
  unit_id?: string | null;
  unit_level?: number | null;
  conversion_factor?: number | null;
  counted_in_base_units?: number | null;
  notes_per_unit?: Record<string, any> | null;
  item?: {
    id: string;
    name: string;
    sku?: string | null;
    category?: string | null;
  } | null;
  unit?: {
    id: string;
    name: string;
    abbreviation?: string | null;
  } | null;
}

export interface InventorySupplier {
  id: string;
  company_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: Record<string, unknown> | string | null;
  payment_terms?: string;
  notes?: string;
  integration?: SupplierIntegrationDetails | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductionType = 'prep' | 'batch' | 'cooked' | 'baked' | 'other';

export interface ProductionMaterialUsage {
  id?: string;
  production_id?: string;
  ingredient_item_id: string;
  quantity_used: number;
  unit_id: string;
  unit_cost?: number | null;
  total_cost?: number | null;
  waste_quantity?: number | null;
  created_at?: string;
  updated_at?: string;
  ingredient?: InventoryItem | null;
  unit?: InventoryUnit | null;
  quantityInRecipeUnit?: number;
  recipeUnit?: InventoryUnit | null;
  conversionFactor?: number | null;
}

export interface ProductionApproval {
  id: string;
  production_id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'resubmitted';
  action_by: string;
  action_at: string;
  notes?: string | null;
  actor?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface ProductionEvent {
  id: string;
  company_id: string;
  item_id: string;
  production_type: ProductionType;
  produced_quantity: number;
  produced_unit_id: string;
  yield_quantity?: number | null;
  yield_unit_id?: string | null;
  waste_quantity?: number | null;
  waste_unit_id?: string | null;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_output_cost: number;
  unit_output_cost?: number | null;
  batch_reference?: string | null;
  notes?: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  produced_at: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string | null;
  approved_at?: string | null;
  item?: InventoryItem;
  produced_unit?: InventoryUnit | null;
  yield_unit?: InventoryUnit | null;
  waste_unit?: InventoryUnit | null;
  creator?: {
    first_name: string | null;
    last_name: string | null;
  };
  approver?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  materials?: ProductionMaterialUsage[];
  approvals?: ProductionApproval[];
}

export interface ProductionEventInput {
  item_id: string;
  production_type: ProductionType;
  produced_quantity: number;
  produced_unit_id: string;
  yield_quantity?: number | null;
  yield_unit_id?: string | null;
  waste_quantity?: number | null;
  waste_unit_id?: string | null;
  notes?: string | null;
  batch_reference?: string | null;
  produced_at?: string;
  labor_cost?: number;
  overhead_cost?: number;
  submission_note?: string | null;
}

export type InventoryTransferStatus = 'requested' | 'sent' | 'received' | 'rejected';

export interface InventoryTransferItem {
  id: string;
  transfer_id: string;
  item_id: string;
  unit_id: string;
  quantity: number;
  cost_per_unit?: number | null;
  total_cost?: number | null;
  created_at: string;
  item?: InventoryItem;
  unit?: InventoryUnit;
}

export interface InventoryTransferAudit {
  id: string;
  transfer_id: string;
  action: 'created' | 'updated' | 'status_changed' | 'deleted';
  old_status?: InventoryTransferStatus | null;
  new_status?: InventoryTransferStatus | null;
  note?: string | null;
  actor_id?: string | null;
  created_at: string;
  actor?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  };
}

export interface InventoryTransfer {
  id: string;
  company_id: string;
  requested_by: string;
  fulfiller_id: string;
  recipient_id: string;
  from_location_id: string;
  to_location_id: string;
  status: InventoryTransferStatus;
  delivery_date?: string | null;
  comments?: string | null;
  status_note?: string | null;
  total_cost: number;
  total_quantity: number;
  requested_at: string;
  sent_at?: string | null;
  received_at?: string | null;
  rejected_at?: string | null;
  updated_at: string;
  created_at: string;
  from_location?: {
    id: string;
    name: string;
    location_type?: string;
  };
  to_location?: {
    id: string;
    name: string;
    location_type?: string;
  };
  requester?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  };
  fulfiller?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  };
  recipient?: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
  };
  items?: InventoryTransferItem[];
  audit?: InventoryTransferAudit[];
}
