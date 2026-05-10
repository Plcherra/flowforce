import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useScheduling } from "@/contexts/SchedulingContext";
import { useAvailabilityManagement } from "@/features/availability/manage/useAvailabilityManagement";
import { LockControls } from "@/features/availability/manage/LockControls";
import { RequestsQueue } from "@/features/availability/manage/RequestsQueue";
import { ExceptionsTable } from "@/features/availability/manage/ExceptionsTable";
import { DEFAULT_ORG_ID } from "@/features/availability/utils/lockEngine";
import { isMissingRelationError } from "@/utils/supabaseErrors";

interface TeamAvailabilityPanelProps {
  className?: string;
}

export function TeamAvailabilityPanel({
  className,
}: TeamAvailabilityPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const {
    loading: schedulingLoading,
    refetchAll,
    isFallbackData,
  } = useScheduling();

  const orgId = profile?.companyId ?? profile?.company_id ?? DEFAULT_ORG_ID;
  const resolvedRole = (profile?.role ?? "").toLowerCase();
  const canManageAvailability = [
    "manager",
    "owner",
    "company_admin",
    "admin",
  ].includes(resolvedRole);
  const hasOrgContext = Boolean(profile?.companyId ?? profile?.company_id);
  const baseQueriesEnabled =
    canManageAvailability && hasOrgContext && !profileLoading;
  const queriesEnabled = baseQueriesEnabled && !isFallbackData;

  const management = useAvailabilityManagement({
    orgId,
    queriesEnabled,
    toast,
    userId: user?.id,
    refetchAll,
  });

  const queriesLoading =
    queriesEnabled &&
    (management.employeesQuery.isLoading ||
      management.orgPrefsQuery.isLoading ||
      management.requestsQuery.isLoading ||
      management.exceptionsQuery.isLoading);

  const orgPrefsError = management.orgPrefsQuery.error;
  const requestsError = management.requestsQuery.error;
  const exceptionsError = management.exceptionsQuery.error;
  const employeesError = management.employeesQuery.error;

  const missingOrgPrefs =
    queriesEnabled && isMissingRelationError(orgPrefsError, "org_prefs");
  const missingAvailabilityRequest =
    queriesEnabled &&
    isMissingRelationError(requestsError, "availability_request");
  const missingAvailabilityTable =
    queriesEnabled &&
    isMissingRelationError(exceptionsError, "availability_exception");
  const missingStaffAvailability =
    queriesEnabled &&
    isMissingRelationError(exceptionsError, "staff_availability");

  const firstError = useMemo(() => {
    return (
      (employeesError as Error | undefined) ??
      (orgPrefsError as Error | undefined) ??
      (requestsError as Error | undefined) ??
      (exceptionsError as Error | undefined)
    );
  }, [employeesError, exceptionsError, orgPrefsError, requestsError]);

  if (isFallbackData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Team Availability Controls</CardTitle>
          <CardDescription>
            Connect your Supabase tables to unlock organization-wide
            availability management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40 bg-primary/5 text-primary">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>Preview mode</AlertTitle>
            <AlertDescription>
              Managers will be able to manage locks, approve requests, and
              handle exceptions once live scheduling data is available.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (profileLoading || schedulingLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <LoadingSpinner text="Loading availability management..." />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <Alert variant="destructive" className="border-destructive/40">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <AlertTitle>Profile not found</AlertTitle>
            <AlertDescription>
              We couldn&apos;t load your profile details. Refresh the page or
              contact an administrator if the issue persists.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!hasOrgContext) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <Alert className="border-primary/40">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <AlertTitle>Organization context missing</AlertTitle>
            <AlertDescription>
              FlowForce needs an active company to manage availability. Add
              your company profile or reach out to support for help.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!canManageAvailability) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Team Availability Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <AlertTitle>Manager access required</AlertTitle>
            <AlertDescription>
              Only managers or owners can control team availability. Ask your
              administrator for the right permissions if you believe this is a
              mistake.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (queriesLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <LoadingSpinner text="Loading availability data..." />
        </CardContent>
      </Card>
    );
  }

  if (missingOrgPrefs) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Team Availability Controls</CardTitle>
          <CardDescription>
            Initialize organization preferences to start managing availability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <AlertTitle>Availability settings need setup</AlertTitle>
            <AlertDescription className="text-sm text-primary/90">
              We couldn&apos;t find lock preferences for this organization yet.
              Use your default selections to create the first configuration so
              your team can start submitting availability.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={management.updateLockSettings}
              disabled={management.updateLockSettingsPending}
            >
              {management.updateLockSettingsPending
                ? "Initializing..."
                : "Create default settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (
    missingAvailabilityRequest ||
    missingAvailabilityTable ||
    missingStaffAvailability
  ) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Team Availability Controls</CardTitle>
          <CardDescription>
            Provision the availability tables to unlock approval workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <AlertTitle>Database tables missing</AlertTitle>
            <AlertDescription className="text-sm text-primary/90">
              Make sure migrations for <code>availability_request</code>,{" "}
              <code>availability_exception</code>, and{" "}
              <code>staff_availability</code> are applied before managing team
              availability.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (baseQueriesEnabled && firstError) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <Alert variant="destructive" className="border-destructive/40">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {firstError.message ||
                "We ran into an unexpected error while loading availability data."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Team Availability Controls</CardTitle>
        <CardDescription>
          Manage locks, approve requests, and handle exceptions for all
          locations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <LockControls
            mode={management.pendingMode}
            day={management.pendingDay}
            hour={management.pendingHour}
            onModeChange={(value) => management.setPendingMode(value)}
            onDayChange={(value) => management.setPendingDay(value)}
            onHourChange={(value) => management.setPendingHour(value)}
            onSave={management.updateLockSettings}
            saving={management.updateLockSettingsPending}
            dayOptions={management.dayOptions}
            hourOptions={management.hourOptions}
            lockStatePreview={management.lockStatePreview}
          />

          <ExceptionsTable
            employees={management.employeesQuery.data ?? []}
            exceptions={management.exceptionsQuery.data ?? []}
            form={management.exceptionForm}
            onFormChange={management.setExceptionForm}
            onSubmit={management.saveException}
            saving={management.saveExceptionPending}
            isLoading={management.exceptionsQuery.isLoading}
          />
        </div>

        <RequestsQueue
          requests={management.requestsQuery.data ?? []}
          employees={management.employeesQuery.data ?? []}
          onApprove={management.approveRequest}
          onDeny={management.denyRequest}
          mutationPending={management.requestsMutationPending}
          isLoading={management.requestsQuery.isLoading}
        />
      </CardContent>
    </Card>
  );
}
