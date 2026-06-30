import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type {
  HelpDeskTicket,
  HelpDeskTicketStatus,
  HelpDeskTicketPriority,
} from "@/hooks/useTickets";
import { logger } from "@/utils/logger";

// Phase 5: Zod schemas for input validation
const HelpDeskTicketStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "closed",
]);
const HelpDeskTicketPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
]);

const CreateTicketInputSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(500, "Subject must be less than 500 characters"),
  description: z
    .string()
    .max(5000, "Description must be less than 5000 characters")
    .nullable()
    .optional(),
  priority: HelpDeskTicketPrioritySchema.optional(),
  category: z.string().max(100).nullable().optional(),
  departmentid: z.string().uuid().nullable().optional(),
  company_id: z.string().uuid("Invalid company_id format"),
  requesterid: z.string().uuid("Invalid requesterid format"),
});

const UpdateTicketInputSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: HelpDeskTicketStatusSchema.optional(),
  priority: HelpDeskTicketPrioritySchema.optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  category: z.string().max(100).nullable().optional(),
});

export interface CreateTicketInput {
  subject: string;
  description?: string | null;
  priority?: HelpDeskTicketPriority;
  category?: string | null;
  departmentid?: string | null;
  company_id: string;
  requesterid: string;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string | null;
  status?: HelpDeskTicketStatus;
  priority?: HelpDeskTicketPriority;
  assigned_to?: string | null;
  category?: string | null;
}

const DEFAULT_STATUS: HelpDeskTicketStatus = "open";
const DEFAULT_PRIORITY: HelpDeskTicketPriority = "medium";

export async function createTicket(
  input: CreateTicketInput,
): Promise<HelpDeskTicket> {
  // Phase 5: Validate input with Zod schema
  const validationResult = CreateTicketInputSchema.safeParse(input);
  if (!validationResult.success) {
    const errors = validationResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    logger.error("[ticketsRepository] Invalid ticket input", {
      errors: validationResult.error.errors,
      tags: ["validation", "error"],
    });
    throw new Error(`Invalid ticket input: ${errors}`);
  }

  const validatedInput = validationResult.data;
  const payload = {
    subject: validatedInput.subject,
    description: validatedInput.description ?? null,
    status: DEFAULT_STATUS,
    priority: validatedInput.priority ?? DEFAULT_PRIORITY,
    category: validatedInput.category ?? null,
    requesterid: validatedInput.requesterid,
    assigned_to: null,
    company_id: validatedInput.company_id,
  };

  const { data, error } = await supabase
    .from("helpdesk_tickets")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    subject: data.subject ?? "Untitled request",
    description: data.description ?? null,
    status: (data.status as HelpDeskTicketStatus) ?? DEFAULT_STATUS,
    priority: (data.priority as HelpDeskTicketPriority) ?? DEFAULT_PRIORITY,
    requesterId: data.requesterid ?? null,
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
  // Phase 5: Validate input with Zod schema
  const validationResult = UpdateTicketInputSchema.safeParse(updates);
  if (!validationResult.success) {
    const errors = validationResult.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ");
    logger.error("[ticketsRepository] Invalid ticket update input", {
      errors: validationResult.error.errors,
      tags: ["validation", "error"],
    });
    throw new Error(`Invalid ticket update input: ${errors}`);
  }

  // Validate ticketId and companyId format
  if (!z.string().uuid().safeParse(ticketId).success) {
    throw new Error("Invalid ticketId format");
  }
  if (!z.string().uuid().safeParse(companyId).success) {
    throw new Error("Invalid companyId format");
  }

  const { data, error } = await supabase
    .from("helpdesk_tickets")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .eq("company_id", companyId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    subject: data.subject ?? "Untitled request",
    description: data.description ?? null,
    status: (data.status as HelpDeskTicketStatus) ?? DEFAULT_STATUS,
    priority: (data.priority as HelpDeskTicketPriority) ?? DEFAULT_PRIORITY,
    requesterId: data.requesterid ?? null,
    assignedTo: data.assigned_to ?? null,
    category: data.category ?? null,
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? null,
  };
}

export async function deleteTicket(
  ticketId: string,
  companyId: string,
): Promise<void> {
  const { error } = await supabase
    .from("helpdesk_tickets")
    .delete()
    .eq("id", ticketId)
    .eq("company_id", companyId);

  if (error) {
    throw error;
  }
}
