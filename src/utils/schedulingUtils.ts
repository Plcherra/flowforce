import type {
  ShiftWithAssignments,
  AssignmentWithUser,
} from "@/hooks/scheduling/useSchedulingConsolidated";

// Shared utilities for scheduling components

export const getShiftColor = (shift: ShiftWithAssignments): string => {
  if (shift.color) return shift.color;
  if (shift.job_position?.role) {
    const roleColors: Record<string, string> = {
      manager: "hsl(var(--success))",
      supervisor: "hsl(var(--warning))",
      employee: "hsl(var(--primary))",
      admin: "hsl(var(--accent))",
    };
    return roleColors[shift.job_position.role] || "hsl(var(--muted))";
  }
  return "hsl(var(--muted))";
};

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

export const extractUsersFromShifts = (
  shifts: ShiftWithAssignments[],
): Map<string, UserProfile> => {
  const userMap = new Map<string, UserProfile>();

  shifts.forEach((shift) => {
    if (shift.assignments) {
      shift.assignments.forEach((assignment: AssignmentWithUser) => {
        if (assignment.user) {
          const userId =
            assignment.user.id ||
            `${assignment.user.first_name}-${assignment.user.last_name}`;
          userMap.set(userId, {
            id: assignment.user.id || userId,
            first_name: assignment.user.first_name || "",
            last_name: assignment.user.last_name || "",
            avatar_url: assignment.user.avatar_url,
          });
        }
      });
    }
  });

  return userMap;
};

export const getHourlyUsers = (
  shifts: ShiftWithAssignments[],
  hour: number,
): UserProfile[] => {
  const hourlyUsers = new Map<string, UserProfile>();

  shifts.forEach((shift) => {
    const startHour = new Date(shift.start_time).getHours();
    const endHour = new Date(shift.end_time).getHours();

    if (hour >= startHour && hour < endHour && shift.assignments) {
      shift.assignments.forEach((assignment: AssignmentWithUser) => {
        if (assignment.user) {
          const userId =
            assignment.user.id ||
            `${assignment.user.first_name}-${assignment.user.last_name}`;
          hourlyUsers.set(userId, {
            id: assignment.user.id || userId,
            first_name: assignment.user.first_name || "",
            last_name: assignment.user.last_name || "",
            avatar_url: assignment.user.avatar_url,
          });
        }
      });
    }
  });

  return Array.from(hourlyUsers.values());
};

export interface CoverageStats {
  totalHours: number;
  totalHeadcount: number;
  requiredHeadcount: number;
  coverageRatio: number;
}

export const calculateCoverageStats = (
  shifts: ShiftWithAssignments[],
): CoverageStats => {
  const totalHours = shifts.reduce((sum, shift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  const totalHeadcount = shifts.reduce(
    (sum, shift) => sum + (shift.assignments?.length || 0),
    0,
  );

  const requiredHeadcount = shifts.reduce(
    (sum, shift) => sum + (shift.required_headcount || 1),
    0,
  );

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    totalHeadcount,
    requiredHeadcount,
    coverageRatio:
      requiredHeadcount > 0 ? totalHeadcount / requiredHeadcount : 1,
  };
};
