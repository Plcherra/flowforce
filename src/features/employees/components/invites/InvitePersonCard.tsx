import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { OperatorAccessGrid } from "@/features/roles/components/OperatorAccessGrid";
import { effectiveInvitePermissions } from "@/features/employees/utils/staffInviteScheduleDefaults";
import {
  operatorVerbsToPermissionDiffs,
  permissionDiffsToOperatorVerbs,
  retainAllowedDiffs,
} from "@/features/roles/constants/personAccessDiffs";
import {
  resolveProductLevel,
  type ProductLevel,
} from "@/features/roles/constants/productLevels";
import { inviterCanGrantVerb } from "@/features/roles/constants/grantCeiling";
import {
  isVerbAvailable,
  isVerbLockedOn,
  verbSelectionKey,
  type OperatorVerb,
} from "@/features/roles/constants/operatorBoxes";
import { getVisibleOperatorAreas } from "@/features/roles/constants/operatorBoxes";
import type { CompanyRole } from "@/hooks/useCompanyRoles";
import type { InvitePersonCard } from "../../types/invites";
import type { OrganizationLocation } from "@/hooks/useLocations";
import type { Department } from "../../types/directory";

export function InvitePersonCardForm({
  card,
  index,
  classes,
  locations,
  departments,
  showLocations,
  showDepartments,
  inviterLevel,
  inviterPermissions,
  canRemove,
  onChange,
  onRemove,
}: {
  card: InvitePersonCard;
  index: number;
  classes: CompanyRole[];
  locations: OrganizationLocation[];
  departments: Department[];
  showLocations: boolean;
  showDepartments: boolean;
  inviterLevel: ProductLevel;
  inviterPermissions?: Record<string, boolean> | null;
  canRemove: boolean;
  onChange: (card: InvitePersonCard) => void;
  onRemove: () => void;
}) {
  const selectedClass = classes.find((role) => role.id === card.roleId);
  const level: ProductLevel = selectedClass
    ? resolveProductLevel(selectedClass)
    : "staff";
  const classPermissions = selectedClass?.permissions ?? {};
  const effectivePermissions = effectiveInvitePermissions(
    level,
    classPermissions,
    card.permissionOverrides,
  );

  const handleVerbChange = (
    areaKey: string,
    verb: OperatorVerb,
    enabled: boolean,
  ) => {
    const area = getVisibleOperatorAreas(level).find(
      (item) => item.key === areaKey,
    );
    if (!area || isVerbLockedOn(area, verb, level)) return;
    if (!isVerbAvailable(area, verb, level)) return;
    if (
      !inviterCanGrantVerb(
        area,
        verb,
        level,
        inviterLevel,
        inviterPermissions,
      )
    ) {
      return;
    }

    const current = permissionDiffsToOperatorVerbs(
      level,
      classPermissions,
      card.permissionOverrides,
    );
    const selection = verbSelectionKey(area.key, verb);
    const next = enabled
      ? Array.from(new Set([...current, selection]))
      : current.filter((key) => key !== selection);

    onChange({
      ...card,
      permissionOverrides: operatorVerbsToPermissionDiffs(
        level,
        classPermissions,
        next,
      ),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Person {index + 1}</p>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={onRemove}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Remove
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-first`}>First name</Label>
            <Input
              id={`${card.id}-first`}
              value={card.firstName}
              onChange={(event) =>
                onChange({ ...card, firstName: event.target.value })
              }
              placeholder="Jordan"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-last`}>Last name</Label>
            <Input
              id={`${card.id}-last`}
              value={card.lastName}
              onChange={(event) =>
                onChange({ ...card, lastName: event.target.value })
              }
              placeholder="Lee"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-email`}>Email</Label>
            <Input
              id={`${card.id}-email`}
              type="email"
              value={card.email}
              onChange={(event) =>
                onChange({ ...card, email: event.target.value })
              }
              placeholder="jordan@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-phone`}>Phone</Label>
            <Input
              id={`${card.id}-phone`}
              value={card.phone}
              onChange={(event) =>
                onChange({ ...card, phone: event.target.value })
              }
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select
              value={card.roleId}
              onValueChange={(value) => {
                const nextClass = classes.find((role) => role.id === value);
                onChange({
                  ...card,
                  roleId: value,
                  permissionOverrides: nextClass
                    ? retainAllowedDiffs(
                        resolveProductLevel(nextClass),
                        nextClass.permissions,
                        card.permissionOverrides,
                      )
                    : {},
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showLocations ? (
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select
                value={card.locationId}
                onValueChange={(value) =>
                  onChange({ ...card, locationId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {showDepartments ? (
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={card.departmentId}
                onValueChange={(value) =>
                  onChange({ ...card, departmentId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {selectedClass ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {selectedClass.name} is painted. Give or take only boxes you
              can grant.
            </p>
            <OperatorAccessGrid
              level={level}
              permissions={effectivePermissions}
              classPermissions={classPermissions}
              inviterLevel={inviterLevel}
              inviterPermissions={inviterPermissions}
              idPrefix={card.id}
              onVerbChange={handleVerbChange}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
