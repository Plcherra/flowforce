import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createTicket, updateTicket, deleteTicket } from '@/repositories/ticketsRepository';
import type { CreateTicketInput, UpdateTicketInput } from '@/repositories/ticketsRepository';
import { logger } from '@/utils/logger';

export type HelpDeskTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type HelpDeskTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface TicketRow {
  id: string;
  subject: string | null;
  description?: string | null;
  status?: HelpDeskTicketStatus | null;
  priority?: HelpDeskTicketPriority | null;
  requester_id?: string | null;
  assigned_to?: string | null;
  company_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  category?: string | null;
}

export interface HelpDeskTicket {
  id: string;
  subject: string;
  description: string | null;
  status: HelpDeskTicketStatus;
  priority: HelpDeskTicketPriority;
  requesterId: string | null;
  assignedTo: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface UseTicketsOptions {
  companyId?: string | null;
  statusFilter?: HelpDeskTicketStatus | HelpDeskTicketStatus[];
  enabled?: boolean;
}

export interface UseTicketsResult {
  tickets: HelpDeskTicket[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  usingFallback: boolean;
  createTicket: (input: CreateTicketInput) => Promise<HelpDeskTicket>;
  updateTicket: (ticketId: string, updates: UpdateTicketInput) => Promise<HelpDeskTicket>;
  deleteTicket: (ticketId: string) => Promise<void>;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
}

const DEFAULT_TICKET_STATUS: HelpDeskTicketStatus = 'open';
const DEFAULT_TICKET_PRIORITY: HelpDeskTicketPriority = 'medium';

const mapRowToTicket = (row: TicketRow): HelpDeskTicket => ({
  id: row.id,
  subject: row.subject ?? 'Untitled request',
  description: row.description ?? null,
  status: (row.status as HelpDeskTicketStatus) ?? DEFAULT_TICKET_STATUS,
  priority: (row.priority as HelpDeskTicketPriority) ?? DEFAULT_TICKET_PRIORITY,
  requesterId: row.requester_id ?? null,
  assignedTo: row.assigned_to ?? null,
  category: row.category ?? null,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? null,
});

export function useTickets(options: UseTicketsOptions = {}): UseTicketsResult {
  const { companyId: companyIdOverride = null, statusFilter, enabled = true } = options;
  const { user } = useAuth();
  const [tickets, setTickets] = useState<HelpDeskTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const metadataCompanyId =
    typeof user?.user_metadata?.company_id === 'string' ? (user.user_metadata.company_id as string) : null;
  const effectiveCompanyId = companyIdOverride ?? metadataCompanyId;

  const fetchTickets = useCallback(async () => {
    if (!enabled) {
      setTickets([]);
      setError(null);
      setUsingFallback(false);
      return;
    }

    if (!user?.id) {
      setTickets([]);
      setError('You need to be signed in to load help desk tickets.');
      setUsingFallback(true);
      return;
    }

    if (!effectiveCompanyId) {
      setTickets([]);
      setError('No company context found for help desk tickets.');
      setUsingFallback(true);
      return;
    }

    setLoading(true);
    setUsingFallback(false);
    setError(null);

    try {
      let query = supabase.from('helpdesk_tickets').select('*').eq('company_id', effectiveCompanyId);
      if (statusFilter) {
        if (Array.isArray(statusFilter)) {
          query = query.in('status', statusFilter);
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const mapped = Array.isArray(data) ? data.map((row) => mapRowToTicket(row as TicketRow)) : [];
      setTickets(mapped);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error ? unknownError.message : 'Unable to load help desk tickets.';
      logger.error('[useTickets] Failed to load tickets', { error: unknownError, tags: ['error'] });
      setTickets([]);
      setError(message);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  }, [enabled, effectiveCompanyId, statusFilter, user?.id]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const refresh = async () => {
    await fetchTickets();
  };

  const createTicketMutation = useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      return createTicket(input);
    },
    onSuccess: () => {
      void refresh();
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ ticketId, updates }: { ticketId: string; updates: UpdateTicketInput }) => {
      if (!effectiveCompanyId) {
        throw new Error('Company context required to update tickets');
      }
      return updateTicket(ticketId, effectiveCompanyId, updates);
    },
    onSuccess: () => {
      void refresh();
    },
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      if (!effectiveCompanyId) {
        throw new Error('Company context required to delete tickets');
      }
      return deleteTicket(ticketId, effectiveCompanyId);
    },
    onSuccess: () => {
      void refresh();
    },
  });

  return {
    tickets,
    loading,
    error,
    refresh,
    usingFallback,
    createTicket: createTicketMutation.mutateAsync,
    updateTicket: (ticketId: string, updates: UpdateTicketInput) =>
      updateTicketMutation.mutateAsync({ ticketId, updates }),
    deleteTicket: deleteTicketMutation.mutateAsync,
    creating: createTicketMutation.isPending,
    updating: updateTicketMutation.isPending,
    deleting: deleteTicketMutation.isPending,
  };
}
