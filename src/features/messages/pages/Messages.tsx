import { useTranslation } from "react-i18next";
import React from "react";
import { MessagesShell } from "@/features/messages/components/layout";
import { useMessagesViewModel } from "@/features/messages/hooks/useMessagesViewModel";
import { useCommunicationBootstrap } from "@/hooks/useCommunicationBootstrap";
import { PageLoader } from "@/components/common/PageLoader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ErrorBoundary from "@/components/ui/error-boundary";
import { MessagesErrorFallback } from "@/components/ui/feature-error-fallbacks";

export default function Messages() {
  const { t } = useTranslation();
  const bootstrap = useCommunicationBootstrap();
  const viewModel = useMessagesViewModel();
  const organizationId = bootstrap.organization?.id ?? null;
  const organizationName = bootstrap.organization?.name ?? null;

  // Only require user to be ready, not full bootstrap
  // Messages can work without employees/organization data
  if (!bootstrap.userReady) {
    return <PageLoader text={t("messages.loadingWorkspace")} />;
  }

  // Show error only if it's critical (not just missing employees)
  if (bootstrap.error && !bootstrap.organizationFallback && !bootstrap.employeesFallback) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>{t("messages.unableToLoadWorkspaceData")}</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (viewModel.loading) {
    return <PageLoader text={t("messages.preparingConversations")} />;
  }

  return (
    <ErrorBoundary fallbackRender={MessagesErrorFallback}>
      <MessagesShell
        viewModel={viewModel}
        organizationId={organizationId}
        organizationName={organizationName ?? undefined}
      />
    </ErrorBoundary>
  );
}
