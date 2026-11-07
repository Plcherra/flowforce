import { useTranslation } from "react-i18next";
import { AccountCluster } from "@/app-shell/layout/AccountCluster";
import { WorkspaceCommandPalette } from "@/app-shell/layout/WorkspaceCommandPalette";
import { useCompany } from "@/hooks/useCompany";

export function TopNavbar() {
  const { t } = useTranslation();
  const { company } = useCompany();
  const logoUrl = company?.id === "demo-company" ? "" : company?.logo_url || "";
  return (
    <div className="grid w-full flex-1 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
      <AccountCluster />
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={t("shell.companyLogo")}
          data-testid="header-company-logo"
          className="mx-auto h-8 max-w-[10rem] object-contain"
        />
      ) : (
        <p
          data-testid="header-wordmark"
          className="truncate text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-primary"
        >
          {t("shell.flowforce")}
        </p>
      )}
      <WorkspaceCommandPalette />
    </div>
  );
}
