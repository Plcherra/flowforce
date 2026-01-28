// Common types to replace 'any' usage across the application
import type { Tables } from "@/integrations/supabase/public-types";

export interface FormSubmission {
  id: string;
  form_id: string;
  submitted_by: string;
  submission_data: unknown; // JSON data from form submission
  submitted_at: string;
  ip_address?: string;
  user_agent?: string;
  submitted_profile?: {
    first_name: string;
    last_name: string;
  };
}

export interface FormField {
  id: string;
  form_id: string;
  field_type:
    | "text"
    | "email"
    | "number"
    | "select"
    | "checkbox"
    | "textarea"
    | "date"
    | "file"
    | "phone"
    | "datetime"
    | "radio";
  label: string;
  description?: string;
  placeholder?: string;
  is_required: boolean;
  field_order: number;
  options?: unknown; // JSON field for field options
  validation_rules?: unknown; // JSON field for validation rules
}

export interface Schedule {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  user_id: string;
  color?: string;
  status:
    | "scheduled"
    | "in-progress"
    | "completed"
    | "cancelled"
    | "confirmed"
    | "no_show";
  is_published: boolean;
  assignments?: ScheduleAssignment[];
  required_headcount?: number;
  location?: string;
  notes?: string;
  company_id?: string;
  position_id?: string;
  job_position?: {
    id: string;
    name: string;
    role: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleAssignment {
  id: string;
  user_id: string;
  schedule_id: string;
  status: string;
  assigned_at?: string;
  assigned_by?: string;
  notes?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export interface SchedulingFilters {
  department?: string;
  position?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  type: "blog" | "video" | "documentation" | "download";
  url?: string;
  category: string;
  tags: string[];
  created_at: string;
  thumbnail?: string;
  // Optional fields for specific resource types
  readTime?: string;
  author?: string;
  publishDate?: string;
  duration?: string;
  embedUrl?: string;
  platforms?: string[];
  format?: string;
  downloadUrl?: string;
}

export interface CompanySettings {
  id: string;
  company_id: string;
  timezone: string;
  working_hours: {
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
  break_duration: number;
  overtime_threshold: number;
  weekend_rate_multiplier: number;
}

export interface PaymentAttachment {
  id: string;
  filename: string;
  file_url: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
}

// Error types
export interface AuthError {
  message: string;
  status?: number;
  code?: string;
}

// Company and onboarding related types
export interface CompanyRole {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  hierarchy_level?: number;
  permissions: Record<string, boolean>;
  is_system_role?: boolean;
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  roleId: string;
  permissions: Record<string, boolean>;
}

export interface CompanyConfig {
  template_id?: string;
  template_name?: string;
  enabled_sections: string[];
  custom_branding?: {
    primary_color: string;
    secondary_color: string;
    logo_url?: string;
  };
  [key: string]: unknown; // Allow additional dynamic properties for JSON storage
}

export interface UserMetadata {
  first_name: string;
  last_name: string;
  company_id?: string;
  [key: string]: string | undefined;
}

// Analytics and insights types
export interface FormAnalyticsData {
  submissions: FormSubmission[];
  dailyData: Array<{
    date: string;
    submissions: number;
    completions: number;
  }>;
  fieldAnalytics: Array<{
    field_id: string;
    completion_rate: number;
    avg_time: number;
  }>;
}

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

// Payment types
export interface Payment {
  id: string;
  amount: number;
  description: string;
  category: string;
  status: "pending" | "approved" | "rejected" | "paid";
  due_date?: string;
  paid_date?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  attachments?: PaymentAttachment[];
  approver?: {
    first_name: string;
    last_name: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
  };
}

// Task types
type TaskRow = Tables<"tasks">;

export type Task = TaskRow & {
  assigned_profile?: {
    first_name: string;
    last_name: string;
  } | null;
  created_profile?: {
    first_name: string;
    last_name: string;
  } | null;
  department?: {
    name: string;
  } | null;
  goal?: {
    id: string;
    title: string;
    status: string;
    progress: number;
    target_completion_date: string | null;
  } | null;
};

// Navigation types
export interface NavigationItem {
  id: string;
  title: string;
  icon: string;
  path: string;
  description?: string;
  badge?: string;
  requiresAuth?: boolean;
  roles?: string[];
}

export interface NavigationSection {
  id: string;
  title: string;
  items: NavigationItem[];
}
