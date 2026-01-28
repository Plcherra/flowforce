import React from "react";
import { MessagesShell } from "@/features/messages/components/layout";
import { useMessagesViewModel } from "@/features/messages/hooks/useMessagesViewModel";
import { safeArrayLength } from "@/utils/reactQueryTypes";
import { useCommunicationBootstrap } from "@/hooks/useCommunicationBootstrap";
import { PageLoader } from "@/components/common/PageLoader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/ui/error-boundary";
import { MessagesErrorFallback } from "@/components/ui/feature-error-fallbacks";

export default function Messages() {
  const bootstrap = useCommunicationBootstrap();
  const viewModel = useMessagesViewModel();
  const organizationId = bootstrap.organization?.id ?? null;
  const organizationName = bootstrap.organization?.name ?? null;

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text="Loading your workspace..." />;
  }

  if (!bootstrap.ready) {
    return (
      <EmptyStateCard
        title="Waiting on workspace data"
        description="We need your organization and employee roster before enabling messaging."
        icon={<MessageCircle className="h-5 w-5" />}
      />
    );
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load workspace data</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (viewModel.loading) {
    return <PageLoader text="Preparing conversations..." />;
  }

  if (safeArrayLength(viewModel.channels) === 0) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="No channels found"
          description="Create your first channel to start collaborating with the team."
          icon={<MessageCircle className="h-5 w-5" />}
          action={
            <Button onClick={() => viewModel.setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Channel
            </Button>
          }
        />
        {/* Render dialogs even in empty state so create channel works */}
        <ErrorBoundary fallbackRender={MessagesErrorFallback}>
          <MessagesShell
            viewModel={viewModel}
            organizationId={organizationId}
            organizationName={organizationName ?? undefined}
            hideContent={true}
          />
        </ErrorBoundary>
      </div>
    );
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
