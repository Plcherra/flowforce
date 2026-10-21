export type TaskCreateLevel = "others" | "self" | "none";

export function taskCreateLevel(input: {
  createOthers: boolean;
  createSelf: boolean;
  legacyEdit?: boolean;
}): TaskCreateLevel {
  if (input.createOthers) return "others";
  if (input.createSelf) return "self";
  if (input.legacyEdit) return "others";
  return "none";
}
