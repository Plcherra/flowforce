import { Eye, Save, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/useCan";

export function ShiftDetailsActions({
  loading,
  published,
  onSave,
  onPublish,
  onDelete,
}: {
  loading: boolean;
  published: boolean;
  onSave: () => void;
  onPublish: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const { can, isLoading } = useCan();
  const canDelete = !isLoading && can("schedule.delete");

  return (
    <div
      className="flex shrink-0 flex-col gap-2 border-t p-6"
      data-testid="shift-details-actions"
      data-permissions-ready={isLoading ? "false" : "true"}
      data-can-delete={canDelete ? "true" : "false"}
    >
      <Button onClick={onSave} disabled={loading}>
        <Save className="mr-2 h-4 w-4" />
        {loading ? t("schedule.saving") : t("schedule.saveShiftChanges")}
      </Button>

      {!published ? (
        <Button variant="outline" onClick={onPublish} disabled={loading}>
          <Eye className="mr-2 h-4 w-4" />
          {t("schedule.publishThisShiftOnly")}
        </Button>
      ) : null}

      {canDelete ? (
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={loading}
          data-testid="delete-shift"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("schedule.deleteShift")}
        </Button>
      ) : null}
    </div>
  );
}
