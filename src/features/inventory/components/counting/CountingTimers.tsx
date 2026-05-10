import { Clock, Edit, Play, Pause } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CountingTimersProps {
  countingTime: number;
  editTime: number;
  isTimerRunning: boolean;
  isEditTimerRunning: boolean;
  isEditMode: boolean;
  formatTime: (seconds: number) => string;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onStartEditTimer: () => void;
  onStopEditTimer: () => void;
}

export function CountingTimers({
  countingTime,
  editTime,
  isTimerRunning,
  isEditTimerRunning,
  isEditMode,
  formatTime,
  onStartTimer,
  onStopTimer,
  onStartEditTimer,
  onStopEditTimer,
}: CountingTimersProps) {
  return (
    <div className="flex gap-4 items-center">
      {/* Counting Timer */}
      <Card className="flex-1">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Counting Time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold text-blue-600">
                {formatTime(countingTime)}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={isTimerRunning ? onStopTimer : onStartTimer}
                className="h-8 w-8 p-0"
              >
                {isTimerRunning ? (
                  <Pause className="h-3 w-3" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Timer */}
      {isEditMode && (
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Edit Time</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-yellow-600">
                  {formatTime(editTime)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={
                    isEditTimerRunning ? onStopEditTimer : onStartEditTimer
                  }
                  className="h-8 w-8 p-0"
                >
                  {isEditTimerRunning ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Mode Badge */}
      {isEditMode && (
        <Badge variant="secondary" className="h-12 px-4">
          <Edit className="h-4 w-4 mr-2" />
          Edit Mode
        </Badge>
      )}
    </div>
  );
}
