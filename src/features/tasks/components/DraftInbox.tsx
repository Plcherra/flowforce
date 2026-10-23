import { useTranslation } from "react-i18next";
import React, { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useTasks } from "@/hooks/useTasks";
import { readChecklistAddress } from "@/features/forms/utils/checklistForms";
import { readAdditionalInformation, checklistAreaFromShift, isWorkShift } from "@/features/tasks/utils/myShiftView";
import {
  acceptDraftUpdate,
  dismissDraftUpdate,
  draftTaskInsert,
  editDraft,
  readInboxDraft,
  type InboxDraft,
} from "@/features/tasks/utils/draftInbox";
import type { ClosingNoteDraft } from "@/features/tasks/utils/closingNoteDrafts";
import { DraftInboxList } from "./DraftInboxList";

type TaskRow = {
  id: string;
  title?: string | null;
  description?: string | null;
  links?: unknown;
};

export function DraftInbox({ tasks }: { tasks: readonly TaskRow[] }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const companyId = profile?.company_id ?? profile?.companyId ?? null;
  const { createTask, updateTask } = useTasks();
  const [edits, setEdits] = useState<Record<string, { title: string; description: string }>>({});
  const [drafting, setDrafting] = useState(false);

  const drafts = useMemo(
    () =>
      tasks.flatMap((task) => {
        const draft = readInboxDraft(task);
        if (!draft) return [];
        const edit = edits[draft.id];
        return [edit ? { ...draft, ...edit } : draft];
      }),
    [edits, tasks],
  );

  const apply = async (draft: InboxDraft, action: "accept" | "dismiss") => {
    const edited = editDraft(draft, draft.title, draft.description) ?? draft;
    const updates = action === "accept" ? acceptDraftUpdate(edited) : dismissDraftUpdate(edited);
    const result = await updateTask(draft.id, updates);
    const error = result.error;
    toast({
      title: error
        ? t("tasks.unableToDraft")
        : action === "accept"
          ? t("tasks.draftAccepted")
          : t("tasks.draftDismissed"),
      variant: error ? "destructive" : "default",
    });
  };

  const draftFromNotes = async () => {
    if (!companyId || !user?.id) return;
    setDrafting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error(t("tasks.unableToDraft"));
      const { data: forms } = await supabase
        .from("forms")
        .select("id, settings")
        .eq("company_id", companyId);
      const closing = (forms ?? []).flatMap((form) => {
        const address = readChecklistAddress(form.settings);
        return address?.slot === "closing" ? [{ id: form.id, area: address.area }] : [];
      });
      if (closing.length === 0) {
        toast({ title: t("tasks.noDrafts") });
        return;
      }
      const { data: submissions } = await supabase
        .from("form_submissions")
        .select("form_id, submission_data, submitted_at")
        .in("form_id", closing.map((form) => form.id))
        .order("submitted_at", { ascending: false })
        .limit(50);
      const { data: schedules } = await supabase
        .from("schedules")
        .select("role, title, start_time, user_id, is_published, is_template")
        .eq("company_id", companyId)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(40);

      let created = 0;
      for (const form of closing) {
        const note = readAdditionalInformation(
          (submissions ?? []).find((row) => row.form_id === form.id)?.submission_data,
        );
        if (!note) continue;
        const personId =
          (schedules ?? []).find(
            (row) =>
              isWorkShift(row) &&
              checklistAreaFromShift(row) === form.area &&
              typeof row.user_id === "string" &&
              row.user_id,
          )?.user_id ?? null;
        const response = await fetch("/api/tasks/closing-note-drafts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notes: [note], area: form.area, personId }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          drafts?: ClosingNoteDraft[];
          message?: string;
        };
        if (!response.ok) throw new Error(payload.message || t("tasks.unableToDraft"));
        for (const draft of payload.drafts ?? []) {
          const { error } = await createTask(draftTaskInsert(draft, user.id));
          if (!error) created += 1;
        }
      }
      toast({ title: created > 0 ? t("tasks.draftsReady") : t("tasks.noDrafts") });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : t("tasks.unableToDraft"),
        variant: "destructive",
      });
    } finally {
      setDrafting(false);
    }
  };

  return (
    <DraftInboxList
      drafts={drafts}
      drafting={drafting}
      onDraft={() => {
        void draftFromNotes();
      }}
      onChange={(id, title, description) =>
        setEdits((current) => ({ ...current, [id]: { title, description } }))
      }
      onAccept={(id) => {
        const draft = drafts.find((item) => item.id === id);
        if (draft) void apply(draft, "accept");
      }}
      onDismiss={(id) => {
        const draft = drafts.find((item) => item.id === id);
        if (draft) void apply(draft, "dismiss");
      }}
    />
  );
}
