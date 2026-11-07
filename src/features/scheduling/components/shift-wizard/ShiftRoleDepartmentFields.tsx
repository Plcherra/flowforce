import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { useProfile } from "@/hooks/useProfile";
import { useDepartments } from "@/features/employees/hooks/useDepartments";

const NONE = "none";

export function ShiftRoleDepartmentFields({
  roleId,
  departmentId,
  onRoleId,
  onDepartmentId,
}: {
  roleId: string;
  departmentId: string;
  onRoleId: (roleId: string) => void;
  onDepartmentId: (departmentId: string) => void;
}) {
  const { t } = useTranslation();
  const { roles } = useCompanyRoles();
  const { profile, loading } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const { departments } = useDepartments({
    companyId,
    profileLoading: loading,
  });
  const activeRoles = roles.filter((role) => role.is_active !== false && role.name.trim());

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="shift-role">{t("schedule.shiftRole")}</Label>
        <Select
          value={roleId || NONE}
          onValueChange={(value) => onRoleId(value === NONE ? "" : value)}
        >
          <SelectTrigger id="shift-role" className="min-h-11" data-testid="shift-role-select">
            <SelectValue placeholder={t("schedule.chooseRole")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("schedule.chooseRole")}</SelectItem>
            {activeRoles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shift-department">{t("schedule.shiftDepartment")}</Label>
        <Select
          value={departmentId || NONE}
          onValueChange={(value) => onDepartmentId(value === NONE ? "" : value)}
        >
          <SelectTrigger
            id="shift-department"
            className="min-h-11"
            data-testid="shift-department-select"
          >
            <SelectValue placeholder={t("schedule.chooseDepartment")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("schedule.chooseDepartment")}</SelectItem>
            {departments
              .filter((department) => department.name?.trim())
              .map((department) => (
              <SelectItem key={department.id} value={department.id}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
