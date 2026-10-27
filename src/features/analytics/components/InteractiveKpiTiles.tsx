import { useTranslation } from "react-i18next";
import React, { useState } from "react";
import { useNavigate } from "@/lib/router-adapter";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useEmployeePerformance } from "@/hooks/useAnalytics";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreateTaskDialog } from "@/features/tasks/components/CreateTaskDialog";
import { useCan } from "@/hooks/useCan";
import { taskCreateLevel } from "@/features/tasks/utils/taskCreateLevel";
import {
  taskCreateDialogProps,
  taskCreateKeysAreSet,
} from "@/features/tasks/utils/taskCreateAccess";
import { useTaskAssigneeScope } from "@/features/tasks/hooks/useTaskAssigneeScope";
import { useKpiMetrics } from "@/features/analytics/hooks/useKpiMetrics";
import { useKpiTiles } from "@/features/analytics/hooks/useKpiTiles";
import { KpiTile, TileDetailPanel } from "@/features/analytics/components/kpi";
import type { TileId } from "@/features/analytics/types/kpi";

export default function InteractiveKpiTiles() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { tasks, loading: tasksLoading } = useTasks();
  const { stats: schedulingStats, loading: schedulingLoading } =
    useDashboardData();
  const { data: performanceData, isLoading: performanceLoading } =
    useEmployeePerformance();

  const [activeTile, setActiveTile] = useState<TileId | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const { can, getSource, isLoading: permissionsLoading } = useCan();
  const assigneeScope = useTaskAssigneeScope();
  const createDialog = taskCreateDialogProps({
    permissionsLoading,
    level: taskCreateLevel({
      createOthers: can("tasks.custom.create_others"),
      createSelf: can("tasks.custom.create_self"),
      legacyEdit: can("editTasks"),
      keysSet: taskCreateKeysAreSet("custom", getSource),
    }),
    scope: assigneeScope,
  });

  const isLoading =
    tasksLoading || schedulingLoading || performanceLoading;

  const metrics = useKpiMetrics({
    tasks,
    schedulingStats,
    performanceData,
  });

  const { tiles, tileMap, copilotMessages, automationMessages } = useKpiTiles({
    tasksMetrics: metrics.tasksMetrics,
    schedulingMetrics: metrics.schedulingMetrics,
    performanceMetrics: metrics.performanceMetrics,
  });

  const activeTileDescriptor = activeTile ? tileMap[activeTile] : undefined;
  const ActiveTileIcon = activeTileDescriptor?.icon;

  const triggerCopilotAutomation = (tile: TileId) => {
    toast({
      title: "Co-Pilot automation queued",
      description: automationMessages[tile],
    });
  };

  return (
    <>
      <div
        className={cn(
          "grid gap-4",
          isMobile
            ? "grid-cols-1"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        )}
      >
        {isLoading
          ? Array.from({ length: isMobile ? 2 : 3 }).map((_, index) => (
              <Card
                key={`kpi-skeleton-${index}`}
                className="border-border/60 bg-muted/40"
              >
                <CardContent className="space-y-4 p-6">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </CardContent>
              </Card>
            ))
          : tiles.map((tile) => (
              <KpiTile
                key={tile.id}
                tile={tile}
                onClick={() => setActiveTile(tile.id)}
              />
            ))}
      </div>

      <Sheet
        open={Boolean(activeTile)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTile(null);
          }
        }}
      >
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("w-full", isMobile ? "h-[85vh]" : "sm:max-w-xl")}
        >
          {activeTile && (
            <>
              <SheetHeader className="space-y-2 text-left">
                <SheetTitle className="flex items-center gap-2">
                  {ActiveTileIcon ? (
                    <ActiveTileIcon className="h-5 w-5 text-primary" />
                  ) : null}
                  {activeTileDescriptor?.title ?? "Interactive insight"}
                </SheetTitle>
                <SheetDescription>
                  {t("analytics.poweredByCoPilotDrillIntoRealtimeMetricsAndTriggerTheRightNextAction")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 overflow-y-auto pb-10 pr-1">
                <TileDetailPanel
                  tileId={activeTile}
                  tasksMetrics={metrics.tasksMetrics}
                  schedulingMetrics={metrics.schedulingMetrics}
                  performanceMetrics={metrics.performanceMetrics}
                  copilotMessages={copilotMessages}
                  onAutomation={triggerCopilotAutomation}
                  onCreateTask={() => {
                    if (createDialog) setShowTaskDialog(true);
                  }}
                  canCreateTask={Boolean(createDialog)}
                  onNavigate={(path) => navigate(path)}
                  onClose={() => setActiveTile(null)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {createDialog ? (
        <CreateTaskDialog
          open={showTaskDialog}
          onClose={() => setShowTaskDialog(false)}
          createLevel={createDialog.createLevel}
          scope={createDialog.scope}
        />
      ) : null}
    </>
  );
}
