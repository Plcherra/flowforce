import { supabase } from '@/integrations/supabase/client';
import type {
  DocumentEvent,
  DocumentProcessingState,
  DocumentWithRelations,
  EventSeverity,
  EventType,
  ExtractedDocument,
  IngestedFile,
  TaskRecord,
} from '@/types/ingestion';

const REPORTS_BUCKET = 'operations-reports';

const companyIdCache = new Map<string, string>();

type JsonRecord = Record<string, unknown>;

type NullableDate = Date | string | null | undefined;

export interface UploadReportOptions {
  companyId?: string;
  docDate?: NullableDate;
  source?: string;
  language?: string | null;
  metadata?: JsonRecord;
}

export interface UploadReportParams extends UploadReportOptions {
  userId: string;
}

export interface UploadReportResult {
  file: IngestedFile;
  document: ExtractedDocument;
  storagePath: string;
}

export interface DocumentListOptions {
  limit?: number;
  states?: DocumentProcessingState[];
  companyId?: string;
}

export interface ParsedEventInput {
  summary: string;
  event_type: EventType;
  severity?: EventSeverity;
  occurred_at?: NullableDate;
  details?: JsonRecord;
  tags?: string[];
}

function toDateString(value: NullableDate): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 10);
  }
  try {
    return value.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

async function resolveCompanyId(userId: string, explicit?: string): Promise<string> {
  if (explicit) {
    companyIdCache.set(userId, explicit);
    return explicit;
  }

  const cached = companyIdCache.get(userId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Unable to resolve company: ${error.message}`);
  }

  if (!data?.company_id) {
    throw new Error('No company assigned to current user');
  }

  companyIdCache.set(userId, data.company_id);
  return data.company_id;
}

function buildStoragePath(companyId: string, fileName: string) {
  const sanitized = fileName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  const cryptoRef = (typeof globalThis !== 'undefined' && 'crypto' in globalThis)
    ? (globalThis.crypto as Crypto | undefined)
    : undefined;
  const uniqueId = cryptoRef && 'randomUUID' in cryptoRef
    ? cryptoRef.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${companyId}/${uniqueId}-${sanitized}`;
}

export async function uploadReportFile(file: File, params: UploadReportParams): Promise<UploadReportResult> {
  const { userId, companyId: explicitCompany, docDate, source, language, metadata } = params;
  const companyId = await resolveCompanyId(userId, explicitCompany);

  const storagePath = buildStoragePath(companyId, file.name);

  const uploadResult = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadResult.error) {
    throw new Error(`Failed to upload report: ${uploadResult.error.message}`);
  }

  const fileMetadata: JsonRecord = {
    originalName: file.name,
    fileSize: file.size,
    lastModified: file.lastModified,
    uploadedFrom: 'web',
    ...metadata,
  };

  const { data: fileRow, error: fileError } = await supabase
    .from('files')
    .insert({
      company_id: companyId,
      uploader_id: userId,
      filename: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      storage_path: storagePath,
      metadata: fileMetadata,
    })
    .select()
    .single();

  if (fileError || !fileRow) {
    throw new Error(`Failed to register file: ${fileError?.message ?? 'unknown error'}`);
  }

  const { data: documentRow, error: documentError } = await supabase
    .from('documents')
    .insert({
      company_id: companyId,
      file_id: fileRow.id,
      title: file.name,
      doc_date: toDateString(docDate),
      source: source ?? 'uploaded-report',
      language: language ?? null,
      meta: {
        originalFilename: file.name,
        uploaderId: userId,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    })
    .select()
    .single();

  if (documentError || !documentRow) {
    throw new Error(`Failed to create document: ${documentError?.message ?? 'unknown error'}`);
  }

  return {
    file: fileRow as IngestedFile,
    document: documentRow as ExtractedDocument,
    storagePath,
  };
}

export async function listDocuments(options: DocumentListOptions = {}): Promise<DocumentWithRelations[]> {
  const { limit = 25, states, companyId } = options;

  let query = supabase
    .from('documents')
    .select(`
      *,
      file:files(*),
      events(*),
      originating_tasks:tasks!tasks_origin_document_id_fkey(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (states?.length) {
    query = query.in('processing_state', states);
  }

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load documents: ${error.message}`);
  }

  const items = (data ?? []) as (DocumentWithRelations & {
    events: DocumentEvent[] | null;
    file: IngestedFile | null;
    originating_tasks: TaskRecord[] | null;
  })[];

  return items.map((item) => ({
    ...item,
    events: item.events ?? [],
    file: item.file ?? null,
    originating_tasks: item.originating_tasks ?? [],
  }));
}

export async function markDocumentProcessing(documentId: string) {
  const { error } = await supabase
    .from('documents')
    .update({
      processing_state: 'processing',
      processing_error: null,
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to mark document as processing: ${error.message}`);
  }
}

export interface CompleteDocumentParams {
  text_extracted?: string | null;
  meta?: JsonRecord;
  language?: string | null;
  doc_date?: NullableDate;
}

export async function markDocumentReady(documentId: string, params: CompleteDocumentParams = {}) {
  const updates = {
    processing_state: 'ready' as DocumentProcessingState,
    processing_error: null,
    text_extracted: params.text_extracted ?? null,
    language: params.language ?? null,
    doc_date: toDateString(params.doc_date) ?? undefined,
    meta: params.meta ? params.meta : undefined,
  };

  const { error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to complete document processing: ${error.message}`);
  }
}

export async function markDocumentFailed(documentId: string, errorMessage: string) {
  const { error } = await supabase
    .from('documents')
    .update({
      processing_state: 'error',
      processing_error: errorMessage,
    })
    .eq('id', documentId);

  if (error) {
    throw new Error(`Failed to record processing error: ${error.message}`);
  }
}

export async function persistExtractedEvents(
  documentId: string,
  events: ParsedEventInput[],
  companyId?: string,
) {
  if (!events.length) {
    return [] as DocumentEvent[];
  }

  if (!companyId) {
    throw new Error('companyId is required when persisting events');
  }

  const mapped = events.map((event) => ({
    document_id: documentId,
    company_id: companyId,
    event_type: event.event_type,
    severity: event.severity ?? 'medium',
    occurred_at: toDateString(event.occurred_at),
    summary: event.summary,
    details: event.details ?? {},
    tags: event.tags ?? [],
  }));

  const { data, error } = await supabase
    .from('events')
    .insert(mapped)
    .select();

  if (error) {
    throw new Error(`Failed to persist events: ${error.message}`);
  }

  return (data ?? []) as DocumentEvent[];
}

export function getReportsBucket() {
  return REPORTS_BUCKET;
}
