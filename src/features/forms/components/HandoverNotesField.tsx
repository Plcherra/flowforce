import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface HandoverNotesFieldProps {
  note: string;
  onNoteChange: (value: string) => void;
  makeTask: boolean;
  onMakeTaskChange: (value: boolean) => void;
  canMakeTask: boolean;
}

export function HandoverNotesField({
  note,
  onNoteChange,
  makeTask,
  onMakeTaskChange,
  canMakeTask,
}: HandoverNotesFieldProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3" data-testid="handover-notes">
      <div className="space-y-2">
        <Label htmlFor="additional-information">{t("forms.additionalInformation")}</Label>
        <Textarea
          id="additional-information"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={3}
          placeholder={t("forms.notesForTheNextDay")}
        />
      </div>
      {canMakeTask ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id="make-task-tomorrow"
            checked={makeTask}
            onCheckedChange={(checked) => onMakeTaskChange(checked === true)}
          />
          <Label htmlFor="make-task-tomorrow">{t("forms.makeATaskForTomorrow")}</Label>
        </div>
      ) : null}
    </div>
  );
}
