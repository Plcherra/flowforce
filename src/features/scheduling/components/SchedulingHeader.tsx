/**
 * Scheduling system header component
 */

import {
  Calendar,
  Brain,
  BarChart3,
  Clock,
  CheckSquare,
  Zap,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SchedulingHeaderProps {
  showDebugTools: boolean;
  actionsDisabled: boolean;
  onDebugClick: () => void;
  onAutoScheduleClick: () => void;
  onChecklistClick: () => void;
}

export function SchedulingHeader({
  showDebugTools,
  actionsDisabled,
  onDebugClick,
  onAutoScheduleClick,
  onChecklistClick,
}: SchedulingHeaderProps) {
  return (
    <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              Next-Gen Scheduling System
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              AI Enhanced
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Analytics Ready
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Real-time
            </Badge>
            {showDebugTools && (
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
                onClick={onDebugClick}
              >
                <Bug className="h-3 w-3" />
                Diagnostics
              </Button>
            )}
            <Button
              size="sm"
              className="flex items-center gap-2"
              onClick={onAutoScheduleClick}
              disabled={actionsDisabled}
            >
              <Zap className="h-3 w-3" />
              Auto-Schedule Week
            </Button>
            <Button size="sm" variant="outline" onClick={onChecklistClick}>
              <CheckSquare className="h-3 w-3 mr-2" />
              Checklist
            </Button>
          </div>
        </div>
        {showDebugTools && (
          <div className="mt-4 flex items-center gap-2 md:hidden">
            <Button
              size="sm"
              variant="outline"
              className="flex items-center gap-2"
              onClick={onDebugClick}
            >
              <Bug className="h-4 w-4" />
              Diagnostics
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
