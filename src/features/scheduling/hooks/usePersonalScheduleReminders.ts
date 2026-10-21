import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  isLinkedRecordKind,
  isRecordId,
  linkedRecordHref,
  readLinkedRecord,
  type LinkedRecordKind,
} from "@/features/scheduling/utils/linkedScheduleReminder";

export interface PersonalScheduleReminder {
  id: string;
  title: string;
  message: string;
  day: string;
  time: string;
  enabled: boolean;
  recordKind?: LinkedRecordKind;
  recordId?: string;
}

export interface OpenableLinkedReminder {
  id: string;
  title: string;
  kind: LinkedRecordKind;
  recordId: string;
  recordTitle: string;
  href: string;
}

const STORAGE_PREFIX = "flowforce.schedule.personalReminders:";

const DEFAULT_REMINDERS: PersonalScheduleReminder[] = [
  {
    id: "check-my-shifts",
    title: "Check my shifts",
    message: "Look at this week's shifts before the week starts.",
    day: "sunday",
    time: "18:00",
    enabled: true,
  },
];

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

function readStored(userId: string | null): PersonalScheduleReminder[] {
  if (!userId || typeof window === "undefined") return DEFAULT_REMINDERS;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_REMINDERS;
    const parsed = JSON.parse(raw) as PersonalScheduleReminder[];
    if (!Array.isArray(parsed)) return DEFAULT_REMINDERS;
    return parsed.flatMap((item) => {
      if (!item || typeof item.id !== "string" || typeof item.title !== "string") {
        return [];
      }
      const reminder: PersonalScheduleReminder = {
        id: item.id,
        title: item.title,
        message: typeof item.message === "string" ? item.message : "",
        day: typeof item.day === "string" ? item.day : "sunday",
        time: typeof item.time === "string" ? item.time : "18:00",
        enabled: item.enabled !== false,
      };
      const recordId = item.recordId;
      if (
        isLinkedRecordKind(item.recordKind) &&
        typeof recordId === "string" &&
        isRecordId(recordId)
      ) {
        reminder.recordKind = item.recordKind;
        reminder.recordId = recordId;
      }
      return [reminder];
    });
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export function usePersonalScheduleReminders(userId: string | null) {
  const [reminders, setReminders] = useState<PersonalScheduleReminder[]>(() =>
    readStored(userId),
  );

  useEffect(() => {
    setReminders(readStored(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(userId), JSON.stringify(reminders));
  }, [reminders, userId]);

  const addReminder = useCallback(
    (input: Omit<PersonalScheduleReminder, "id" | "enabled">) => {
      setReminders((current) => [
        {
          ...input,
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `reminder-${Date.now()}`,
          enabled: true,
        },
        ...current,
      ]);
    },
    [],
  );

  const toggleReminder = useCallback((id: string, enabled: boolean) => {
    setReminders((current) =>
      current.map((item) => (item.id === id ? { ...item, enabled } : item)),
    );
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders((current) => current.filter((item) => item.id !== id));
  }, []);

  return { reminders, addReminder, toggleReminder, removeReminder };
}

async function titlesById(
  table: "tasks" | "forms" | "schedules",
  ids: string[],
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (ids.length === 0) return titles;
  const { data, error } = await supabase
    .from(table)
    .select("id, title")
    .in("id", ids);
  if (error) throw error;
  for (const row of data ?? []) {
    if (!row.id) continue;
    titles.set(row.id, row.title?.trim() || "Untitled");
  }
  return titles;
}

export async function loadOpenableLinkedReminders(
  userId: string,
  personalReminders: PersonalScheduleReminder[],
): Promise<OpenableLinkedReminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id, title, type, task_id, completed")
    .eq("user_id", userId)
    .limit(100);
  if (error) throw error;

  const candidates: Array<{
    id: string;
    title: string;
    kind: LinkedRecordKind;
    recordId: string;
  }> = [];

  for (const row of data ?? []) {
    if (row.completed === true) continue;
    const record = readLinkedRecord(row);
    if (!record) continue;
    candidates.push({
      id: row.id,
      title: row.title?.trim() || "Reminder",
      kind: record.kind,
      recordId: record.id,
    });
  }

  for (const reminder of personalReminders) {
    if (!reminder.enabled || !reminder.recordKind || !reminder.recordId) continue;
    if (!isRecordId(reminder.recordId)) continue;
    candidates.push({
      id: `personal:${reminder.id}`,
      title: reminder.title,
      kind: reminder.recordKind,
      recordId: reminder.recordId,
    });
  }

  const taskIds = uniqueIds(candidates, "task");
  const formIds = uniqueIds(candidates, "form");
  const shiftIds = uniqueIds(candidates, "shift");
  const [tasks, forms, shifts] = await Promise.all([
    titlesById("tasks", taskIds),
    titlesById("forms", formIds),
    titlesById("schedules", shiftIds),
  ]);
  const readable = { task: tasks, form: forms, shift: shifts };

  return candidates.flatMap((candidate) => {
    const recordTitle = readable[candidate.kind].get(candidate.recordId);
    if (!recordTitle) return [];
    return [
      {
        ...candidate,
        recordTitle,
        href: linkedRecordHref(candidate.kind, candidate.recordId),
      },
    ];
  });
}

function uniqueIds(
  candidates: Array<{ kind: LinkedRecordKind; recordId: string }>,
  kind: LinkedRecordKind,
): string[] {
  return Array.from(
    new Set(
      candidates
        .filter((candidate) => candidate.kind === kind)
        .map((candidate) => candidate.recordId),
    ),
  );
}

export function useLinkedRecordReminders(
  userId: string | null,
  personalReminders: PersonalScheduleReminder[],
) {
  const personalKey = personalReminders
    .filter((reminder) => reminder.enabled && reminder.recordKind && reminder.recordId)
    .map((reminder) => `${reminder.recordKind}:${reminder.recordId}`)
    .join("|");

  return useQuery({
    queryKey: ["linked-schedule-reminders", userId, personalKey],
    enabled: Boolean(userId),
    queryFn: () => loadOpenableLinkedReminders(userId!, personalReminders),
  });
}
