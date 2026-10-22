import { useSearchParams } from "@/lib/router-adapter";
import RoleGuard from "@/app-shell/guards/RoleGuard";
import UserManagement from "@/features/admin/components/UserManagement";
import AuditLog from "@/features/admin/components/AuditLog";
import AdminTabs from "@/features/admin/components/AdminTabs";
import RoleConfigurationTab from "@/features/roles/components/RoleConfigurationTab";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";

export default function Admin() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const auditEnabled = useFeatureFlag("admin.auditLogs");
  const tabFromUrl = searchParams.get("tab") ?? "users";
  const activeTab =
    !auditEnabled && tabFromUrl === "audit" ? "users" : tabFromUrl;
  const { t } = useTranslation();

  const setActiveTab = (tab: string) => {
    if (tab === activeTab) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    });
  };

  return (
    <RoleGuard
      permission="manageUsers"
      fallback={
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {t("admin.accessDenied")}
          </h1>
          <p className="text-muted-foreground">{t("admin.noPermission")}</p>
        </div>
      }
    >
      <div className={`${isMobile ? "p-4" : "p-8"}`}>
        <div className={`${isMobile ? "mb-4" : "mb-8"}`}>
          <h1
            className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold text-foreground mb-2`}
          >
            {t("admin.title")}
          </h1>
          <p className="text-muted-foreground">{t("admin.description")}</p>
        </div>

        <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className={isMobile ? "mt-4" : "mt-8"}>
          {activeTab === "users" && <UserManagement />}
          {activeTab === "roles" && <RoleConfigurationTab />}
          {auditEnabled && activeTab === "audit" && <AuditLog />}
        </div>
      </div>
    </RoleGuard>
  );
}
