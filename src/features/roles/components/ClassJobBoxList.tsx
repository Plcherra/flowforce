import { Badge } from "@/components/ui/badge";
import {
  OPERATOR_VERB_LABELS,
  enabledVerbsForArea,
  getVisibleOperatorAreas,
} from "@/features/roles/constants/operatorBoxes";
import type { ProductLevel } from "@/features/roles/constants/productLevels";
import { useTranslation } from "react-i18next";

export function ClassJobBoxList({
  level,
  permissions,
}: {
  level: ProductLevel;
  permissions?: Record<string, boolean> | null;
}) {
  const { t } = useTranslation();
  const areas = getVisibleOperatorAreas(level)
    .map((area) => ({
      area,
      verbs: enabledVerbsForArea(area, level, permissions),
    }))
    .filter((item) => item.verbs.length > 0);

  if (areas.length === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">{t("roles.noJobAccessYet")}</p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {areas.map(({ area, verbs }) => (
        <Badge key={area.key} variant="secondary">
          {area.label}:{" "}
          {verbs.map((verb) => OPERATOR_VERB_LABELS[verb]).join(", ")}
        </Badge>
      ))}
    </div>
  );
}
