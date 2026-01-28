import {
  DEFAULT_SCHEDULE_RULEBOOK,
  scheduleRulebooks,
} from "@/data/scheduleRulebooks";
import type { RulebookId, ScheduleRulebook } from "@/types/scheduleRulebook";

export function listScheduleRulebooks(): ScheduleRulebook[] {
  return scheduleRulebooks;
}

export function getScheduleRulebook(rulebookId?: RulebookId): ScheduleRulebook {
  if (!rulebookId) {
    return DEFAULT_SCHEDULE_RULEBOOK;
  }

  const match = scheduleRulebooks.find((book) => book.id === rulebookId);
  return match ?? DEFAULT_SCHEDULE_RULEBOOK;
}
