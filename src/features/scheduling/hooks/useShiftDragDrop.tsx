import { useCallback, useState } from "react";
import {
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useToast } from "@/hooks/use-toast";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { GridCellAvailability } from "@/types/platform";
import { moveShift } from "@/features/scheduling/services/moveShift";
import { ShiftChipOverlay } from "@/features/scheduling/components/drag-drop/ShiftChip";

interface UseShiftDragDropParams {
  enabled: boolean;
  updateSchedule: (
    id: string,
    updates: { start_time: string; end_time: string },
  ) => Promise<unknown>;
  assign: (shiftId: string, userId: string, status?: string) => Promise<boolean>;
  unassign: (shiftId: string, userId: string) => Promise<boolean>;
  refetchAll: () => Promise<void>;
  getCellAvailability?: (
    employeeId: string,
    day: Date,
  ) => GridCellAvailability | undefined;
  conflictByShiftId: Map<string, boolean>;
}

export function useShiftDragDrop({
  enabled,
  updateSchedule,
  assign,
  unassign,
  refetchAll,
  getCellAvailability,
  conflictByShiftId,
}: UseShiftDragDropParams) {
  const { toast } = useToast();
  const [activeShift, setActiveShift] = useState<ShiftWithAssignments | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      if (!enabled) return;
      const data = event.active.data.current;
      if (data?.type === "shift" && data.shift) {
        setActiveShift(data.shift as ShiftWithAssignments);
      }
    },
    [enabled],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveShift(null);

      if (!enabled) return;

      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;
      if (activeData?.type !== "shift" || overData?.type !== "cell") return;

      const shift = activeData.shift as ShiftWithAssignments;
      const sourceEmployeeId = (activeData.employeeId as string | null) ?? null;
      const targetEmployeeId = (overData.employeeId as string | null) ?? null;
      const targetDay = overData.day as Date;

      const result = await moveShift({
        shift,
        sourceEmployeeId,
        targetEmployeeId,
        targetDay,
        updateSchedule,
        assign,
        unassign,
        getCellAvailability,
      });

      if (result.noOp) return;

      if (!result.ok) {
        toast({
          title: "Cannot move shift",
          description: result.reasons[0] ?? "Move blocked by availability rules.",
          variant: "destructive",
        });
        return;
      }

      await refetchAll();

      if (result.severity === "warning") {
        toast({
          title: "Shift moved with warning",
          description: result.reasons[0] ?? "Employee has a scheduling conflict.",
        });
      } else {
        toast({
          title: "Shift moved",
          description: "Schedule updated successfully.",
        });
      }
    },
    [
      assign,
      enabled,
      getCellAvailability,
      refetchAll,
      toast,
      unassign,
      updateSchedule,
    ],
  );

  const dragOverlay =
    enabled && activeShift ? (
      <DragOverlay>
        <ShiftChipOverlay
          schedule={activeShift}
          hasConflict={conflictByShiftId.get(activeShift.id) ?? false}
        />
      </DragOverlay>
    ) : null;

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
    dragOverlay,
  };
}
