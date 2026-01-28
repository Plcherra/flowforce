/**
 * Hook for drag and drop handlers in scheduling calendar
 */

import { useCallback } from "react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { ShiftTemplate } from "@/components/scheduling/drag-drop/types";
import type { VendorPaletteItem } from "@/components/scheduling/drag-drop/types";
import type { PendingVendorEvent } from "@/components/scheduling/drag-drop/types";

interface UseDragDropHandlersProps {
  draggedTemplate: ShiftTemplate | null;
  draggedVendor: VendorPaletteItem | null;
  setDraggedTemplate: (template: ShiftTemplate | null) => void;
  setDraggedVendor: (vendor: VendorPaletteItem | null) => void;
  createSchedule: (payload: {
    title: string;
    role: string | null;
    color: string | null;
    start_time: string;
    end_time: string;
    location: string;
    is_all_day: boolean;
    timezone: string;
    required_headcount: number;
    notes: string | null;
    break_minutes: number;
    hourly_rate: number | null;
    is_published: boolean;
    is_template: boolean;
    template_id: string | null;
    position_id: string | null;
    status: string;
    user_id: string | null;
    requirements: unknown[];
  }) => Promise<unknown>;
  assign: (
    shiftId: string,
    userId: string,
    status?: string,
  ) => Promise<boolean>;
  refetchAll: () => Promise<void>;
  setPendingVendorEvent: (event: PendingVendorEvent | null) => void;
  setVendorModalOpen: (open: boolean) => void;
  setDraggedTemplate: (template: ShiftTemplate | null) => void;
  setDraggedVendor: (vendor: VendorPaletteItem | null) => void;
  locationFilter?: string;
}

