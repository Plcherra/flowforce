import { supabase } from "@/integrations/supabase/client";
import {
  reanchorClockToDay,
  singleShiftByEvent,
} from "@/features/scheduling/services/followShiftDay";

/**
 * Move calendar events and vendor visits that belong to exactly one shift
 * onto that shift's new day. The clock time stays the same.
 */
export async function moveEventsWithShift(
  shiftId: string,
  targetDay: Date,
): Promise<number> {
  const { data: directLinks, error: directError } = await supabase
    .from("event_shift_links")
    .select("event_id, shift_id")
    .eq("shift_id", shiftId);
  if (directError) throw directError;

  const eventIds = [
    ...new Set(
      (directLinks ?? [])
        .map((link) => link.event_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (eventIds.length === 0) return 0;

  const { data: allLinks, error: linksError } = await supabase
    .from("event_shift_links")
    .select("event_id, shift_id")
    .in("event_id", eventIds);
  if (linksError) throw linksError;

  const singles = singleShiftByEvent(allLinks ?? []);
  const followers = eventIds.filter((id) => singles.get(id) === shiftId);
  if (followers.length === 0) return 0;

  const { data: events, error: eventsError } = await supabase
    .from("calendar_events")
    .select("id, start_time, end_time")
    .in("id", followers);
  if (eventsError) throw eventsError;

  let moved = 0;
  for (const event of events ?? []) {
    const next = reanchorClockToDay(
      event.start_time,
      event.end_time,
      targetDay,
    );
    if (!next) continue;

    const { error: eventError } = await supabase
      .from("calendar_events")
      .update({ start_time: next.start, end_time: next.end })
      .eq("id", event.id);
    if (eventError) throw eventError;

    const { error: visitError } = await supabase
      .from("vendor_visits")
      .update({ start_time: next.start, end_time: next.end })
      .eq("linked_event_id", event.id);
    if (visitError) throw visitError;
    moved += 1;
  }

  return moved;
}
