import { lazy, Suspense } from "react";
import {
  ArrowRightLeft,
  Calendar,
  Clock,
  Settings,
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
const TimeOffManagementPanel = lazy(() =>
  import("./TimeOffManagementPanel").then((m) => ({
    default: m.TimeOffManagementPanel,
  })),
);
const SchedulingWorkflow = lazy(() =>
  import("./SchedulingWorkflow").then((m) => ({
    default: m.SchedulingWorkflow,
  })),
);
const SchedulingNotifications = lazy(() =>
  import("./SchedulingNotifications").then((m) => ({
    default: m.SchedulingNotifications,
  })),
);

const panelIcons: Record<SchedulingPanelId, typeof Users> = {
  staff: Users,
  availability: Clock,
  timeoff: Calendar,
  swaps: ArrowRightLeft,
  workflow: Settings,
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

  const canOpenTeamAvailability =
    role.canManageAvailability && !role.isStaff;

  return (
    <Sheet open={panel !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-4 sm:max-w-2xl sm:p-6"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {panelMeta?.label ?? "Scheduling"}
          </SheetTitle>
          {panelMeta?.description ? (
            <SheetDescription>{panelMeta.description}</SheetDescription>
          ) : null}
        </SheetHeader>

        {panel === "staff" ? (
          advancedFeaturesDisabled ? (
            <FeatureUnavailableCard
              icon={Users}
              title="Staff management disabled"
              description="We need live staff data to process swaps and time-off requests."
              actionLabel="Retry data sync"
              onAction={onRetry}
              disabled={retryDisabled}
            />
          ) : role.isStaff ? null : (
            <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
              <StaffShiftManagement />
            </Suspense>
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
                <TabsTrigger value="personal">My Availability</TabsTrigger>
                <TabsTrigger value="team">Manage Availability</TabsTrigger>
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
              <TimeOffManagementPanel
                canApprove={role.canApproveRequests}
                staffOnly={role.isStaff}
              />
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
              <ShiftSwapsPanel
                canApprove={role.canApproveRequests}
                staffOnly={role.isStaff}
              />
            </Suspense>
          )
        ) : null}

        {panel === "workflow" ? (
          role.isStaff ? null : advancedFeaturesDisabled ? (
            <FeatureUnavailableCard
              icon={Settings}
              title="Automation paused"
              description="Automations and reminders resume once scheduling data is back online."
              actionLabel="Retry data sync"
              onAction={onRetry}
              disabled={retryDisabled}
            />
          ) : (
            <div className="grid gap-6">
              <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
                <SchedulingWorkflow />
              </Suspense>
              <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                <SchedulingNotifications />
              </Suspense>
            </div>
          )
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
