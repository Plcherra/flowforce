import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { CompanyRole } from "@/hooks/useCompanyRoles";
import { managersCanDeleteShifts } from "@/features/roles/constants/managerShiftDelete";
import { resolveProductLevel } from "@/features/roles/constants/productLevels";

export function ManagerShiftDeleteToggle({
  roles,
  disabled,
  onChange,
}: {
  roles: CompanyRole[];
  disabled?: boolean;
  onChange: (enabled: boolean) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const enabled = managersCanDeleteShifts(roles);
  const hasManagers = roles.some(
    (role) =>
      role.is_active !== false && resolveProductLevel(role) === "manager",
  );

  const handleChange = async (checked: boolean) => {
    setSaving(true);
    try {
      await onChange(checked);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="managers-can-delete-shifts-card">
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="space-y-1">
          <Label htmlFor="managers-can-delete-shifts">
            {t("roles.managersCanDeleteShifts")}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t("roles.managersCanDeleteShiftsHelp")}
          </p>
        </div>
        <Switch
          id="managers-can-delete-shifts"
          data-testid="managers-can-delete-shifts"
          checked={enabled}
          disabled={disabled || saving || !hasManagers}
          onCheckedChange={(checked) => void handleChange(Boolean(checked))}
        />
      </CardContent>
    </Card>
  );
}
