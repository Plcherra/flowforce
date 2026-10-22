import { useTranslation } from "react-i18next";
import { lazy, Suspense } from "react";
import {
  ArrowRightLeft,
  Bell,
  Calendar,
  Clock,
  ScrollText,
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
const TimeOffPoliciesSection = lazy(() =>
  import("./TimeOffPoliciesSection").then((m) => ({
    default: m.TimeOffPoliciesSection,
  })),
);

const panelIcons: Record<SchedulingPanelId, typeof Users> = {
  staff: Users,
  availability: Clock,
  timeoff: Calendar,
  swaps: ArrowRightLeft,
  workflow: Bell,
  "company-policies": ScrollText,
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
  const { t } = useTranslation();
  const fullWidthAvailability = panel === "availability";
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
              : panel === "company-policies"
                ? t("schedule.companyPolicies")
                : (panelMeta?.label ?? "Scheduling");
  const panelDescription =
    panel === "availability"
      ? availabilityIsTeam
        ? "Availability choice and change requests for other people. Your own hours stay under My availability."
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
              : panel === "company-policies"
                ? t("schedule.companyPoliciesDescription")
                : panelMeta?.description;

  return (
    <Sheet open={panel !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        data-testid="scheduling-panel-sheet"
        data-panel-width={fullWidthAvailability ? "full" : "narrow"}
        className={`w-full overflow-y-auto p-4 sm:p-6 ${
          fullWidthAvailability ? "sm:max-w-none" : "sm:max-w-2xl"
        }`}
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
              title={t("schedule.teamRequestsNeedALiveConnection")}
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
              title={t("schedule.teamRequestsAreLimited")}
              description="Approving other people's swaps and time off needs schedule or approval permission. Your own requests stay under My time off and My swaps."
            />
          )
        ) : null}

        {panel === "availability" ? (
          advancedFeaturesDisabled ? (
            <FeatureUnavailableCard
              icon={Clock}
              title={t("schedule.availabilityPreviewMode")}
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
                <TabsTrigger value="personal">{t("schedule.myHours")}</TabsTrigger>
                <TabsTrigger value="team">{t("schedule.teamHours")}</TabsTrigger>
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
              title={t("schedule.timeOffUnavailable")}
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
              title={t("schedule.shiftSwapsUnavailable")}
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

        {panel === "company-policies" ? (
          role.canApproveRequests ? (
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <TimeOffPoliciesSection canManage />
            </Suspense>
          ) : (
            <FeatureUnavailableCard
              icon={ScrollText}
              title={t("schedule.companyPoliciesAreLimited")}
              description={t("schedule.companyPoliciesNeedApprovalAccess")}
            />
          )
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
