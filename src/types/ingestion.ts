import type { Json, Tables } from "@/integrations/supabase/public-types";

export type IngestedFile = {
  id: string;
  company_id: string;
  uploaderid?: string | null;
  filename: string;
  mime_type?: string | null;
  file_size?: number | null;
  storage_path: string;
  metadata?: Record<string, unknown> | Json | null;
  created_at?: string;
  uploaded_at?: string;
  updated_at?: string;
};

export type ExtractedDocument = {
  id: string;
  company_id: string;
  fileid?: string | null;
  title?: string | null;
  doc_date?: string | null;
  source?: string | null;
  language?: string | null;
  meta?: Record<string, unknown> | Json | null;
  processing_state?: "pending" | "processing" | "ready" | "error";
  processing_error?: string | null;
  text_extracted?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DocumentEvent = {
  id: string;
  company_id: string;
  documentid?: string | null;
  summary: string;
  event_type: string;
  severity: "info" | "warning" | "critical";
  occurred_at?: string | null;
  details?: Record<string, unknown> | Json | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export type IdeaCycle = {
  id: string;
  company_id: string;
  title: string;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
};
export type TaskRecord = Tables<"tasks">;

export type DocumentProcessingState = ExtractedDocument["processing_state"];
export type EventSeverity = DocumentEvent["severity"];
export type EventType = DocumentEvent["event_type"];
export type TaskSource = string | null;

export interface DocumentWithRelations extends ExtractedDocument {
  // Explicitly include commonly accessed properties for type safety
  doc_date?: string | null;
  created_at?: string;
  updated_at?: string;
  processing_state?: "pending" | "processing" | "ready" | "error";
  text_extracted?: string | null;
  title?: string | null;
  source?: string | null;
  meta?: Record<string, unknown> | null;
  id: string;
  // Relations
  file?: IngestedFile | null;
  events?: DocumentEvent[];
  originating_tasks?: TaskRecord[];
}

export interface EventWithDocument extends DocumentEvent {
  document?: ExtractedDocument | null;
}

export interface TaskWithOrigins extends TaskRecord {
  origin_event?: DocumentEvent | null;
  origin_document?: ExtractedDocument | null;
}
