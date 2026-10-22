import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  Bell,
  Calendar,
  Clock,
  MoreHorizontal,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SchedulingRole } from "../hooks/useSchedulingRole";
import { scheduleMenuAccess } from "../utils/scheduleMenuAccess";
import type { SchedulingPanelId } from "../types/panels";

type ReadinessAction = SchedulingPanelId | "schedule" | "reports";

export type ScheduleConflictNotice = {
  id: string;
  severity: string;
  type: string;
  message: string;
};

interface ScheduleMoreMenuProps {
  role: SchedulingRole;
  conflicts?: ScheduleConflictNotice[];
  onAction?: (target: ReadinessAction) => void;
  onOpenAvailability?: (view: "personal" | "team") => void;
}

export function ScheduleMoreMenu({
  role,
  conflicts = [],
  onAction,
  onOpenAvailability,
}: ScheduleMoreMenuProps) {
  const { t } = useTranslation();
  const access = scheduleMenuAccess(role);
  const showTeam =
    access.canReviewTeam || access.canManageTeamAvailability;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-7 w-7 shrink-0 p-0"
          aria-label={t("schedule.moreOptions")}
          title={t("schedule.moreOptions")}
          data-testid="schedule-more-options"
        >
          <MoreHorizontal className="h-4 w-4" />
          {conflicts.length > 0 ? (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("schedule.you")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onOpenAvailability?.("personal")}>
          <Clock className="mr-2 h-4 w-4" />
          {t("schedule.myAvailability2")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction?.("timeoff")}>
          <Calendar className="mr-2 h-4 w-4" />
          {t("schedule.myTimeOff")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction?.("swaps")}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          {t("schedule.mySwaps")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction?.("workflow")}>
          <Bell className="mr-2 h-4 w-4" />
          {t("schedule.reminders")}
        </DropdownMenuItem>

        {showTeam ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("schedule.team")}</DropdownMenuLabel>
            {access.canReviewTeam ? (
              <DropdownMenuItem onClick={() => onAction?.("staff")}>
                <Users className="mr-2 h-4 w-4" />
                {t("schedule.teamRequests")}
              </DropdownMenuItem>
            ) : null}
            {access.canManageTeamAvailability ? (
              <DropdownMenuItem onClick={() => onOpenAvailability?.("team")}>
                <Clock className="mr-2 h-4 w-4" />
                {t("schedule.teamAvailability")}
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}

        {conflicts.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("schedule.conflictWarnings2")}</DropdownMenuLabel>
            <div className="max-h-48 space-y-1 overflow-y-auto px-1 pb-1">
              {conflicts.slice(0, 4).map((conflict) => (
                <div
                  key={conflict.id}
                  data-testid={`schedule-readiness-conflict-${conflict.id}`}
                  className="rounded-md border bg-background p-2 text-xs"
                >
                  <Badge
                    variant="outline"
                    className={
                      conflict.severity === "blocking"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-warning/40 bg-warning-muted text-warning-foreground"
                    }
                  >
                    {conflict.type.replace(/_/g, " ")}
                  </Badge>
                  <p className="mt-1 text-muted-foreground">{conflict.message}</p>
                </div>
              ))}
              {conflicts.length > 4 ? (
                <p className="px-1 text-xs text-muted-foreground">
                  {conflicts.length - 4} more conflicts not shown.
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
