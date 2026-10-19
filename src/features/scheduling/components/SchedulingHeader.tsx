/**
 * Scheduling page header — compact title. Secondary actions live in the
 * readiness bar's more menu so the week grid keeps the vertical space.
 */

import { Calendar, CalendarDays } from "lucide-react";
import type { SchedulingRole } from "../hooks/useSchedulingRole";

interface SchedulingHeaderProps {
  role: SchedulingRole;
}

export function SchedulingHeader({ role }: SchedulingHeaderProps) {
  const buildsSchedule = role.canManageSchedule;
  const title = buildsSchedule ? "Schedule" : "My Schedule";

  return (
    <div className="border-b bg-card/80">
      <div className="flex items-center px-3 py-1.5 sm:px-4">
        <h1 className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
          {!buildsSchedule ? (
            <CalendarDays className="h-4 w-4 text-primary" />
          ) : (
            <Calendar className="h-4 w-4 text-primary" />
          )}
          {title}
        </h1>
      </div>
    </div>
  );
}
