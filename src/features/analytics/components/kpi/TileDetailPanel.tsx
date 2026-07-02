/**
 * Tile detail panel component that renders the appropriate detail view
 */

import type { TileId } from "../../types/kpi";
import type {
  TasksMetrics,
  SchedulingMetrics,
  PerformanceMetrics,
} from "../../types/kpi";
import { TasksTileDetail } from "./TasksTileDetail";
import { SchedulingTileDetail } from "./SchedulingTileDetail";
import { PerformanceTileDetail } from "./PerformanceTileDetail";

interface TileDetailPanelProps {
  tileId: TileId;
  tasksMetrics: TasksMetrics;
  schedulingMetrics: SchedulingMetrics;
  performanceMetrics: PerformanceMetrics;
  copilotMessages: Record<TileId, string>;
  onAutomation: (tile: TileId) => void;
  onCreateTask: () => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export function TileDetailPanel({
  tileId,
  tasksMetrics,
  schedulingMetrics,
  performanceMetrics,
  copilotMessages,
  onAutomation,
  onCreateTask,
  onNavigate,
  onClose,
}: TileDetailPanelProps) {
  switch (tileId) {
    case "tasks":
      return (
        <TasksTileDetail
          metrics={tasksMetrics}
          copilotMessage={copilotMessages.tasks}
          onAutomation={() => onAutomation("tasks")}
          onCreateTask={onCreateTask}
          onNavigateToTasks={() => {
            onNavigate("/app/tasks");
            onClose();
          }}
        />
      );
    case "scheduling":
      return (
        <SchedulingTileDetail
          metrics={schedulingMetrics}
          copilotMessage={copilotMessages.scheduling}
          onAutomation={() => onAutomation("scheduling")}
          onNavigateToScheduling={() => {
            onNavigate("/app/enhanced-scheduling");
            onClose();
          }}
          onNavigateToTimeOff={() => {
            onNavigate("/app/enhanced-scheduling?panel=timeoff");
            onClose();
          }}
        />
      );
    case "performance":
      return (
        <PerformanceTileDetail
          metrics={performanceMetrics}
          copilotMessage={copilotMessages.performance}
          onAutomation={() => onAutomation("performance")}
          onNavigateToPerformance={() => {
            onNavigate("/app/performance");
            onClose();
          }}
          onNavigateToRecognition={() => {
            onNavigate("/app/recognition");
            onClose();
          }}
        />
      );
  }
}
