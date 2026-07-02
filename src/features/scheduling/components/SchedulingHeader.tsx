/**
 * Scheduling page header — minimal title and secondary actions.
 */

import {
  ArrowRightLeft,
  Calendar,
  CalendarDays,
  Clock,
  MoreHorizontal,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SchedulingPanelId } from "../types/panels";
import type { SchedulingRole } from "../hooks/useSchedulingRole";

interface SchedulingHeaderProps {
  role: SchedulingRole;
  onPanelOpen: (panel: SchedulingPanelId) => void;
}

export function SchedulingHeader({ role, onPanelOpen }: SchedulingHeaderProps) {
  const title = role.isStaff ? "My Schedule" : "Schedule";

  return (
    <div className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            {role.isStaff ? (
              <CalendarDays className="h-5 w-5 text-primary" />
            ) : (
              <Calendar className="h-5 w-5 text-primary" />
            )}
            {title}
          </h1>

          {role.isStaff ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onPanelOpen("availability")}
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">My availability</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onPanelOpen("timeoff")}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Time off</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onPanelOpen("swaps")}
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Swaps</span>
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => onPanelOpen("staff")}>
                  <Users className="mr-2 h-4 w-4" />
                  Staff management
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPanelOpen("availability")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Availability
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPanelOpen("timeoff")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Time off
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPanelOpen("swaps")}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Shift swaps
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPanelOpen("workflow")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Automation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}
