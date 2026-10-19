import {
  ArrowRightLeft,
  Calendar,
  Clock,
  LayoutGrid,
  MoreHorizontal,
  Settings,
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
import type { SchedulingPanelId } from "../types/panels";

type ReadinessAction = SchedulingPanelId | "schedule" | "reports";

export type ScheduleConflictNotice = {
  id: string;
  severity: string;
  type: string;
  message: string;
};

interface ScheduleMoreMenuProps {
  isStaff: boolean;
  conflicts?: ScheduleConflictNotice[];
  onAction?: (target: ReadinessAction) => void;
}

export function ScheduleMoreMenu({
  isStaff,
  conflicts = [],
  onAction,
}: ScheduleMoreMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-7 w-7 shrink-0 p-0"
          aria-label="More options"
          title="More options"
          data-testid="schedule-more-options"
        >
          <MoreHorizontal className="h-4 w-4" />
          {conflicts.length > 0 ? (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {isStaff ? (
          <>
            <DropdownMenuItem onClick={() => onAction?.("availability")}>
              <Clock className="mr-2 h-4 w-4" />
              My availability
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("timeoff")}>
              <Calendar className="mr-2 h-4 w-4" />
              Time off
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("swaps")}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Swaps
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onAction?.("staff")}>
              <Users className="mr-2 h-4 w-4" />
              Staff management
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("availability")}>
              <Clock className="mr-2 h-4 w-4" />
              Availability
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("timeoff")}>
              <Calendar className="mr-2 h-4 w-4" />
              Time off
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("swaps")}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Shift swaps
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.("schedule")}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Go to board
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction?.("workflow")}>
              <Settings className="mr-2 h-4 w-4" />
              Automation
            </DropdownMenuItem>
          </>
        )}

        {conflicts.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Conflict warnings</DropdownMenuLabel>
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
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
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
