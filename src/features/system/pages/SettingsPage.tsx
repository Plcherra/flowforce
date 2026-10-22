import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Building2,
  CreditCard,
  Globe,
  Plug,
  Shield,
  Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorBoundary from "@/components/ui/error-boundary";
import { IfCan } from "@/components/permissions/IfCan";
import { SystemSettingsLayout } from "../components/SystemSettingsLayout";
import { PersonalLanguageSelect } from "../components/PersonalLanguageSelect";
import { ErrorState } from "../components/ErrorState";
import {
  SETTINGS_CONTROL_GATES,
  SETTINGS_TAB_KEYS,
  type SettingsTabKey,
} from "../utils/settingsTabs";

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

function tabLabel(key: SettingsTabKey, t: (key: string) => string) {
  switch (key) {
    case "general":
      return t("settings.tabGeneral");
    case "security":
      return t("settings.tabSecurity");
    case "localization":
      return t("settings.tabRegion");
    case "notifications":
      return t("settings.tabNotifications");
    case "copilot":
      return t("settings.tabAi");
    case "integrations":
      return t("footer.integrations");
    case "billing":
      return t("settings.tabBilling");
  }
}

function tabIcon(key: SettingsTabKey) {
  switch (key) {
    case "general":
      return Building2;
    case "security":
      return Shield;
    case "localization":
      return Globe;
    case "notifications":
      return Bell;
    case "copilot":
      return Sparkles;
    case "integrations":
      return Plug;
    case "billing":
      return CreditCard;
  }
}

export default function SettingsPage() {
  const { t } = useTranslation();
  return (
    <SystemSettingsLayout
      tabs={SETTINGS_TAB_KEYS.map((key) => ({
        key,
        label: tabLabel(key, t),
        icon: tabIcon(key),
        content: <SettingsTabContent tabKey={key} />,
      }))}
    />
  );
}

function SettingsTabContent({ tabKey }: { tabKey: SettingsTabKey }) {
  if (tabKey === "general") {
    return (
      <ErrorBoundary
        FallbackComponent={({ error }) => <ErrorState message={error.message} />}
      >
        <Suspense fallback={<PanelFallback />}>
          <GeneralSettingsPanel />
        </Suspense>
        <IfCan permission={SETTINGS_CONTROL_GATES.export.permission}>
          <Suspense fallback={<PanelFallback />}>
            <AdminSettingsPanel section="maintenance" />
          </Suspense>
        </IfCan>
      </ErrorBoundary>
    );
  }

  if (tabKey === "security") {
    return (
      <ErrorBoundary
        FallbackComponent={({ error }) => <ErrorState message={error.message} />}
      >
        <Suspense fallback={<PanelFallback />}>
          <SecuritySettingsPanel />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (tabKey === "localization") {
    return (
      <ErrorBoundary
        FallbackComponent={({ error }) => <ErrorState message={error.message} />}
      >
        <PersonalLanguageSelect />
        <Suspense fallback={<PanelFallback />}>
          <LocalizationSettingsPanel />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (tabKey === "notifications") {
    return (
      <ErrorBoundary
        FallbackComponent={({ error }) => <ErrorState message={error.message} />}
      >
        <Suspense fallback={<PanelFallback />}>
          <NotificationSettingsPanel />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (tabKey === "copilot") {
    return (
      <ErrorBoundary
        FallbackComponent={({ error }) => <ErrorState message={error.message} />}
      >
        <Suspense fallback={<PanelFallback />}>
          <AICopilotSettingsPanel />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (tabKey === "integrations") {
    return (
      <ErrorBoundary
        FallbackComponent={({ error }) => <ErrorState message={error.message} />}
      >
        <Suspense fallback={<PanelFallback />}>
          <IntegrationSettingsPanel />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={({ error }) => <ErrorState message={error.message} />}
    >
      <Suspense fallback={<PanelFallback />}>
        <BillingSettingsPanel />
      </Suspense>
      <IfCan permission={SETTINGS_CONTROL_GATES.billing.permission}>
        <Suspense fallback={<PanelFallback />}>
          <AdminSettingsPanel section="billing" />
        </Suspense>
      </IfCan>
    </ErrorBoundary>
  );
}
