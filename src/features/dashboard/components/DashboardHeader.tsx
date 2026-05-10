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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {greeting}, {displayName}!
        </h1>
        <p className="text-gray-600 mt-1">{t("dashboard.welcome")}</p>
      </div>
      <div className="flex items-center space-x-2">
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
