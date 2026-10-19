import { useCallback, useEffect, useState } from "react";

export interface PersonalScheduleReminder {
  id: string;
  title: string;
  message: string;
  day: string;
  time: string;
  enabled: boolean;
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
    return parsed.filter(
      (item) => item && typeof item.id === "string" && typeof item.title === "string",
    );
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
