import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import {
  ACCESS_ROWS,
  accessSwitchOn,
  accessSwitchVisible,
  type AccessRow,
  type AccessSwitch,
} from "@/features/roles/constants/permissionAccessTypes";
import { inviterHoldsKey } from "@/features/roles/constants/grantCeiling";
import type { ProductLevel } from "@/features/roles/constants/productLevels";

function inviterCanGrantSwitch(
  item: AccessSwitch,
  level: ProductLevel,
  inviterLevel: ProductLevel | undefined,
  inviterPermissions: Record<string, boolean> | null | undefined,
): boolean {
  if (!inviterLevel) return accessSwitchVisible(level, item);
  return item.keys.every((key) =>
    inviterHoldsKey(inviterLevel, inviterPermissions, key),
  );
}

export function OperatorAccessGrid({
  level,
  permissions,
  classPermissions,
  inviterLevel,
  inviterPermissions,
  disabled = false,
  idPrefix = "access",
  onAccessChange,
}: {
  level: ProductLevel;
  permissions?: Record<string, boolean> | null;
  classPermissions?: Record<string, boolean> | null;
  inviterLevel?: ProductLevel;
  inviterPermissions?: Record<string, boolean> | null;
  disabled?: boolean;
  idPrefix?: string;
  onAccessChange: (rowId: string, switchId: string, enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const labelFor = (row: AccessRow) =>
    row.labelKey ? t(row.labelKey) : row.label;
  return (
    <div className="space-y-2" data-testid="operator-access-grid">
      {ACCESS_ROWS.map((row) => {
        const switches = row.switches.filter((item) => accessSwitchVisible(level, item));
        if (switches.length === 0) return null;
        return (
          <div
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
            data-testid={`access-row-${row.id}`}
          >
            <p className="text-sm font-medium">{labelFor(row)}</p>
            <div className="flex flex-wrap gap-3">
              {switches.map((item) => {
                const locked = level === "owner" && Boolean(item.ownerLocked);
                const grantable = inviterCanGrantSwitch(
                  item,
                  level,
                  inviterLevel,
                  inviterPermissions,
                );
                const enabled = locked || accessSwitchOn(permissions, item);
                const classOn = classPermissions
                  ? accessSwitchOn(classPermissions, item)
                  : enabled;
                const diffLabel =
                  classPermissions && enabled !== classOn
                    ? enabled
                      ? "Given"
                      : "Taken"
                    : null;
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    {grantable ? (
                      <Switch
                        id={`${idPrefix}-${row.id}-${item.id}`}
                        aria-label={`${labelFor(row)} ${item.label}`}
                        checked={enabled}
                        disabled={disabled || locked || !grantable}
                        onCheckedChange={(checked) =>
                          onAccessChange(row.id, item.id, Boolean(checked))
                        }
                      />
                    ) : (
                      <span>—</span>
                    )}
                    <span>{item.label}</span>
                    {diffLabel ? (
                      <span className="uppercase tracking-wide">{diffLabel}</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
