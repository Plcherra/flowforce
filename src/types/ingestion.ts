import type { Tables } from '@/integrations/supabase/types';

export type IngestedFile = Tables<'files'>;
export type ExtractedDocument = Tables<'documents'>;
export type DocumentEvent = Tables<'events'>;
export type OodaCycle = Tables<'ooda_cycles'>;
export type TaskRecord = Tables<'tasks'>;

export type DocumentProcessingState = ExtractedDocument['processing_state'];
export type EventSeverity = DocumentEvent['severity'];
export type EventType = DocumentEvent['event_type'];
export type TaskSource = TaskRecord['source'];

export interface DocumentWithRelations extends ExtractedDocument {
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

