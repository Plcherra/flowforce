import { supabase } from '@/integrations/supabase/client';
import type { HelpDeskTicket, HelpDeskTicketStatus, HelpDeskTicketPriority } from '@/hooks/useTickets';

export interface CreateTicketInput {
  subject: string;
  description?: string | null;
  priority?: HelpDeskTicketPriority;
  category?: string | null;
  department_id?: string | null;
  company_id: string;
  requester_id: string;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string | null;
  status?: HelpDeskTicketStatus;
  priority?: HelpDeskTicketPriority;
  assigned_to?: string | null;
  category?: string | null;
}

const DEFAULT_STATUS: HelpDeskTicketStatus = 'open';
const DEFAULT_PRIORITY: HelpDeskTicketPriority = 'medium';

export async function createTicket(input: CreateTicketInput): Promise<HelpDeskTicket> {
  if (!input.company_id) {
    throw new Error('company_id is required when creating a ticket');
  }

  if (!input.requester_id) {
    throw new Error('requester_id is required when creating a ticket');
  }

  const payload = {
    subject: input.subject,
    description: input.description ?? null,
    status: DEFAULT_STATUS,
    priority: input.priority ?? DEFAULT_PRIORITY,
    category: input.category ?? null,
    requester_id: input.requester_id,
    assigned_to: null,
    company_id: input.company_id,
  };

  const { data, error } = await supabase
    .from('helpdesk_tickets')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    subject: data.subject ?? 'Untitled request',
    description: data.description ?? null,
    status: (data.status as HelpDeskTicketStatus) ?? DEFAULT_STATUS,
    priority: (data.priority as HelpDeskTicketPriority) ?? DEFAULT_PRIORITY,
    requesterId: data.requester_id ?? null,
    assignedTo: data.assigned_to ?? null,
    category: data.category ?? null,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? null,
  };
}

export async function updateTicket(
  ticketId: string,
  companyId: string,
  updates: UpdateTicketInput,
): Promise<HelpDeskTicket> {
  const { data, error } = await supabase
    .from('helpdesk_tickets')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    subject: data.subject ?? 'Untitled request',
    description: data.description ?? null,
    status: (data.status as HelpDeskTicketStatus) ?? DEFAULT_STATUS,
    priority: (data.priority as HelpDeskTicketPriority) ?? DEFAULT_PRIORITY,
    requesterId: data.requester_id ?? null,
    assignedTo: data.assigned_to ?? null,
    category: data.category ?? null,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? null,
  };
}

export async function deleteTicket(ticketId: string, companyId: string): Promise<void> {
  const { error } = await supabase
    .from('helpdesk_tickets')
    .delete()
    .eq('id', ticketId)
    .eq('company_id', companyId);

  if (error) {
    throw error;
  }
}