export function useDragDropHandlers({
  draggedTemplate,
  draggedVendor,
  createSchedule,
  assign,
  refetchAll,
  setPendingVendorEvent,
  setVendorModalOpen,
  setDraggedTemplate,
  setDraggedVendor,
  locationFilter,
}: UseDragDropHandlersProps) {
  const { toast } = useToast();

  const handleTemplateDragStart = useCallback(
    (e: React.DragEvent, template: ShiftTemplate) => {
      setDraggedVendor(null);
      setDraggedTemplate(template);
      e.dataTransfer.effectAllowed = "copy";
    },
    [setDraggedTemplate, setDraggedVendor],
  );

  const handleVendorDragStart = useCallback(
    (e: React.DragEvent, vendor: VendorPaletteItem) => {
      setDraggedTemplate(null);
      setDraggedVendor(vendor);
      e.dataTransfer.effectAllowed = "copy";
    },
    [setDraggedTemplate, setDraggedVendor],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDropOnUserDay = useCallback(
    async (event: React.DragEvent, day: Date, userId: string) => {
      event.preventDefault();

      if (draggedTemplate) {
        const startHour = Number.parseInt(
          draggedTemplate.startTime.split(":")[0] ?? "9",
          10,
        );
        const endHour = Number.parseInt(
          draggedTemplate.endTime.split(":")[0] ?? "17",
          10,
        );
        const startTime = new Date(day);
        startTime.setHours(startHour, 0, 0, 0);
        const endTime = new Date(day);
        endTime.setHours(endHour, 0, 0, 0);

        try {
          const newSchedule = await createSchedule({
            title: draggedTemplate.name,
            role: draggedTemplate.role,
            color: draggedTemplate.color,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            location: locationFilter ?? "",
            is_all_day: false,
            timezone: "UTC",
            required_headcount: draggedTemplate.minStaff,
            notes: null,
            break_minutes: 30,
            hourly_rate: 15.0,
            is_published: false,
            is_template: false,
            template_id: null,
            position_id: null,
            status: "scheduled",
            user_id: null,
            requirements: [],
          });

          if (
            !newSchedule ||
            typeof newSchedule !== "object" ||
            !("id" in newSchedule)
          ) {
            throw new Error("Failed to create shift");
          }

          const scheduleId = (newSchedule as { id: string }).id;
          await assign(scheduleId, userId, "assigned");
          await refetchAll();
          toast({
            title: "Shift created and assigned!",
            description: `${draggedTemplate.name} assigned to ${format(day, "EEE, MMM d")}`,
          });
        } catch (error) {
          toast({
            title: "Error creating shift",
            description:
              error instanceof Error ? error.message : "Please try again",
            variant: "destructive",
          });
        } finally {
          setDraggedTemplate(null);
        }
        return;
      }

      if (draggedVendor) {
        const startTime = new Date(day);
        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(
          startTime.getHours() + draggedVendor.defaultDurationHours,
        );
        setPendingVendorEvent({
          vendor: draggedVendor,
          start: startTime,
          end: endTime,
        });
        setVendorModalOpen(true);
        setDraggedVendor(null);
      }
    },
    [
      assign,
      createSchedule,
      draggedTemplate,
      draggedVendor,
      locationFilter,
      refetchAll,
      setDraggedTemplate,
      setDraggedVendor,
      setPendingVendorEvent,
      setVendorModalOpen,
      toast,
    ],
  );

  const handleUnassignedDrop = useCallback(
    async (event: React.DragEvent, day: Date) => {
      event.preventDefault();

      if (draggedTemplate) {
        const startHour = Number.parseInt(
          draggedTemplate.startTime.split(":")[0] ?? "9",
          10,
        );
        const endHour = Number.parseInt(
          draggedTemplate.endTime.split(":")[0] ?? "17",
          10,
        );
        const startTime = new Date(day);
        startTime.setHours(startHour, 0, 0, 0);
        const endTime = new Date(day);
        endTime.setHours(endHour, 0, 0, 0);

        try {
          const newSchedule = await createSchedule({
            title: draggedTemplate.name,
            role: draggedTemplate.role,
            color: draggedTemplate.color,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            location: locationFilter ?? "",
            is_all_day: false,
            timezone: "UTC",
            required_headcount: draggedTemplate.minStaff,
            notes: null,
            break_minutes: 30,
            hourly_rate: 15.0,
            is_published: false,
            is_template: false,
            template_id: null,
            position_id: null,
            status: "scheduled",
            user_id: null,
            requirements: [],
          });

          if (
            !newSchedule ||
            typeof newSchedule !== "object" ||
            !("id" in newSchedule)
          ) {
            throw new Error("Failed to create shift");
          }

          await refetchAll();
          toast({
            title: "Shift created!",
            description: `${draggedTemplate.name} added to ${format(day, "EEE, MMM d")}`,
          });
        } catch (error) {
          toast({
            title: "Error creating shift",
            description:
              error instanceof Error ? error.message : "Please try again",
            variant: "destructive",
          });
        } finally {
          setDraggedTemplate(null);
        }
        return;
      }

      if (draggedVendor) {
        const startTime = new Date(day);
        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setHours(
          startTime.getHours() + draggedVendor.defaultDurationHours,
        );
        setPendingVendorEvent({
          vendor: draggedVendor,
          start: startTime,
          end: endTime,
        });
        setVendorModalOpen(true);
        setDraggedVendor(null);
      }
    },
    [
      createSchedule,
      draggedTemplate,
      draggedVendor,
      locationFilter,
      refetchAll,
      setDraggedTemplate,
      setDraggedVendor,
      setPendingVendorEvent,
      setVendorModalOpen,
      toast,
    ],
  );

  const handleBoardDrop = useCallback(
    (event: React.DragEvent, day: Date, employeeId?: string) => {
      if (employeeId) {
        void handleDropOnUserDay(event, day, employeeId);
      } else {
        void handleUnassignedDrop(event, day);
      }
    },
    [handleDropOnUserDay, handleUnassignedDrop],
  );

  return {
    handleTemplateDragStart,
    handleVendorDragStart,
    handleDragOver,
    handleDropOnUserDay,
    handleUnassignedDrop,
    handleBoardDrop,
  };
}
