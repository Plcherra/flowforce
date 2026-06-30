import React from "react";
import { MessagesMobileLayout } from "./MessagesMobileLayout";
import { MessagesDesktopLayout } from "./MessagesDesktopLayout";
import { MessagesPortalContent } from "./MessagesPortalContent";
import { MessagesWorkspaceHeader } from "./MessagesWorkspaceHeader";
import { CommunicationReadinessPanel } from "@/features/messages/components/CommunicationReadinessPanel";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesShellProps {
  viewModel: MessagesViewModel;
  organizationId?: string | null;
  organizationName?: string | null;
  hideContent?: boolean;
}

export function MessagesShell({
  viewModel: vm,
  hideContent = false,
}: MessagesShellProps) {
  if (hideContent) {
    return <MessagesPortalContent vm={vm} />;
  }

  if (vm.loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 px-4">
        <div className="rounded-3xl border bg-background px-6 py-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-xl border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">
            Loading your conversations…
          </p>
        </div>
      </div>
    );
  }

  if (vm.isMobile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-6">
        <div className="space-y-4">
          <MessagesWorkspaceHeader vm={vm} />
          <CommunicationReadinessPanel
            channels={vm.channels}
            messages={vm.messages}
            userId={vm.profile?.id ?? null}
            onCreateChannel={() => vm.setShowCreateDialog(true)}
            onCreateAnnouncement={() => vm.setShowCreateAnnouncement(true)}
          />
          <div className="rounded-3xl border bg-background/95 shadow-sm">
            <MessagesMobileLayout vm={vm} />
          </div>
        </div>
        <MessagesPortalContent vm={vm} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-0">
        <MessagesWorkspaceHeader vm={vm} />
        <CommunicationReadinessPanel
          channels={vm.channels}
          messages={vm.messages}
          userId={vm.profile?.id ?? null}
          onCreateChannel={() => vm.setShowCreateDialog(true)}
          onCreateAnnouncement={() => vm.setShowCreateAnnouncement(true)}
        />

        <MessagesDesktopLayout vm={vm} />
      </div>

      <MessagesPortalContent vm={vm} />
    </div>
  );
}
