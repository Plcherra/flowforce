import { supabaseAdmin as admin } from "./supabaseAdmin"; // pragma: allowlist secret
import { createServerLogger } from "./utils/logger";
import {
  canAddOpsInviteShift,
  opsInviteShiftRow,
  readOpsFirstShift,
} from "@/features/employees/utils/opsInviteFlow";

const logger = createServerLogger("ops-invite-shift");

export type OpsInviteShiftStatus = "saved" | "forbidden" | "skipped" | "failed";

async function locationName(companyId: string, locationId: string | null) {
  if (!locationId) return null;
  const { data, error } = await admin
    .from("stores")
    .select("name")
    .eq("company_id", companyId)
    .eq("id", locationId)
    .maybeSingle();
  if (error) return null;
  const name = data?.name?.trim();
  return name || null;
}

export async function saveOpsInviteShift(input: {
  companyId: string;
  actorId: string;
  inviteId: string;
  email: string | null;
  title: string;
  roleName: string;
  locationId: string | null;
  userId: string | null;
  firstShift: unknown;
  inviter: { permissions: Record<string, boolean> };
}): Promise<OpsInviteShiftStatus> {
  const shift = readOpsFirstShift(input.firstShift);
  if (!shift) return "skipped";
  if (!canAddOpsInviteShift(input.inviter.permissions)) return "forbidden";

  const location = await locationName(input.companyId, input.locationId);
  const row = opsInviteShiftRow({
    companyId: input.companyId,
    actorId: input.actorId,
    inviteId: input.inviteId,
    email: input.email,
    title: input.title,
    roleName: input.roleName,
    location,
    userId: input.userId,
    shift,
  });

  const { data, error } = await admin
    .from("schedules")
    .insert(row)
    .select("id")
    .single();

  if (error || !data?.id) {
    logger.warn("Unable to store the ops invite shift", {
      error,
      context: { companyId: input.companyId, inviteId: input.inviteId },
    });
    return "failed";
  }

  if (input.userId) {
    await attachOpsInviteShift({
      companyId: input.companyId,
      inviteId: input.inviteId,
      userId: input.userId,
      actorId: input.actorId,
    });
  }

  return "saved";
}

export async function attachOpsInviteShift(input: {
  companyId: string;
  inviteId: string;
  userId: string;
  actorId: string;
}) {
  const { data, error } = await admin
    .from("schedules")
    .select("id, user_id")
    .eq("company_id", input.companyId)
    .filter("requirements->opsInvite->>inviteId", "eq", input.inviteId);

  if (error || !data?.length) {
    if (error) {
      logger.warn("Unable to find the ops invite shift", {
        error,
        context: { companyId: input.companyId, inviteId: input.inviteId },
      });
    }
    return;
  }

  for (const row of data) {
    if (!row.id) continue;
    if (row.user_id !== input.userId) {
      const { error: updateError } = await admin
        .from("schedules")
        .update({ user_id: input.userId })
        .eq("id", row.id)
        .eq("company_id", input.companyId);
      if (updateError) {
        logger.warn("Unable to attach the ops invite shift", {
          error: updateError,
          context: { scheduleId: row.id },
        });
        continue;
      }
    }

    const { data: existing, error: existingError } = await admin
      .from("schedule_assignments")
      .select("id")
      .eq("schedule_id", row.id)
      .eq("user_id", input.userId)
      .limit(1);
    if (existingError || (existing ?? []).length > 0) continue;

    const { error: insertError } = await admin
      .from("schedule_assignments")
      .insert({
        company_id: input.companyId,
        schedule_id: row.id,
        user_id: input.userId,
        assigned_by: input.actorId,
        status: "assigned",
        assigned_at: new Date().toISOString(),
      });
    if (insertError) {
      logger.warn("Unable to assign the ops invite shift", {
        error: insertError,
        context: { scheduleId: row.id },
      });
    }
  }
}
