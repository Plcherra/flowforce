import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

interface ProfileCardProps {
  className?: string;
}

export default function ProfileCard({ className }: ProfileCardProps = {}) {
  const { profile, loading, error } = useProfile();
  const { getDisplayRole } = usePermissions();
  const { t } = useTranslation();

  // Memoize expensive calculations
  const displayRole = useMemo(() => getDisplayRole(), [getDisplayRole]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            {t("dashboard.profile.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            {t("dashboard.profile.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Unable to load profile</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-lg">
          <User className="mr-2 h-5 w-5" />
          {t("dashboard.profile.title")}
        </CardTitle>
        <CardDescription>{t("dashboard.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm font-medium">
            {t("dashboard.profile.position")}:
          </span>
          <span className="text-sm text-muted-foreground">{displayRole}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium">
            {t("dashboard.profile.employeeId")}:
          </span>
          <span className="text-sm text-muted-foreground">
            {profile?.employee_id || "N/A"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium">
            {t("dashboard.profile.department")}:
          </span>
          <span className="text-sm text-muted-foreground">
            {profile?.department_id
              ? t("dashboard.profile.assigned")
              : t("dashboard.profile.unassigned")}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium">
            {t("dashboard.profile.employmentStatus")}:
          </span>
          <Badge
            variant={
              profile?.employment_status === "active" ? "default" : "secondary"
            }
            className="text-xs"
          >
            {profile?.employment_status || "active"}
          </Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-medium">
            {t("dashboard.profile.hireDate")}:
          </span>
          <span className="text-sm text-muted-foreground">
            {profile?.hire_date
              ? new Date(profile.hire_date).toLocaleDateString()
              : t("dashboard.profile.notSet")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
