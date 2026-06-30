// Strong type definitions to replace 'any' usage

export interface FormFieldValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  customValidator?: string;
}

export interface FormFieldData {
  id: string;
  form_id: string;
  field_type:
    | "text"
    | "email"
    | "number"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "date"
    | "file";
  fieldlabel: string;
  placeholder?: string;
  is_required: boolean;
  options?: string[];
  validation_rules?: Record<string, string | number | boolean>;
  field_order: number;
}

export type FormSubmissionData = Record<string, unknown>;

export interface PositionPermissions {
  canManageSchedules: boolean;
  canApproveTimeOff: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canEditForms: boolean;
  canAccessInventory: boolean;
  canProcessPayments: boolean;
  canManageTasks: boolean;
  [key: string]: boolean;
}

export interface Position {
  id: string;
  name: string;
  role: "staff" | "supervisor" | "manager" | "admin";
  departmentid?: string;
  description?: string;
  permissions?: PositionPermissions;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
  };
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: "pending" | "received" | "cancelled";
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  order_date: string;
  expected_delivery: string;
  status: "draft" | "sent" | "confirmed" | "delivered" | "cancelled";
  total_amount: number;
  notes?: string;
  created_by: string;
  approver?: {
    first_name: string;
    last_name: string;
  };
  purchase_order_items?: PurchaseOrderItem[];
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  type: "documentation" | "blog" | "video" | "download";
  url?: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  featured: boolean;
}

export interface ResourceData {
  documentation: ResourceItem[];
  blog: ResourceItem[];
  videos: ResourceItem[];
  downloads: ResourceItem[];
}

export interface PaymentAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploaded_at: string;
}

export interface PaymentApprover {
  first_name: string;
  last_name: string;
  email: string;
}
