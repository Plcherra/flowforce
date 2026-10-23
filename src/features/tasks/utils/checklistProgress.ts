export type ChecklistAnswer = {
  id: string;
  done: boolean;
};

export function checklistSubmissionData(input: {
  items: readonly ChecklistAnswer[];
  note?: string;
  includeNote: boolean;
}): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const item of input.items) {
    data[item.id] = item.done;
  }
  if (!input.includeNote) return data;
  const note = (input.note ?? "").trim();
  if (note.length > 0) data.additional_information = note;
  return data;
}
