import { useTranslation } from "react-i18next";
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
import { rolesInDepartment } from "@/features/employees/utils/inviteRoleChoices";
import { NameCombobox, type NameOption } from "./NameCombobox";
import { coffeeShopStarter } from "@/features/onboarding/utils/orgTemplates";
import { effectiveInvitePermissions } from "@/features/employees/utils/staffInviteScheduleDefaults";
import { retainAllowedDiffs } from "@/features/roles/constants/personAccessDiffs";
import {
  resolveProductLevel,
  type ProductLevel,
} from "@/features/roles/constants/productLevels";
import { diffsForAccessSwitch } from "@/features/roles/constants/permissionAccessTypes";
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
  onCreateDepartment,
  onDeleteDepartment,
  onCreateRole,
  onDeleteRole,
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
  onCreateDepartment?: (name: string) => Promise<string | null>;
  onDeleteDepartment?: (id: string) => Promise<"ok" | "blocked">;
  onCreateRole?: (name: string, departmentId: string) => Promise<string | null>;
  onDeleteRole?: (id: string) => Promise<"ok" | "blocked">;
}) {
  const { t } = useTranslation();
  void showLocations;
  void showDepartments;
  const shop = coffeeShopStarter(t);
  const visibleRoles = rolesInDepartment(classes, card.departmentId);
  const selectedClass = classes.find((role) => role.id === card.roleId);
  const departmentOptions: NameOption[] = [
    ...departments.map((department) => ({ id: department.id, name: department.name })),
    ...shop.departments
      .filter(
        (department) =>
          !departments.some(
            (row) => row.name.trim().toLowerCase() === department.name.trim().toLowerCase(),
          ),
      )
      .map((department) => ({ id: "", name: department.name, suggested: true })),
  ];
  const roleOptions: NameOption[] = [
    ...visibleRoles.map((role) => ({ id: role.id, name: role.name })),
    ...shop.departments
      .flatMap((department) => department.roles)
      .filter(
        (role) =>
          !visibleRoles.some((row) => row.name.trim().toLowerCase() === role.name.trim().toLowerCase()),
      )
      .map((role) => ({ id: "", name: role.name, suggested: true })),
  ];
  const level: ProductLevel = selectedClass
    ? resolveProductLevel(selectedClass)
    : "staff";
  const classPermissions = selectedClass?.permissions ?? {};
  const effectivePermissions = effectiveInvitePermissions(
    level,
    classPermissions,
    card.permissionOverrides,
  );

  const handleAccessChange = (
    rowId: string,
    switchId: string,
    enabled: boolean,
  ) => {
    onChange({
      ...card,
      permissionOverrides: diffsForAccessSwitch(
        classPermissions,
        card.permissionOverrides,
        rowId,
        switchId,
        enabled,
      ),
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {t("employees.personNumber", { number: index + 1 })}
          </p>
          {canRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {t("forms.remove")}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-first`}>{t("employees.firstName")}</Label>
            <Input
              id={`${card.id}-first`}
              value={card.firstName}
              onChange={(event) =>
                onChange({ ...card, firstName: event.target.value })
              }
              placeholder={t("employees.jordan")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-last`}>{t("employees.lastName")}</Label>
            <Input
              id={`${card.id}-last`}
              value={card.lastName}
              onChange={(event) =>
                onChange({ ...card, lastName: event.target.value })
              }
              placeholder={t("employees.lee")}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-email`}>{t("auth.email")}</Label>
            <Input
              id={`${card.id}-email`}
              type="email"
              value={card.email}
              onChange={(event) =>
                onChange({ ...card, email: event.target.value })
              }
              placeholder={t("employees.jordanExampleCom")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-phone`}>{t("onboarding.userInfo.fields.phone")}</Label>
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
          <NameCombobox
            label={t("employees.role")}
            value={card.roleId}
            options={roleOptions}
            testId="invite-role"
            onSelect={(roleId) => {
              const nextClass = classes.find((role) => role.id === roleId);
              onChange({
                ...card,
                roleId,
                permissionOverrides: nextClass
                  ? retainAllowedDiffs(
                      resolveProductLevel(nextClass),
                      nextClass.permissions,
                      card.permissionOverrides,
                    )
                  : {},
              });
            }}
            onCreate={(name) => {
              void onCreateRole?.(name, card.departmentId).then((roleId) => {
                if (roleId) onChange({ ...card, roleId, permissionOverrides: {} });
              });
            }}
            onDelete={async (id) => (await onDeleteRole?.(id)) ?? "ok"}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-start`}>{t("employees.startDate")}</Label>
            <Input
              id={`${card.id}-start`}
              data-testid="invite-start-date"
              type="date"
              value={card.startDate}
              aria-describedby={`${card.id}-start-help`}
              onChange={(event) =>
                onChange({ ...card, startDate: event.target.value })
              }
            />
            <p id={`${card.id}-start-help`} className="text-sm text-muted-foreground">
              {t("employees.startDateHelp")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${card.id}-location`}>{t("forms.location")}</Label>
            {locations.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="invite-location-empty">
                {t("employees.noStoresYet")}
              </p>
            ) : (
              <Select
                value={card.locationId}
                onValueChange={(value) => onChange({ ...card, locationId: value })}
              >
                <SelectTrigger
                  id={`${card.id}-location`}
                  data-testid="invite-location"
                  aria-label={t("forms.location")}
                >
                  <SelectValue placeholder={t("employees.chooseALocation")} />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem
                      key={location.id}
                      value={location.id}
                      data-testid="invite-location-option"
                      data-location-id={location.id}
                    >
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <NameCombobox
            label={t("employees.department")}
            value={card.departmentId}
            options={departmentOptions}
            testId="invite-department"
            onSelect={(departmentId) =>
              onChange({
                ...card,
                departmentId,
                roleId: rolesInDepartment(classes, departmentId).some((role) => role.id === card.roleId)
                  ? card.roleId
                  : "",
              })
            }
            onCreate={(name) => {
              void onCreateDepartment?.(name).then((departmentId) => {
                if (departmentId) onChange({ ...card, departmentId });
              });
            }}
            onDelete={async (id) => (await onDeleteDepartment?.(id)) ?? "ok"}
          />
        </div>

        {selectedClass ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {selectedClass.name} {t("literals.isPaintedGiveOrTakeOnlyBoxesYou")}
            </p>
            <OperatorAccessGrid
              level={level}
              permissions={effectivePermissions}
              classPermissions={classPermissions}
              inviterLevel={inviterLevel}
              inviterPermissions={inviterPermissions}
              idPrefix={card.id}
              startCollapsed
              onUseStaffDefaults={() => onChange({ ...card, permissionOverrides: {} })}
              onAccessChange={handleAccessChange}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
