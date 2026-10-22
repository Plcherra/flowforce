import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function FlagIssueControls({
  fields,
  flaggedIds,
  onToggle,
}: {
  fields: Array<{ id: string; label?: string | null }>;
  flaggedIds: string[];
  onToggle: (fieldId: string, flagged: boolean) => void;
}) {
  const { t } = useTranslation();
  if (fields.length === 0) return null;
  const flagged = new Set(flaggedIds);

  return (
    <div className="space-y-2" data-testid="flag-issue-controls">
      <p className="text-sm font-medium">{t("forms.flagAnItemAsAnIssue")}</p>
      <div className="space-y-2">
        {fields.map((field) => (
          <div key={field.id} className="flex items-center gap-2">
            <Checkbox
              id={`flag-issue-${field.id}`}
              checked={flagged.has(field.id)}
              onCheckedChange={(checked) => onToggle(field.id, Boolean(checked))}
            />
            <Label htmlFor={`flag-issue-${field.id}`} className="text-sm font-normal">
              {field.label?.trim() || "Item"}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
