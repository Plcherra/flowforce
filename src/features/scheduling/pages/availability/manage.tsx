import {
  SchedulingProvider,
  useScheduling,
} from "@/contexts/SchedulingContext";
import { LockControls } from "@/features/availability/manage/LockControls";
import { RequestsQueue } from "@/features/availability/manage/RequestsQueue";
import { ExceptionsTable } from "@/features/availability/manage/ExceptionsTable";
import { useAvailabilityManagement } from "@/features/availability/manage/useAvailabilityManagement";
import { DEFAULT_ORG_ID } from "@/features/availability/utils/lockEngine";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-states";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PostgrestError } from "@supabase/supabase-js";
import { isMissingRelationError } from "@/utils/supabaseErrors";

export default function ManageAvailabilityPage() {
  return (
    <SchedulingProvider>
      <ManageAvailabilityContent />
    </SchedulingProvider>
  );
}

function ManageAvailabilityContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { loading: schedulingLoading, refetchAll } = useScheduling();

  const orgId = profile?.companyId ?? profile?.company_id ?? DEFAULT_ORG_ID;
  const resolvedRole = (profile?.role ?? "").toLowerCase();
  const canManageAvailability = [
    "manager",
    "owner",
    "company_admin",
    "admin",
  ].includes(resolvedRole);
  const hasOrgContext = Boolean(profile?.companyId ?? profile?.company_id);
  const queriesEnabled =
    canManageAvailability && hasOrgContext && !profileLoading;

  const management = useAvailabilityManagement({
    orgId,
    queriesEnabled,
    toast,
    userId: user?.id,
    refetchAll,
  });

  if (profileLoading || schedulingLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading availability management..." />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="border-destructive/40">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <AlertTitle>Profile not found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load your profile details. Refresh the page or
            contact an administrator if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasOrgContext) {
    return (
      <div className="p-6">
        <Alert className="border-primary/40">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <AlertTitle>Organization context missing</AlertTitle>
          <AlertDescription>
            FlowForce needs an active company to manage availability. Add your
            company profile or reach out to support for help.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canManageAvailability) {
    return (
      <div className="p-6">
        <Alert className="border-primary/40">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <AlertTitle>Manager access required</AlertTitle>
          <AlertDescription>
            Only managers or owners can control team availability. Ask your
            administrator for the right permissions if you believe this is a
            mistake.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const queriesLoading =
    queriesEnabled &&
    (management.employeesQuery.isLoading ||
      management.orgPrefsQuery.isLoading ||
      management.requestsQuery.isLoading ||
      management.exceptionsQuery.isLoading);

  if (queriesLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading availability data..." />
      </div>
    );
  }

  const orgPrefsError = management.orgPrefsQuery.error as
    | PostgrestError
    | undefined;
  const missingOrgPrefs =
    queriesEnabled && isMissingRelationError(orgPrefsError, "org_prefs");

  if (missingOrgPrefs) {
    return (
      <div className="p-6">
        <Alert className="border-primary/40">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <AlertTitle>
            Initialize availability preferences for your organization
          </AlertTitle>
          <AlertDescription>
            Provision the <code>org_prefs</code> table (see migration{" "}
            <code>20251023_create_org_prefs.sql</code>) to start managing
            availability settings. Once the table is in place, refresh this
            page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const queryError =
    (management.employeesQuery.error as Error | undefined) ??
    (management.orgPrefsQuery.error as Error | undefined) ??
    (management.requestsQuery.error as Error | undefined) ??
    (management.exceptionsQuery.error as Error | undefined);

  if (queriesEnabled && queryError) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="border-destructive/40">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {queryError.message ||
              "We ran into an unexpected error while loading availability data."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Availability Controls</h1>
        <p className="text-muted-foreground">
          Manage lock behaviour, approve requests, and handle availability
          exceptions for your team.
        </p>
      </header>

      {queriesEnabled && !management.orgPrefsQuery.data && (
        <Alert className="flex flex-col gap-3 border-primary/40 bg-primary/5 text-primary">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-primary" />
            <div className="space-y-1">
              <AlertTitle>Availability settings need setup</AlertTitle>
              <AlertDescription className="text-sm text-primary/90">
                We couldn&apos;t find lock preferences for this organization
                yet. Use your default selections to create the first
                configuration so your team can start submitting availability.
              </AlertDescription>
            </div>
          </div>
          <div>
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
        </Alert>
      )}

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
    </div>
  );
}
