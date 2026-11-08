import { CompactAccessMatrix } from "./CompactAccessMatrix";
import type { ProductLevel } from "@/features/roles/constants/productLevels";

export function OperatorAccessGrid({
  level,
  permissions,
  classPermissions: _classPermissions,
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
  classPermissions?: Record<string, boolean> | null;
  inviterLevel?: ProductLevel;
  inviterPermissions?: Record<string, boolean> | null;
  disabled?: boolean;
  idPrefix?: string;
  startCollapsed?: boolean;
  onAccessChange: (rowId: string, switchId: string, enabled: boolean) => void;
  onUseStaffDefaults?: () => void;
}) {
  void _classPermissions;
  return (
    <CompactAccessMatrix
      level={level}
      permissions={permissions}
      inviterLevel={inviterLevel}
      inviterPermissions={inviterPermissions}
      disabled={disabled}
      idPrefix={idPrefix}
      startCollapsed={startCollapsed}
      onAccessChange={onAccessChange}
      onUseStaffDefaults={onUseStaffDefaults}
    />
  );
}
