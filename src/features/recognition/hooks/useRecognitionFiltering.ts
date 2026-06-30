import { useMemo } from "react";
import { subDays } from "date-fns";
import type { Employee } from "@/hooks/useEmployees";
import type {
  RecognitionRecord,
  RecognitionSourceType,
} from "@/types/recognition";

export type RecognitionFilterKey =
  | "all"
  | "goals"
  | "tasks"
  | "training"
  | "manual";
export type RecognitionTimelineFilter = "30" | "90" | "365" | "all";

interface UseRecognitionFilteringOptions {
  recognitions: RecognitionRecord[];
  employees: Employee[];
  departmentFilter: "all" | string;
  searchTerm: string;
  timelineFilter: RecognitionTimelineFilter;
  sourceFilter?: RecognitionSourceType[];
}

export function useRecognitionFiltering({
  recognitions,
  employees,
  departmentFilter,
  searchTerm,
  timelineFilter,
  sourceFilter,
}: UseRecognitionFilteringOptions) {
  const departmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => {
      if (employee.department?.id) {
        map.set(
          employee.department.id,
          employee.department.name ?? "Unnamed department",
        );
      }
    });
    return Array.from(map.entries());
  }, [employees]);

  const departmentIdByUser = useMemo(() => {
    const map = new Map<string, string | null>();
    employees.forEach((employee) => {
      map.set(employee.id, employee.departmentid ?? null);
    });
    return map;
  }, [employees]);

  const filteredRecognitions = useMemo(() => {
    const lowered = searchTerm.toLowerCase();
    const timelineDays =
      timelineFilter === "all" ? null : Number(timelineFilter);
    const timelineCutoff = timelineDays
      ? subDays(new Date(), timelineDays)
      : null;

    return recognitions.filter((record) => {
      const details = record.reward_details;
      const source = details?.source ?? "manual";

      if (sourceFilter && !sourceFilter.includes(source)) {
        return false;
      }

      if (departmentFilter !== "all") {
        const departmentId = departmentIdByUser.get(record.user_id) ?? null;
        if (departmentId !== departmentFilter) {
          return false;
        }
      }

      if (timelineCutoff && record.awarded_at) {
        const awardedAt = new Date(record.awarded_at);
        if (Number.isNaN(awardedAt.getTime()) || awardedAt < timelineCutoff) {
          return false;
        }
      }

      if (!lowered) return true;

      const recipientName =
        `${record.recipient?.first_name ?? ""} ${record.recipient?.last_name ?? ""}`.toLowerCase();
      const creatorName =
        `${record.creator?.first_name ?? ""} ${record.creator?.last_name ?? ""}`.toLowerCase();
      const goalTitle = record.goal?.title?.toLowerCase() ?? "";
      const message = details?.message?.toLowerCase() ?? "";
      const trainingTitle = record.training?.module?.title?.toLowerCase() ?? "";

      return (
        recipientName.includes(lowered) ||
        creatorName.includes(lowered) ||
        goalTitle.includes(lowered) ||
        trainingTitle.includes(lowered) ||
        message.includes(lowered)
      );
    });
  }, [
    recognitions,
    searchTerm,
    departmentFilter,
    departmentIdByUser,
    timelineFilter,
    sourceFilter,
  ]);

  const stats = useMemo(() => {
    const recognitionByType: Record<RecognitionSourceType, number> = {
      goal_milestone: 0,
      goal_completion: 0,
      task_completion: 0,
      training_completion: 0,
      onboarding_completion: 0,
      manual: 0,
    };

    filteredRecognitions.forEach((record) => {
      const type = record.reward_details?.source ?? "manual";
      recognitionByType[type] = (recognitionByType[type] ?? 0) + 1;
    });

    const trainingCount =
      recognitionByType.training_completion +
      recognitionByType.onboarding_completion;
    const goalCount =
      recognitionByType.goal_milestone + recognitionByType.goal_completion;

    return {
      total: filteredRecognitions.length,
      goals: goalCount,
      tasks: recognitionByType.task_completion ?? 0,
      training: trainingCount,
      manual: recognitionByType.manual ?? 0,
    };
  }, [filteredRecognitions]);

  return {
    departmentOptions,
    filteredRecognitions,
    stats,
  };
}
