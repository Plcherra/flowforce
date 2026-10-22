import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Building2,
  CreditCard,
  Globe,
  Plug,
  Shield,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorBoundary from "@/components/ui/error-boundary";
import { SystemSettingsLayout } from "../components/SystemSettingsLayout";
import { PersonalLanguageSelect } from "../components/PersonalLanguageSelect";
import { ErrorState } from "../components/ErrorState";

const GeneralSettingsPanel = lazy(async () => {
  const mod = await import("../components/GeneralSettingsPanel");
  return { default: mod.GeneralSettingsPanel };
});

const SecuritySettingsPanel = lazy(async () => {
  const mod = await import("../components/SecuritySettingsPanel");
  return { default: mod.SecuritySettingsPanel };
});

const LocalizationSettingsPanel = lazy(async () => {
  const mod = await import("../components/LocalizationSettingsPanel");
  return { default: mod.LocalizationSettingsPanel };
});

const NotificationSettingsPanel = lazy(async () => {
  const mod = await import("../components/NotificationSettingsPanel");
  return { default: mod.NotificationSettingsPanel };
});

const AICopilotSettingsPanel = lazy(async () => {
  const mod = await import("../components/AICopilotSettingsPanel");
  return { default: mod.AICopilotSettingsPanel };
});

const IntegrationSettingsPanel = lazy(async () => {
  const mod = await import("../components/IntegrationSettingsPanel");
  return { default: mod.IntegrationSettingsPanel };
});

const BillingSettingsPanel = lazy(async () => {
  const mod = await import("../components/BillingSettingsPanel");
  return { default: mod.BillingSettingsPanel };
});

const AdminSettingsPanel = lazy(async () => {
  const mod = await import("../components/AdminSettingsPanel");
  return { default: mod.AdminSettingsPanel };
});

const PanelFallback = () => (
  <div className="rounded-xl border border-dashed border-muted-foreground/30 p-6">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="mt-4 h-4 w-full" />
    <Skeleton className="mt-2 h-4 w-full" />
    <Skeleton className="mt-2 h-4 w-2/3" />
  </div>
);

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <SystemSettingsLayout
      tabs={[
        {
          key: "general",
          label: t("settings.tabGeneral"),
          icon: Building2,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <Suspense fallback={<PanelFallback />}>
                <GeneralSettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          key: "security",
          label: t("settings.tabSecurity"),
          icon: Shield,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <Suspense fallback={<PanelFallback />}>
                <SecuritySettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          key: "localization",
          label: t("settings.tabRegion"),
          icon: Globe,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <PersonalLanguageSelect />
              <Suspense fallback={<PanelFallback />}>
                <LocalizationSettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          key: "notifications",
          label: t("settings.tabNotifications"),
          icon: Bell,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <Suspense fallback={<PanelFallback />}>
                <NotificationSettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          key: "copilot",
          label: t("settings.tabAi"),
          icon: Sparkles,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <Suspense fallback={<PanelFallback />}>
                <AICopilotSettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          key: "integrations",
          label: t("footer.integrations"),
          icon: Plug,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <Suspense fallback={<PanelFallback />}>
                <IntegrationSettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          key: "billing",
          label: t("settings.tabBilling"),
          icon: CreditCard,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <Suspense fallback={<PanelFallback />}>
                <BillingSettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          key: "admin",
          label: t("common.admin"),
          icon: SlidersHorizontal,
          content: (
            <ErrorBoundary
              FallbackComponent={({ error }) => (
                <ErrorState message={error.message} />
              )}
            >
              <Suspense fallback={<PanelFallback />}>
                <AdminSettingsPanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
      ]}
    />
  );
}
