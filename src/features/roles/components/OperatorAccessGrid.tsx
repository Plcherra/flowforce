import { Switch } from "@/components/ui/switch";
import {
  OPERATOR_VERB_LABELS,
  OPERATOR_VERBS,
  getVisibleOperatorAreas,
  isVerbAvailable,
  isVerbEnabled,
  isVerbLockedOn,
  type OperatorVerb,
} from "@/features/roles/constants/operatorBoxes";
import { inviterCanGrantVerb } from "@/features/roles/constants/grantCeiling";
import type { ProductLevel } from "@/features/roles/constants/productLevels";

export function OperatorAccessGrid({
  level,
  permissions,
  classPermissions,
  inviterLevel,
  inviterPermissions,
  disabled = false,
  idPrefix = "access",
  onVerbChange,
}: {
  level: ProductLevel;
  permissions?: Record<string, boolean> | null;
  classPermissions?: Record<string, boolean> | null;
  inviterLevel?: ProductLevel;
  inviterPermissions?: Record<string, boolean> | null;
  disabled?: boolean;
  idPrefix?: string;
  onVerbChange: (areaKey: string, verb: OperatorVerb, enabled: boolean) => void;
}) {
  const areas = getVisibleOperatorAreas(level);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <div className="grid min-w-[36rem] grid-cols-[minmax(10rem,1.4fr)_repeat(3,7rem)] items-center gap-2 border-b bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Job</span>
        {OPERATOR_VERBS.map((verb) => (
          <span key={verb} className="text-center">
            {OPERATOR_VERB_LABELS[verb]}
          </span>
        ))}
      </div>
      {areas.map((area) => (
        <div
          key={area.key}
          className="grid min-w-[36rem] grid-cols-[minmax(10rem,1.4fr)_repeat(3,7rem)] items-center gap-2 border-b px-3 py-3 last:border-b-0"
        >
          <div>
            <p className="text-sm font-medium">{area.label}</p>
            <p className="text-xs text-muted-foreground">{area.description}</p>
          </div>
          {OPERATOR_VERBS.map((verb) => {
            const available = isVerbAvailable(area, verb, level);
            const grantable = inviterLevel
              ? inviterCanGrantVerb(
                  area,
                  verb,
                  level,
                  inviterLevel,
                  inviterPermissions,
                )
              : available;
            const lockedOn = isVerbLockedOn(area, verb, level);
            const enabled = isVerbEnabled(area, verb, level, permissions);
            const classEnabled = classPermissions
              ? isVerbEnabled(area, verb, level, classPermissions)
              : enabled;
            const diffLabel =
              classPermissions && available && enabled !== classEnabled
                ? enabled
                  ? "Given"
                  : "Taken"
                : null;

            return (
              <div key={verb} className="flex flex-col items-center gap-1">
                {available && grantable ? (
                  <>
                    <Switch
                      id={`${idPrefix}-${area.key}-${verb}`}
                      aria-label={`${area.label} ${OPERATOR_VERB_LABELS[verb]}`}
                      checked={enabled}
                      disabled={disabled || lockedOn}
                      onCheckedChange={(checked) =>
                        onVerbChange(area.key, verb, Boolean(checked))
                      }
                    />
                    {diffLabel ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {diffLabel}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
