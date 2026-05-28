import { useProfile } from "@/hooks/useProfile";
import { useRoleValidation } from "@/hooks/useRoleValidation";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

export default function DashboardHeader() {
  const { profile } = useProfile();
  const { getDisplayRole } = usePermissions();

  // Initialize role validation guardrails
  useRoleValidation();
  const { t } = useTranslation();

  // Memoize the greeting calculation to prevent unnecessary recalculations
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.greeting.morning");
    if (hour < 18) return t("dashboard.greeting.afternoon");
    return t("dashboard.greeting.evening");
  }, [t]);

  // Provide fallback display for missing profile data
  const displayName = profile?.first_name || "User";
  const displayRole = useMemo(() => getDisplayRole(), [getDisplayRole]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-normal text-gray-900 sm:text-3xl">
          {greeting}, {displayName}!
        </h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          Today&apos;s labor, inventory, task, schedule, and risk command center.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-sm">
          {displayRole}
        </Badge>
        {profile?.employee_id && (
          <Badge variant="secondary" className="text-sm">
            {profile.employee_id}
          </Badge>
        )}
      </div>
    </div>
  );
}
