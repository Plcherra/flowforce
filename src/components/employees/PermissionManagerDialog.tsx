import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePermissions, usePermissionFlags } from "@/hooks/usePermissions";

type PermissionManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function PermissionManagerDialog({
  open,
  onOpenChange,
}: PermissionManagerDialogProps) {
  const { roles, featureKeys, isLoading, updateFlag, isUpdating } =
    usePermissionFlags();
  const { hasRole } = usePermissions();
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const availableRoles = useMemo(() => roles, [roles]);

  useEffect(() => {
    if (!open) {
      setSelectedRoleId("");
      return;
    }
    if (availableRoles.length) {
      setSelectedRoleId(availableRoles[0].id);
    }
  }, [open, availableRoles]);

  const selectedRole = availableRoles.find(
    (role) => role.id === selectedRoleId,
  );

  const handleToggle = async (
    key: (typeof featureKeys)[number]["key"],
    checked: boolean,
  ) => {
    if (!selectedRole) return;
    await updateFlag({ roleId: selectedRole.id, key, value: checked });
  };

  const canManagePermissions = hasRole(["admin", "owner"]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Manage permissions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              value={selectedRoleId}
              onValueChange={setSelectedRoleId}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!canManagePermissions && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              You need elevated access to modify company permissions.
            </p>
          )}

          <div className="space-y-3">
            {featureKeys.map((feature) => {
              const enabled = Boolean(selectedRole?.permissions?.[feature.key]);
              return (
                <div
                  key={feature.key}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    disabled={
                      !selectedRole || !canManagePermissions || isUpdating
                    }
                    onCheckedChange={(checked) =>
                      handleToggle(feature.key, checked)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
