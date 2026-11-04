import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartments } from "@/features/employees/hooks/useDepartments";
import { groupPositionsByDepartment } from "@/features/scheduling/utils/groupPositionsByDepartment";
import type { ShiftPositionChoice } from "@/features/scheduling/utils/shiftDraftRole";
import { usePositions } from "@/hooks/usePositions";
import { useProfile } from "@/hooks/useProfile";

/** Select value for a shift that is not linked to a company position. */
export const BULK_UNASSIGNED_POSITION = "__unassigned_position__";

type BulkShiftPositionFieldProps = {
  value: ShiftPositionChoice | null;
  onChange: (position: ShiftPositionChoice | null) => void;
};

export function BulkShiftPositionField({
  value,
  onChange,
}: BulkShiftPositionFieldProps) {
  const { t } = useTranslation();
  const { profile, loading: profileLoading } = useProfile();
  const companyId = profile?.companyId ?? null;
  const { positions, loading } = usePositions();
  const { departments } = useDepartments({
    companyId,
    profileLoading,
  });

  const groups = useMemo(() => {
    const companyPositions = positions.filter(
      (position) => !companyId || position.company_id === companyId,
    );
    return groupPositionsByDepartment(companyPositions, departments);
  }, [companyId, departments, positions]);

  return (
    <div className="space-y-1">
      <Label htmlFor="multi-position">{t("schedule.jobPosition")}</Label>
      <Select
        value={value?.id || BULK_UNASSIGNED_POSITION}
        disabled={loading}
        onValueChange={(next) => {
          if (next === BULK_UNASSIGNED_POSITION) {
            onChange(null);
            return;
          }
          for (const group of groups) {
            const position = group.positions.find((item) => item.id === next);
            if (position) {
              onChange(position);
              return;
            }
          }
          onChange(null);
        }}
      >
        <SelectTrigger id="multi-position">
          <SelectValue placeholder={t("schedule.unassignedPosition")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BULK_UNASSIGNED_POSITION}>
            {t("schedule.unassignedPosition")}
          </SelectItem>
          {groups.map((group) => (
            <SelectGroup key={group.departmentId ?? "no-department"}>
              <SelectLabel>
                {group.departmentName ?? t("schedule.noDepartment")}
              </SelectLabel>
              {group.positions.map((position) => (
                <SelectItem key={position.id} value={position.id}>
                  {position.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {!loading && groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("schedule.noPositionsForCompany")}
        </p>
      ) : null}
    </div>
  );
}
