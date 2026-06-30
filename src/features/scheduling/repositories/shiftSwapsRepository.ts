import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const profileSchema = z
  .object({
    id: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    avatar_url: z.string().nullable(),
    company_id: z.string().nullable(),
  })
  .passthrough();

const scheduleSchema = z
  .object({
    id: z.string(),
    company_id: z.string().nullable(),
    title: z.string().nullable(),
    role: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
  })
  .passthrough();

const shiftSwapSchema = z
  .object({
    id: z.string(),
    schedule_id: z.string().nullable(),
    requestinguser_id: z.string().nullable(),
    targetuser_id: z.string().nullable(),
    swap_type: z.string(),
    status: z.string().nullable(),
    reason: z.string().nullable(),
    approved_by: z.string().nullable(),
    approved_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    requestinguser: profileSchema.nullable().optional(),
    targetuser: profileSchema.nullable().optional(),
    schedule: scheduleSchema.nullable().optional(),
  })
  .passthrough();

const timeOffRequestSchema = z
  .object({
    id: z.string(),
    user_id: z.string().nullable(),
    start_date: z.string(),
    end_date: z.string(),
    type: z.string(),
    status: z.string().nullable(),
    reason: z.string().nullable(),
    approved_by: z.string().nullable(),
    approved_at: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
    user: profileSchema.nullable().optional(),
  })
  .passthrough();

export type ShiftSwapRecord = z.infer<typeof shiftSwapSchema>;
export type TimeOffRequestRecord = z.infer<typeof timeOffRequestSchema>;

export async function fetchShiftSwaps(params: {
  companyId: string;
  limit?: number;
  offset?: number;
}): Promise<ShiftSwapRecord[]> {
  const { companyId, limit = 50, offset = 0 } = params;
  let query = supabase
    .from("shift_swaps")
    .select(
      `
        *,
        requestinguser:profiles!shift_swaps_requestinguser_id_fkey(id, first_name, last_name, avatar_url, company_id),
        targetuser:profiles!shift_swaps_targetuser_id_fkey(id, first_name, last_name, avatar_url, company_id),
        schedule:schedules(id, company_id, title, start_time, end_time, role)
      `,
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  query = query.eq("schedule.company_id", companyId);

  const { data, error } = await query;
  if (error) throw error;
  return z.array(shiftSwapSchema).parse(data ?? []);
}

export async function fetchTimeOffRequests(params: {
  companyId: string;
  limit?: number;
  offset?: number;
}): Promise<TimeOffRequestRecord[]> {
  const { companyId, limit = 50, offset = 0 } = params;
  const { data, error } = await supabase
    .from("time_off_requests")
    .select(
      `
        *,
        user:profiles(id, first_name, last_name, avatar_url, company_id)
      `,
    )
    .eq("user.company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return z.array(timeOffRequestSchema).parse(data ?? []);
}

export async function updateShiftSwapStatus(params: {
  swapId: string;
  status: "approved" | "rejected";
  actorId?: string | null;
}): Promise<void> {
  const { swapId, status, actorId } = params;
  const { error } = await supabase
    .from("shift_swaps")
    .update({
      status,
      approved_at: new Date().toISOString(),
      approved_by: actorId ?? null,
    })
    .eq("id", swapId);
  if (error) throw error;
}

export async function updateTimeOffStatus(params: {
  requestId: string;
  action: "approve" | "reject";
  actorId?: string | null;
}): Promise<void> {
  const { requestId, action, actorId } = params;
  const isApprove = action === "approve";
  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status: isApprove ? "approved" : "denied",
      approved_at: isApprove ? new Date().toISOString() : null,
      approved_by: isApprove ? (actorId ?? null) : null,
    })
    .eq("id", requestId);
  if (error) throw error;
}
