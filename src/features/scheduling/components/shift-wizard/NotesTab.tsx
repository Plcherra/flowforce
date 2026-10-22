import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

type NotesTabProps = {
  notes: string;
  onNotesChange: (val: string) => void;
};

export function NotesTab({ notes, onNotesChange }: NotesTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="notes">{t("schedule.notes")}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={t("schedule.additionalNotesOrInstructionsForThisShift")}
          rows={4}
        />
      </div>

      <div>
        <Label>{t("schedule.attachments")}</Label>
        <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4">
          <div className="text-center">
            <Paperclip className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t("schedule.dragAndDropFilesHereOrClickTo")}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-2">
              {t("schedule.chooseFiles")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
