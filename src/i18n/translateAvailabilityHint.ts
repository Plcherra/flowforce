export function translateAvailabilityHint(
  hint: string | null | undefined,
  t: (key: string, options?: Record<string, string>) => string,
): string | null {
  if (!hint) return null;
  if (hint === "Off" || hint === "schedule.off") return t("schedule.off");
  if (hint === "PTO" || hint === "schedule.pto") return t("schedule.pto");
  if (hint === "Unavailable" || hint === "schedule.unavailable") return t("schedule.unavailable");
  if (hint === "PTO pending" || hint === "schedule.ptoPending") return t("schedule.ptoPending");
  const until = /^Until (.+)$/.exec(hint);
  if (until) return t("schedule.untilTime", { time: until[1] ?? "" });
  return hint;
}
