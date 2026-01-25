import type { Tables } from '@/integrations/supabase/public-types';

export type IngestedFile = Tables<'files'>;
export type ExtractedDocument = Tables<'documents'>;
export type DocumentEvent = Tables<'events'>;
export type IdeaCycle = Tables<'idea_cycles'>;
export type TaskRecord = Tables<'tasks'>;

export type DocumentProcessingState = ExtractedDocument['processing_state'];
export type EventSeverity = DocumentEvent['severity'];
export type EventType = DocumentEvent['event_type'];
export type TaskSource = TaskRecord['source'];

export interface DocumentWithRelations extends ExtractedDocument {
  // Explicitly include commonly accessed properties for type safety
  doc_date?: string | null;
  created_at?: string;
  updated_at?: string;
  processing_state?: 'pending' | 'processing' | 'ready' | 'error';
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
