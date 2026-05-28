import { Link } from "@/lib/router-adapter";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  FileUser,
  Gauge,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Employee } from "@/hooks/useEmployees";
import { useHrReadiness, type HrReadiness } from "../hooks/useHrReadiness";
import { cn } from "@/lib/utils";

type ReadinessItem = {
  label: string;
  value: number | string;
  detail: string;
  href: string;
  action: string;
  icon: typeof Users;
  tone: "steady" | "watch" | "urgent";
};

interface HrReadinessPanelProps {
  companyId: string | null;
  employees: Employee[];
  loading?: boolean;
  canManageEmployees?: boolean;
  onOpenInvite: () => void;
}

const toneStyles = {
  steady: {
    item: "border-emerald-200 bg-emerald-50/45",
    icon: "bg-emerald-100 text-emerald-700",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Ready",
  },
  watch: {
    item: "border-amber-200 bg-amber-50/55",
    icon: "bg-amber-100 text-amber-700",
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    label: "Watch",
  },
  urgent: {
    item: "border-red-200 bg-red-50/60",
    icon: "bg-red-100 text-red-700",
    badge: "border-red-200 bg-red-50 text-red-700",
    label: "Fix",
  },
};

function countTone(value: number) {
  if (value > 5) return "urgent";
  if (value > 0) return "watch";
  return "steady";
}

function buildReadinessItems(readiness: HrReadiness): ReadinessItem[] {
  return [
    {
      label: "Profiles",
      value: readiness.incompleteProfiles,
      detail: "Active teammates missing core profile fields.",
      href: "/app/employees",
      action: "Complete profiles",
      icon: FileUser,
      tone: countTone(readiness.incompleteProfiles),
    },
    {
      label: "Departments",
      value: readiness.missingDepartments,
      detail: "Active teammates without department assignment.",
      href: "/app/employees",
      action: "Assign departments",
      icon: Building2,
      tone: countTone(readiness.missingDepartments),
    },
    {
      label: "Availability",
      value: readiness.missingAvailability,
      detail: "Active teammates without availability on file.",
      href: "/app/availability/manage",
      action: "Collect availability",
      icon: CalendarCheck,
      tone: countTone(readiness.missingAvailability),
    },
    {
      label: "Certifications",
      value: readiness.missingCertifications,
      detail: "Active teammates without current certifications.",
      href: "/app/certifications",
      action: "Review certs",
      icon: BadgeCheck,
      tone: countTone(readiness.missingCertifications),
    },
    {
      label: "Performance",
      value: readiness.lowReliability,
      detail: "Active teammates below reliability threshold.",
      href: "/app/performance",
      action: "Review performance",
      icon: Gauge,
      tone: countTone(readiness.lowReliability),
    },
  ];
}

function ReadinessSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-4">
          <Skeleton className="mb-4 h-9 w-9 rounded-md" />
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="mb-2 h-7 w-12" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export function HrReadinessPanel({
  companyId,
  employees,
  loading = false,
  canManageEmployees = false,
  onOpenInvite,
}: HrReadinessPanelProps) {
  const {
    data: readiness,
    isLoading,
    error,
    refetch,
  } = useHrReadiness({
    companyId,
    employees,
    enabled: !loading,
  });
  const current = readiness ?? {
    employeeCount: employees.length,
    activeEmployeeCount: employees.filter(
      (employee) =>
        (employee.employment_status ?? "").toLowerCase() === "active",
    ).length,
    incompleteProfiles: 0,
    missingDepartments: 0,
    missingAvailability: 0,
    missingCertifications: 0,
    lowReliability: 0,
  };
  const items = buildReadinessItems(current);
  const blockers = items.reduce(
    (sum, item) => sum + (typeof item.value === "number" ? item.value : 0),
    0,
  );
  const panelLoading = loading || isLoading;

  return (
    <section
      className="space-y-4 rounded-lg border bg-background p-4"
      aria-label="Employee readiness"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">HR readiness</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Profiles, roles, departments, availability, certifications, and
            performance links for basic staff management.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            className={cn(
              "h-7 px-3",
              blockers > 0
                ? toneStyles.watch.badge
                : toneStyles.steady.badge,
            )}
          >
            {current.activeEmployeeCount} active
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "h-7 px-3",
              blockers > 0
                ? toneStyles.urgent.badge
                : toneStyles.steady.badge,
            )}
          >
            {blockers} open items
          </Badge>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>HR readiness data unavailable</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {error instanceof Error
                ? error.message
                : "Unable to load HR readiness data."}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {panelLoading ? (
        <ReadinessSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            const styles = toneStyles[item.tone];
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "group rounded-lg border p-4 transition hover:border-primary/40 hover:bg-muted/35 focus:outline-none focus:ring-2 focus:ring-ring",
                  styles.item,
                )}
              >
                <div
                  className={cn(
                    "mb-4 flex h-9 w-9 items-center justify-center rounded-md",
                    styles.icon,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {item.value}
                    </div>
                  </div>
                  <Badge variant="outline" className={styles.badge}>
                    {styles.label}
                  </Badge>
                </div>
                <p className="mt-3 min-h-10 text-sm leading-snug text-muted-foreground">
                  {item.detail}
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  {item.action}
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-muted/25 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-medium">Manager setup actions</div>
          <p className="text-sm text-muted-foreground">
            Invite staff, assign access, collect availability, and review HR
            readiness before building schedules.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageEmployees && (
            <Button type="button" onClick={onOpenInvite}>
              Invite staff
            </Button>
          )}
          <Button type="button" variant="outline" asChild>
            <Link to="/app/availability/manage">Availability</Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/app/certifications">Certifications</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
