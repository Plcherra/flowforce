// Form related types
export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "datetime"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "description"
  | "formula"
  | "number_slider"
  | "yes_no"
  | "location"
  | "image_upload"
  | "video_upload"
  | "audio_recording"
  | "file_upload"
  | "signature"
  | "rating"
  | "scanner"
  | "task"
  | "image_selection";

export interface FormFieldValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  validation?: FormFieldValidationRules;
  // New properties for enhanced field types
  min_value?: number;
  max_value?: number;
  step_value?: number;
  formula_expression?: string;
  dependent_fields?: string[];
  rating_config?: RatingConfig;
  scan_config?: ScanConfig;
  media_config?: MediaConfig;
  content?: string; // For description fields rich text content
}

// Configuration interfaces for complex field types
export interface RatingConfig {
  max_rating?: number;
  rating_type?: "stars" | "numeric" | "emoji";
  labels?: string[];
}

export interface ScanConfig {
  scan_types?: ("barcode" | "qr_code")[];
  auto_submit?: boolean;
}

export interface MediaConfig {
  max_size?: number; // in MB
  accepted_types?: string[];
  max_files?: number;
  compression?: boolean;
}

// Location data interface
export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  address?: string;
  timestamp: string;
}

// Signature data interface
export interface SignatureData {
  signature_data: string; // Base64 encoded
  signature_url?: string;
  signer_name?: string;
  signed_at: string;
}

// Rating data interface
export interface RatingData {
  rating_value: number;
  max_rating: number;
  rating_type: "stars" | "numeric" | "emoji";
}

// Scanner data interface
export interface ScanData {
  scan_data: string;
  scan_type: "barcode" | "qr_code";
  scan_format?: string;
}

export interface FormData {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export interface FormSubmission {
  id: string;
  form_id: string;
  submitted_by: string;
  data: Record<string, any>;
  created_at: string;
  // Enhanced submission data for complex field types
  location_data?: Record<string, LocationData>;
  signature_data?: Record<string, SignatureData>;
  rating_data?: Record<string, RatingData>;
  scan_data?: Record<string, ScanData>;
}

export interface CreateFormRequest {
  title: string;
  description?: string;
  fields?: FormField[];
}

export interface UpdateFormRequest extends Partial<CreateFormRequest> {
  id: string;
}

// Form field template for different field types
export interface FormFieldTemplate {
  type: FormFieldType;
  label: string;
  description: string;
  icon: string;
  category: "basic" | "media" | "interactive" | "location";
  default_config?: Partial<FormField>;
}

// Enhanced form submission with file attachments
export interface FormSubmissionFile {
  id: string;
  field_id: string;
  submission_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
}

// Task integration interface
export interface TaskData {
  task_id?: string;
  task_title: string;
  due_date?: string;
  assigned_to?: string[];
  priority: "low" | "medium" | "high";
  description?: string;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
}

// File upload data interface
export interface FileUploadData {
  url: string;
  filename: string;
  size: number;
  type: string;
}

// Image selection field data
export interface ImageSelectionData {
  selected_images: string[];
  image_urls: string[];
}
