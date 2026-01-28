import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { startOfWeek } from "date-fns";
import {
  useSchedulingConsolidated,
  type AssignmentWithUser,
  type ShiftWithAssignments,
  type TimeOffWithUser,
  type UnavailabilityWithUser,
  type VendorEventWithMetadata,
  type ProfileSummary,
} from "@/hooks/scheduling/useSchedulingConsolidated";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useShiftMutations } from "@/features/scheduling/hooks/useShiftMutations";
import { useVendorMutations } from "@/features/scheduling/hooks/useVendorMutations";
import { useTimeOffMutations } from "@/features/scheduling/hooks/useTimeOffMutations";
import { useWeekMutations } from "@/features/scheduling/hooks/useWeekMutations";
import { useAIMutations } from "@/features/scheduling/hooks/useAIMutations";
import { calculateWeekRange } from "@/features/scheduling/utils/weekHelpers";
import { extractAvailableLocations } from "@/features/scheduling/utils/locationHelpers";
import type { SchedulingMutations } from "@/features/scheduling/types/mutations";

interface SchedulingContextType {
  shifts: ShiftWithAssignments[];
  assignments: AssignmentWithUser[];
  timeOff: TimeOffWithUser[];
  unavailability: UnavailabilityWithUser[];
  vendorEvents: VendorEventWithMetadata[];
  teamMembers: ProfileSummary[];
  availableLocations: string[];
  loading: boolean;
  error: string | null;
  isFallbackData: boolean;
  refetchAll: () => Promise<void>;
  weekRange: { start: Date; end: Date };
  mutations: SchedulingMutations;
  setWeekReference: (date: Date) => void;
}

const SchedulingContext = createContext<SchedulingContextType | undefined>(
  undefined,
);

interface SchedulingProviderProps {
  children: React.ReactNode;
}

export function SchedulingProvider({ children }: SchedulingProviderProps) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();
  const fallbackActionNoticeShownRef = useRef(false);
  const [referenceDate, setReferenceDate] = useState(() =>
    startOfWeek(new Date()),
  );

  const showReadOnlyNotice = useCallback(() => {
    if (fallbackActionNoticeShownRef.current) return;
    toast({
      title: "Read-only preview mode",
      description: "Connect your data source to enable scheduling changes.",
    });
    fallbackActionNoticeShownRef.current = true;
  }, [toast]);

  const companyId = profile?.companyId ?? null;

  const weekRange = useMemo(
    () => calculateWeekRange(referenceDate),
    [referenceDate],
  );

  const setWeekReference = useCallback((date: Date) => {
    setReferenceDate((prev) => {
      const next = startOfWeek(date);
      return prev.getTime() === next.getTime() ? prev : next;
    });
  }, []);

  const {
    shifts,
    assignments,
    timeOffRequests,
    unavailability,
    vendorEvents,
    teamMembers,
    loading,
    error,
    refetchAll,
    assign: assignInternal,
    unassign: unassignInternal,
    upsertShift,
    upsertVendorEvent,
    isUsingFallbackData,
  } = useSchedulingConsolidated({
    companyId,
    start: weekRange.start,
    end: weekRange.end,
  });

  if (!isUsingFallbackData && fallbackActionNoticeShownRef.current) {
    fallbackActionNoticeShownRef.current = false;
  }

  const ensureCompanyContext = useCallback(() => {
    if (!companyId) {
      throw new Error(
        "Company context is not available for scheduling operations.",
      );
    }
  }, [companyId]);

  const shiftMutations = useShiftMutations({
    companyId,
    userId: user?.id ?? null,
    isUsingFallbackData,
    showReadOnlyNotice,
    refetchAll,
    upsertShift,
    ensureCompanyContext,
  });

  const assign = useCallback(
    async (shiftId: string, userId: string, status: string = "assigned") => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      return assignInternal(shiftId, userId, status);
    },
    [assignInternal, isUsingFallbackData, showReadOnlyNotice],
  );

  const unassign = useCallback(
    async (shiftId: string, userId: string) => {
      if (isUsingFallbackData) {
        showReadOnlyNotice();
        return false;
      }

      return unassignInternal(shiftId, userId);
    },
    [isUsingFallbackData, showReadOnlyNotice, unassignInternal],
  );

  const vendorMutations = useVendorMutations({
    companyId,
    isUsingFallbackData,
    showReadOnlyNotice,
    refetchAll,
    upsertVendorEvent,
    ensureCompanyContext,
  });

  const weekMutations = useWeekMutations({
    companyId,
    isUsingFallbackData,
    showReadOnlyNotice,
    refetchAll,
    bulkCreateShifts: shiftMutations.bulkCreateShifts,
    ensureCompanyContext,
  });

  const timeOffMutations = useTimeOffMutations({
    companyId,
    userId: user?.id ?? null,
    isUsingFallbackData,
    showReadOnlyNotice,
    refetchAll,
    teamMembers,
  });

  const aiMutations = useAIMutations({
    companyId,
    isUsingFallbackData,
    showReadOnlyNotice,
    refetchAll,
  });

  const mutations = useMemo<SchedulingMutations>(
    () => ({
      createSchedule: shiftMutations.createSchedule,
      updateSchedule: shiftMutations.updateSchedule,
      deleteSchedule: shiftMutations.deleteSchedule,
      assign,
      unassign,
      createVendorEvent: vendorMutations.createVendorEvent,
      deleteVendorEvent: vendorMutations.deleteVendorEvent,
      autoGenerateWeek: aiMutations.autoGenerateWeek,
      clearWeek: weekMutations.clearWeek,
      addUnavailability: timeOffMutations.addUnavailability,
      requestTimeOff: timeOffMutations.requestTimeOff,
      bulkCreateShifts: shiftMutations.bulkCreateShifts,
      copyWeek: weekMutations.copyWeek,
      publishWeek: weekMutations.publishWeek,
      generateRecommendations: aiMutations.generateRecommendations,
      approveTimeOff: timeOffMutations.approveTimeOff,
      upsertVendorEvent: vendorMutations.upsertVendorEvent,
    }),
    [
      aiMutations,
      assign,
      shiftMutations,
      timeOffMutations,
      unassign,
      vendorMutations,
      weekMutations,
    ],
  );

  const availableLocations = useMemo(
    () => extractAvailableLocations(shifts),
    [shifts],
  );

  const value: SchedulingContextType = {
    shifts,
    assignments,
    timeOff: timeOffRequests,
    unavailability,
    vendorEvents,
    teamMembers,
    availableLocations,
    loading,
    error,
    isFallbackData: isUsingFallbackData,
    refetchAll,
    weekRange,
    mutations,
    setWeekReference,
  };

  return (
    <SchedulingContext.Provider value={value}>
      {children}
    </SchedulingContext.Provider>
  );
}

export const useScheduling = () => {
  const context = useContext(SchedulingContext);
  if (!context) {
    throw new Error("useScheduling must be used within a SchedulingProvider");
  }
  return context;
};
