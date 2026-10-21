export interface HandoverTaskDraft {
  title: string;
  description: string;
  status: "todo";
  source: "form";
  priority: "medium";
  due_date: string;
  assigned_to: string;
  links: { form_id: string };
}

function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function handoverTaskDraft(input: {
  note: string;
  formId: string;
  userId: string;
  today?: Date;
}): HandoverTaskDraft | null {
  const note = input.note.trim();
  const formId = input.formId.trim();
  const userId = input.userId.trim();
  if (!note || !formId || !userId) return null;

  const firstLine = note.split(/\r?\n/)[0]?.trim() ?? "";
  if (!firstLine) return null;

  const today = input.today ?? new Date();
  const nextDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );

  return {
    title: firstLine.slice(0, 80),
    description: note,
    status: "todo",
    source: "form",
    priority: "medium",
    due_date: localDate(nextDay),
    assigned_to: userId,
    links: { form_id: formId },
  };
}
