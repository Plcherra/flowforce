import { useTranslation } from "react-i18next";
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
import { useSchedulingRole } from "@/features/scheduling/hooks/useSchedulingRole";
import { useAvailabilityManagement } from "@/features/availability/manage/useAvailabilityManagement";
import { RequestsQueue } from "@/features/availability/manage/RequestsQueue";
import { DEFAULT_ORG_ID } from "@/features/availability/utils/lockEngine";
import { AvailabilityChoiceEditor } from "@/features/scheduling/components/availability/AvailabilityChoiceEditor";
import { TeamHoursPermissionMatrix } from "@/features/scheduling/components/availability/TeamHoursPermissionMatrix";
import { isMissingRelationError } from "@/utils/supabaseErrors";

interface TeamAvailabilityPanelProps {
  className?: string;
}

export function TeamAvailabilityPanel({
  className,
}: TeamAvailabilityPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const {
    loading: schedulingLoading,
    refetchAll,
    isFallbackData,
  } = useScheduling();

  const schedulingRole = useSchedulingRole();
  const orgId = profile?.companyId ?? profile?.company_id ?? DEFAULT_ORG_ID;
  const canManageAvailability = schedulingRole.canManageAvailability;
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
    queriesEnabled && isMissingRelationError(orgPrefsError as any, "org_prefs");
  const missingAvailabilityRequest =
    queriesEnabled &&
    isMissingRelationError(requestsError as any, "availability_request");
  const missingAvailabilityTable =
    queriesEnabled &&
    isMissingRelationError(exceptionsError as any, "availability_exception");
  const missingStaffAvailability =
    queriesEnabled &&
    isMissingRelationError(exceptionsError as any, "staff_availability");

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
          <CardTitle>{t("schedule.teamAvailabilityControls")}</CardTitle>
          <CardDescription>
            {t("schedule.connectYourSupabaseTablesToUnlockOrganizationWide")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40 bg-primary/5 text-primary">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>{t("schedule.previewMode")}</AlertTitle>
            <AlertDescription>
              {t("schedule.managersWillBeAbleToManageLocksApprove")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (profileLoading || schedulingLoading || schedulingRole.isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-10">
          <LoadingSpinner text={t("schedule.loadingAvailabilityManagement")} />
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
            <AlertTitle>{t("schedule.profileNotFound")}</AlertTitle>
            <AlertDescription>
              {t("schedule.couldNotLoadProfileDetails")}
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
            <AlertTitle>{t("schedule.organizationContextMissing")}</AlertTitle>
            <AlertDescription>
              {t("schedule.flowforceNeedsAnActiveCompanyToManageAvailability")}
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
          <CardTitle>{t("schedule.teamAvailabilityControls")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <AlertTitle>{t("schedule.schedulePermissionRequired")}</AlertTitle>
            <AlertDescription>
              {t("schedule.teamHoursAreForPeopleAllowedToBuild")}
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
          <LoadingSpinner text={t("schedule.loadingAvailabilityData")} />
        </CardContent>
      </Card>
    );
  }

  if (missingOrgPrefs) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t("schedule.teamAvailabilityControls")}</CardTitle>
          <CardDescription>
            {t("schedule.initializeOrganizationPreferencesToStartManagingAvailability")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <AlertTitle>{t("schedule.availabilitySettingsNeedSetup")}</AlertTitle>
            <AlertDescription className="text-sm text-primary/90">
              {t("schedule.couldNotFindLockPreferences")}
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={management.updateLockSettings}
              disabled={management.updateLockSettingsPending}
            >
              {management.updateLockSettingsPending
                ? t("schedule.initializing")
                : t("schedule.createDefaultSettings")}
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
          <CardTitle>{t("schedule.teamAvailabilityControls")}</CardTitle>
          <CardDescription>
            {t("schedule.provisionTheAvailabilityTablesToUnlockApprovalWorkflows")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-primary/40">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <AlertTitle>{t("schedule.databaseTablesMissing")}</AlertTitle>
            <AlertDescription className="text-sm text-primary/90">
              {t("schedule.makeSureMigrationsFor")} <code>{t("schedule.availabilityRequest")}</code>,{" "}
              <code>{t("schedule.availabilityException")}</code>, {t("schedule.and")}{" "}
              <code>{t("schedule.staffAvailability")}</code> {t("schedule.areAppliedBeforeManagingTeamAvailability")}
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
            <AlertTitle>{t("schedule.somethingWentWrong")}</AlertTitle>
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
        <CardTitle>{t("schedule.teamAvailabilityControls")}</CardTitle>
        <CardDescription>
          {t("schedule.availabilityChoiceAndChangeRequestsForOtherPeople")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <AvailabilityChoiceEditor orgId={orgId} />
        <TeamHoursPermissionMatrix orgId={orgId} />

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
