import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorState } from "./ErrorState";
import { useSystemSettingsContext } from "../hooks/SystemSettingsContext";
import { DEFAULT_ADMIN_CONFIG } from "../hooks/systemSettingsDefaults";
import {
  getBillingPlanDefinition,
  isTrialExpired,
  resolveBillingStatus,
} from "@/services/billing/billingPlans";
import {
  BillingStatusActions,
  BillingStatusBadge,
} from "./BillingStatusBadge";

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export function BillingSettingsPanel() {
  const { settings, loading, error } = useSystemSettingsContext();
  const tenant =
    settings?.adminConfig.tenantManagement ??
    DEFAULT_ADMIN_CONFIG.tenantManagement;
  const plan = getBillingPlanDefinition(tenant?.plan);
  const status = resolveBillingStatus(tenant);
  const trialEnded =
    tenant?.billingStatus === "trial" && isTrialExpired(tenant);
  const adminDeactivated = tenant?.billingStatus === "deactivated";

  if (error) {
    return <ErrorState message={error.message} />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Workspace billing</CardTitle>
            <CardDescription>
              Your plan, seat usage, and workspace access status.
            </CardDescription>
          </div>
          <BillingStatusBadge tenant={tenant} />
        </CardHeader>
        <CardContent className="space-y-6">
          {status === "deactivated" ? (
            <Alert variant="destructive">
              <AlertTitle>
                {trialEnded
                  ? "Trial ended"
                  : adminDeactivated
                    ? "Workspace deactivated"
                    : "Access limited"}
              </AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  {trialEnded && tenant?.trialEndsAt
                    ? `Your trial ended on ${formatDate(tenant.trialEndsAt)}. Choose a plan to restore full access for managers and staff.`
                    : adminDeactivated
                      ? "This workspace was deactivated. Choose a plan to restore scheduling, inventory, tasks, messaging, and reporting."
                      : "Operational features are currently limited. Reactivating restores full access for managers and staff."}
                </p>
                {!trialEnded && !adminDeactivated ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    <li>Scheduling, tasks, and daily execution workflows</li>
                    <li>Inventory, purchasing, and waste tracking</li>
                    <li>Team messaging, updates, and checklists</li>
                    <li>Reports and cost visibility for owners</li>
                  </ul>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {status === "trial" && tenant?.trialEndsAt ? (
            <Alert>
              <AlertTitle>Trial workspace</AlertTitle>
              <AlertDescription>
                {`Your trial ends on ${formatDate(tenant.trialEndsAt)}. Upgrade before then to avoid interruption.`}
              </AlertDescription>
            </Alert>
          ) : status === "trial" ? (
            <Alert>
              <AlertTitle>Trial workspace</AlertTitle>
              <AlertDescription>
                You are on a trial plan with full pilot access.
              </AlertDescription>
            </Alert>
          ) : null}

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">Plan</dt>
              <dd className="text-base font-medium">{plan.label}</dd>
              <dd className="text-xs text-muted-foreground">{plan.description}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Seats</dt>
              <dd className="text-base font-medium">
                {loading
                  ? "…"
                  : `${tenant?.activeSeats ?? 0} / ${tenant?.maxSeats ?? plan.seatLimit}`}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Billing contact</dt>
              <dd className="text-base font-medium">
                {tenant?.billingEmail ?? tenant?.primaryOwnerEmail ?? "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Current period ends</dt>
              <dd className="text-base font-medium">
                {formatDate(tenant?.currentPeriodEndsAt)}
              </dd>
            </div>
          </dl>

          <BillingStatusActions tenant={tenant} showHelperText />
        </CardContent>
      </Card>
    </div>
  );
}
