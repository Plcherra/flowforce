import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InboxDraft } from "@/features/tasks/utils/draftInbox";

interface DraftInboxListProps {
  drafts: readonly InboxDraft[];
  drafting: boolean;
  onDraft: () => void;
  onChange: (id: string, title: string, description: string) => void;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function DraftInboxList({
  drafts,
  drafting,
  onDraft,
  onChange,
  onAccept,
  onDismiss,
}: DraftInboxListProps) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3" data-testid="draft-inbox">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("tasks.drafts")}</h2>
        <p className="text-sm text-muted-foreground">{t("tasks.draftsHelp")}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={drafting}
        data-testid="draft-from-notes"
        onClick={onDraft}
      >
        {t("tasks.draftFromNotes")}
      </Button>
      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("tasks.noDrafts")}</p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="space-y-2 rounded-xl border border-border/70 bg-background p-3"
            >
              <Input
                className="min-h-11"
                value={draft.title}
                aria-label={t("tasks.taskTitle")}
                onChange={(event) => onChange(draft.id, event.target.value, draft.description)}
              />
              <Textarea
                rows={3}
                value={draft.description}
                aria-label={t("tasks.description")}
                onChange={(event) => onChange(draft.id, draft.title, event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  className="min-h-11"
                  data-testid={`draft-accept-${draft.id}`}
                  onClick={() => onAccept(draft.id)}
                >
                  {t("tasks.acceptDraft")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  data-testid={`draft-dismiss-${draft.id}`}
                  onClick={() => onDismiss(draft.id)}
                >
                  {t("tasks.dismissDraft")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
