import { lazy, Suspense } from "react";
import {
  ArrowRightLeft,
  Bell,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FeatureUnavailableCard } from "./FeatureUnavailableCard";
import type { SchedulingPanelId } from "../types/panels";
import { SCHEDULING_PANELS } from "../types/panels";
import type { SchedulingRole } from "../hooks/useSchedulingRole";

const StaffShiftManagement = lazy(() =>
  import("./StaffShiftManagement").then((m) => ({
    default: m.StaffShiftManagement,
  })),
);
const PersonalAvailabilityPanel = lazy(() =>
  import("./availability/PersonalAvailabilityPanel").then((m) => ({
    default: m.PersonalAvailabilityPanel,
  })),
);
const TeamAvailabilityPanel = lazy(() =>
  import("./availability/TeamAvailabilityPanel").then((m) => ({
    default: m.TeamAvailabilityPanel,
  })),
);
const ShiftSwapsPanel = lazy(() =>
  import("./ShiftSwapsPanel").then((m) => ({
    default: m.ShiftSwapsPanel,
  })),
);
const ScheduleRemindersPanel = lazy(() =>
  import("./ScheduleRemindersPanel").then((m) => ({
    default: m.ScheduleRemindersPanel,
  })),
);
const TimeOffRequestPanel = lazy(() =>
  import("@/features/availability/components/TimeOffRequestPanel").then((m) => ({
    default: m.TimeOffRequestPanel,
  })),
);

const panelIcons: Record<SchedulingPanelId, typeof Users> = {
  staff: Users,
  availability: Clock,
  timeoff: Calendar,
  swaps: ArrowRightLeft,
  workflow: Bell,
};

interface SchedulingPanelSheetProps {
  panel: SchedulingPanelId | null;
  availabilityView: "personal" | "team";
  advancedFeaturesDisabled: boolean;
  retryDisabled: boolean;
  role: SchedulingRole;
  onClose: () => void;
  onRetry: () => void;
  onAvailabilityViewChange: (value: string) => void;
}

export function SchedulingPanelSheet({
  panel,
  availabilityView,
  advancedFeaturesDisabled,
  retryDisabled,
  role,
  onClose,
  onRetry,
  onAvailabilityViewChange,
}: SchedulingPanelSheetProps) {
  const panelMeta = SCHEDULING_PANELS.find((entry) => entry.id === panel);
  const Icon = panel ? panelIcons[panel] : Users;

  const canOpenTeamAvailability = role.canManageAvailability;
  const availabilityIsTeam =
    canOpenTeamAvailability && availabilityView === "team";
  const panelTitle =
    panel === "availability"
      ? availabilityIsTeam
        ? "Team availability"
        : "My availability"
      : panel === "staff"
        ? "Team requests"
        : panel === "timeoff"
          ? "My time off"
          : panel === "swaps"
            ? "My swaps"
            : panel === "workflow"
              ? "Reminders"
              : (panelMeta?.label ?? "Scheduling");
  const panelDescription =
    panel === "availability"
      ? availabilityIsTeam
        ? "Locks, exceptions, and change requests for other people. Your own hours stay under My availability."
        : "The hours you can work. Saving here does not change anyone else's availability."
      : panel === "staff"
        ? "Decide the team's shift swaps and time off. This does not edit your own hours."
        : panel === "timeoff"
          ? "Request time away for yourself. Approving other people is under Team requests."
          : panel === "swaps"
            ? "Swaps you asked for or that were offered to you."
            : panel === "workflow"
              ? role.canManageSchedule
                ? "Keep your own reminders, and assign ones that staff can see but cannot change."
                : "Reminders you control for yourself. Assigned reminders stay as a manager set them."
              : panelMeta?.description;

  return (
    <Sheet open={panel !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-4 sm:max-w-2xl sm:p-6"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {panelTitle}
          </SheetTitle>
          {panelDescription ? (
            <SheetDescription>{panelDescription}</SheetDescription>
          ) : null}
        </SheetHeader>

        {panel === "staff" ? (
          advancedFeaturesDisabled ? (
            <FeatureUnavailableCard
              icon={Users}
              title="Team requests need a live connection"
              description="We need live staff data to process swaps and time-off requests."
              actionLabel="Retry data sync"
              onAction={onRetry}
              disabled={retryDisabled}
            />
          ) : role.canApproveRequests || role.canManageSchedule ? (
            <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
              <StaffShiftManagement />
            </Suspense>
          ) : (
            <FeatureUnavailableCard
              icon={Users}
              title="Team requests are limited"
              description="Approving other people's swaps and time off needs schedule or approval permission. Your own requests stay under My time off and My swaps."
            />
          )
        ) : null}

        {panel === "availability" ? (
          advancedFeaturesDisabled ? (
            <FeatureUnavailableCard
              icon={Clock}
              title="Availability preview mode"
              description="Employee availability updates are read-only until the live connection is restored."
              actionLabel="Retry data sync"
              onAction={onRetry}
              disabled={retryDisabled}
            />
          ) : canOpenTeamAvailability ? (
            <Tabs
              value={availabilityView}
              onValueChange={onAvailabilityViewChange}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal">My hours</TabsTrigger>
                <TabsTrigger value="team">Team hours</TabsTrigger>
              </TabsList>
              <TabsContent value="personal" className="mt-0">
                <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
                  <PersonalAvailabilityPanel />
                </Suspense>
              </TabsContent>
              <TabsContent value="team" className="mt-0">
                <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
                  <TeamAvailabilityPanel />
                </Suspense>
              </TabsContent>
            </Tabs>
          ) : (
            <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
              <PersonalAvailabilityPanel />
            </Suspense>
          )
        ) : null}

        {panel === "timeoff" ? (
          advancedFeaturesDisabled ? (
            <FeatureUnavailableCard
              icon={Calendar}
              title="Time off unavailable"
              description="Time off requests resume once scheduling data is back online."
              actionLabel="Retry data sync"
              onAction={onRetry}
              disabled={retryDisabled}
            />
          ) : (
            <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
              <TimeOffRequestPanel employeeId={role.profileId} />
            </Suspense>
          )
        ) : null}

        {panel === "swaps" ? (
          advancedFeaturesDisabled ? (
            <FeatureUnavailableCard
              icon={ArrowRightLeft}
              title="Shift swaps unavailable"
              description="Shift swap requests resume once scheduling data is back online."
              actionLabel="Retry data sync"
              onAction={onRetry}
              disabled={retryDisabled}
            />
          ) : (
            <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
              <ShiftSwapsPanel canApprove={false} staffOnly />
            </Suspense>
          )
        ) : null}

        {panel === "workflow" ? (
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <ScheduleRemindersPanel canAssignReminders={role.canManageSchedule} />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
