import { supabaseAdmin } from "@/server/supabaseAdmin";
import {
  addWeeks,
  computeAutoLockThreshold,
  startOfIsoWeek,
} from "@/features/availability/utils/lockEngine";
import type { Database } from "@/integrations/supabase/public-types";
import { logger } from "@/utils/logger";

type OrgPrefRow = Database["public"]["Tables"]["org_prefs"]["Row"];

export interface LockCronResult {
  processedOrgIds: string[];
  lockedWeeks: string[];
}

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

export async function runAvailabilityLockCron(
  now: Date = new Date(),
): Promise<LockCronResult> {
  const processedOrgIds: string[] = [];
  const lockedWeeks: string[] = [];

  const { data: orgPrefs, error } = await supabaseAdmin
    .from("org_prefs")
    .select(
      "id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour",
    );

  if (error) {
    logger.error("[lockCron] Unable to fetch org prefs", {
      error,
      tags: ["error"],
    });
    throw error;
  }

  const upcomingWeekStart = toISODate(startOfIsoWeek(addWeeks(now, 1)));

  for (const pref of (orgPrefs as OrgPrefRow[] | null) ?? []) {
    processedOrgIds.push(pref.id);

    if (pref.availability_lock_mode !== "auto") {
      continue;
    }

    const threshold = computeAutoLockThreshold(upcomingWeekStart, pref);
    if (now < threshold) {
      continue;
    }

    const entityId = `${pref.id}:${upcomingWeekStart}`;
    const { data: existing } = await supabaseAdmin
      .from("audit_log")
      .select("id")
      .eq("entity", "availability_week")
      .eq("entity_id", entityId)
      .maybeSingle();

    if (!existing) {
      const insertResult = await supabaseAdmin.from("audit_log").insert({
        actor_id: pref.id,
        action: "availability.lock.auto",
        entity: "availability_week",
        entity_id: entityId,
        meta: { weekStart: upcomingWeekStart, mode: "auto" },
      });

      if (insertResult.error) {
        logger.error("[lockCron] Failed to insert audit log", {
          error: insertResult.error,
          tags: ["error"],
        });
        throw insertResult.error;
      }
    }

    lockedWeeks.push(entityId);
  }

  return { processedOrgIds, lockedWeeks };
}

export default runAvailabilityLockCron;
