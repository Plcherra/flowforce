import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ACCESS_ROWS,
  accessSwitchOn,
  accessSwitchVisible,
  type AccessRow,
  type AccessSwitch,
} from "@/features/roles/constants/permissionAccessTypes";
import { accessGroupForRow } from "@/features/roles/constants/accessGroups";
import { inviterHoldsKey } from "@/features/roles/constants/grantCeiling";
import type { ProductLevel } from "@/features/roles/constants/productLevels";

const GROUP_ORDER = ["profile", "schedule", "tasks", "stock", "settings"] as const;

const GROUP_LABEL: Record<(typeof GROUP_ORDER)[number], string> = {
  profile: "settings.accessGroupProfile",
  schedule: "settings.accessGroupSchedule",
  tasks: "settings.accessGroupTasks",
  stock: "settings.accessGroupStock",
  settings: "settings.accessGroupSettings",
};

function switchAllowed(
  item: AccessSwitch,
  level: ProductLevel,
  inviterLevel: ProductLevel | undefined,
  inviterPermissions: Record<string, boolean> | null | undefined,
) {
  if (!accessSwitchVisible(level, item)) return false;
  if (!inviterLevel) return true;
  return item.keys.every((key) => inviterHoldsKey(inviterLevel, inviterPermissions, key));
}

export function accessAllowance(
  level: ProductLevel,
  permissions: Record<string, boolean> | null | undefined,
) {
  let allowed = 0;
  let total = 0;
  for (const row of ACCESS_ROWS) {
    for (const item of row.switches) {
      if (!accessSwitchVisible(level, item)) continue;
      total += 1;
      if (accessSwitchOn(permissions, item)) allowed += 1;
    }
  }
  return { allowed, total };
}

export function CompactAccessMatrix({
  level,
  permissions,
  inviterLevel,
  inviterPermissions,
  disabled = false,
  idPrefix = "access",
  startCollapsed = false,
  onAccessChange,
  onUseStaffDefaults,
}: {
  level: ProductLevel;
  permissions?: Record<string, boolean> | null;
  inviterLevel?: ProductLevel;
  inviterPermissions?: Record<string, boolean> | null;
  disabled?: boolean;
  idPrefix?: string;
  startCollapsed?: boolean;
  onAccessChange: (rowId: string, switchId: string, enabled: boolean) => void;
  onUseStaffDefaults?: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!startCollapsed);
  const [sections, setSections] = useState<Record<string, boolean>>({
    profile: true,
    schedule: true,
  });
  const summary = accessAllowance(level, permissions);
  const groups = useMemo(() => {
    const buckets = new Map<string, AccessRow[]>();
    for (const row of ACCESS_ROWS) {
      const visible = row.switches.some((item) =>
        switchAllowed(item, level, inviterLevel, inviterPermissions),
      );
      if (!visible) continue;
      const group = accessGroupForRow(row.id);
      buckets.set(group, [...(buckets.get(group) ?? []), row]);
    }
    return GROUP_ORDER.flatMap((id) => {
      const rows = buckets.get(id);
      return rows && rows.length > 0 ? [{ id, rows }] : [];
    });
  }, [inviterLevel, inviterPermissions, level]);

  return (
    <div className="space-y-3" data-testid="operator-access-grid">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" data-testid="access-summary">
          {t("settings.accessSummary", summary)}
        </p>
        <div className="flex flex-wrap gap-2">
          {onUseStaffDefaults ? (
            <Button type="button" size="sm" variant="outline" onClick={onUseStaffDefaults}>
              {t("settings.useStaffDefaults")}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="access-customize"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? t("settings.accessHideDetails") : t("settings.accessCustomize")}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="space-y-2">
          {groups.map((group) => {
            const expanded = sections[group.id] !== false;
            return (
              <section key={group.id} className="rounded-lg border" data-testid={`access-group-${group.id}`}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between px-3 text-left text-sm font-medium"
                  aria-expanded={expanded}
                  onClick={() =>
                    setSections((current) => ({ ...current, [group.id]: !expanded }))
                  }
                >
                  {t(GROUP_LABEL[group.id])}
                  {expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
                {expanded ? (
                  <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
                    {group.rows.flatMap((row) =>
                      row.switches
                        .filter((item) => switchAllowed(item, level, inviterLevel, inviterPermissions))
                        .map((item) => {
                          const label = item.labelKey ? t(item.labelKey) : item.label;
                          const rowLabel = row.labelKey ? t(row.labelKey) : row.label;
                          const locked = level === "owner" && Boolean(item.ownerLocked);
                          const checked = locked || accessSwitchOn(permissions, item);
                          return (
                            <label
                              key={`${row.id}-${item.id}`}
                              className="flex min-h-11 items-center gap-2 text-sm"
                            >
                              <Checkbox
                                id={`${idPrefix}-${row.id}-${item.id}`}
                                checked={checked}
                                disabled={disabled || locked}
                                onCheckedChange={(value) =>
                                  onAccessChange(row.id, item.id, value === true)
                                }
                              />
                              <span>
                                {rowLabel}: {label}
                              </span>
                            </label>
                          );
                        }),
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
