import React from 'react';
import { MessagesShell } from '@/features/messages/components/layout';
import { useMessagesViewModel } from '@/features/messages/hooks/useMessagesViewModel';
import { useCommunicationBootstrap } from '@/hooks/useCommunicationBootstrap';
import { PageLoader } from '@/components/common/PageLoader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyStateCard } from '@/components/common/EmptyStateCard';
import { MessageCircle } from 'lucide-react';

export default function Messages() {
  const bootstrap = useCommunicationBootstrap();

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

  const viewModel = useMessagesViewModel();
  const organizationId = bootstrap.organization?.id ?? null;
  const organizationName = bootstrap.organization?.name ?? null;

  if (viewModel.loading) {
    return <PageLoader text="Preparing conversations..." />;
  }

  if (viewModel.channels.length === 0) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="No channels found"
          description="Create your first channel to start collaborating with the team."
          icon={<MessageCircle className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <MessagesShell
      viewModel={viewModel}
      organizationId={organizationId}
      organizationName={organizationName ?? undefined}
    />
  );
}
