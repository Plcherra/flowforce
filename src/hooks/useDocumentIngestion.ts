import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  type CompleteDocumentParams,
  type DocumentListOptions,
  type ParsedEventInput,
  type UploadReportOptions,
  listDocuments,
  markDocumentFailed,
  markDocumentProcessing,
  markDocumentReady,
  persistExtractedEvents,
  uploadReportFile,
} from '@/services/ingestion/api';
import type { DocumentEvent, DocumentWithRelations } from '@/types/ingestion';

const DOCUMENTS_QUERY_KEY = ['documents', 'inbox'] as const;

type UploadVariables = {
  file: File;
  options?: UploadReportOptions;
};

type CompleteVariables = {
  documentId: string;
  payload?: CompleteDocumentParams;
};

type FailVariables = {
  documentId: string;
  message: string;
};

type PersistEventsVariables = {
  documentId: string;
  events: ParsedEventInput[];
  companyId: string;
};

export function useDocumentInbox(options: DocumentListOptions = {}) {
  const { user } = useAuth();

  const key = useMemo(() => [
    ...DOCUMENTS_QUERY_KEY,
    options.limit ?? null,
    options.states?.join(',') ?? 'all',
    options.companyId ?? null,
  ], [options.limit, options.states, options.companyId]);

  return useQuery<DocumentWithRelations[]>({
    queryKey: key,
    queryFn: () => listDocuments(options),
    enabled: Boolean(user),
  });
}

export function useUploadDocument() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, options }: UploadVariables) => {
      if (!user) throw new Error('You must be signed in to upload documents');
      return uploadReportFile(file, {
        userId: user.id,
        ...options,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
      toast({ title: 'Upload complete', description: 'Report is queued for parsing.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDocumentProcessingActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const start = useMutation({
    mutationFn: (documentId: string) => markDocumentProcessing(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const complete = useMutation({
    mutationFn: ({ documentId, payload }: CompleteVariables) => markDocumentReady(documentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
      toast({ title: 'Document ready', description: 'Extraction data saved.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to finalize document',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const fail = useMutation({
    mutationFn: ({ documentId, message }: FailVariables) => markDocumentFailed(documentId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to record error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return { start, complete, fail };
}

export function usePersistDocumentEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ events: DocumentEvent[] }, Error, PersistEventsVariables>({
    mutationFn: async ({ documentId, events, companyId }) => {
      if (!companyId) {
        throw new Error('companyId is required to save events');
      }
      const persisted = await persistExtractedEvents(documentId, events, companyId);
      return { events: persisted };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        title: 'Failed to save events',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export const documentQueryKey = DOCUMENTS_QUERY_KEY;
