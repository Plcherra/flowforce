import type { ChecklistArea } from "@/features/forms/utils/checklistForms";
import {
  buildGrokChatRequest,
  GROK_PROVIDER,
  parseModelJson,
} from "@/services/ai/grokProvider";

export type ClosingNoteDraft = {
  title: string;
  description: string;
  status: "draft";
  area: ChecklistArea;
  personId: string | null;
  accepted: false;
};

type Model = (input: {
  provider: typeof GROK_PROVIDER;
  body: Record<string, unknown>;
}) => Promise<string>;

export async function draftTasksFromClosingNotes(input: {
  notes: readonly string[];
  area: ChecklistArea;
  personId: string | null;
  model: Model;
}): Promise<ClosingNoteDraft[]> {
  const notes = input.notes.map((note) => note.trim()).filter((note) => note.length > 0);
  if (notes.length === 0) return [];

  const body = buildGrokChatRequest({
    model: "grok-4.3",
    temperature: 0,
    responseFormat: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Draft tasks from closing notes for the next shift. Reply with JSON {\"tasks\":[{\"title\":\"\",\"description\":\"\"}]}. Do not assign the work.",
      },
      {
        role: "user",
        content: notes.join("\n"),
      },
    ],
  });
  if ("search_parameters" in body) {
    throw new Error("Grok chat requests must omit search_parameters");
  }

  const text = await input.model({ provider: GROK_PROVIDER, body });
  const parsed = parseModelJson(text);
  const tasks = Array.isArray((parsed as { tasks?: unknown }).tasks)
    ? (parsed as { tasks: unknown[] }).tasks
    : [];

  return tasks.flatMap((task) => {
    if (!task || typeof task !== "object") return [];
    const record = task as Record<string, unknown>;
    if (typeof record.title !== "string" || !record.title.trim()) return [];
    const description =
      typeof record.description === "string" ? record.description.trim() : "";
    return [
      {
        title: record.title.trim(),
        description,
        status: "draft" as const,
        area: input.area,
        personId: input.personId,
        accepted: false as const,
      },
    ];
  });
}
