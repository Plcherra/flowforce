import { useTranslation } from "react-i18next";
import React from "react";
import { MessagesBoard } from "./MessagesBoard";
import { MessagesPortalContent } from "./MessagesPortalContent";
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
  const { t } = useTranslation();
  if (hideContent) {
    return <MessagesPortalContent vm={vm} />;
  }

  if (vm.loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted/20 px-4">
        <div className="rounded-3xl border bg-background px-6 py-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-xl border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">
            {t("messages.loadingYourConversations")} </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0 flex-col overflow-hidden">
      <MessagesBoard vm={vm} />
      <MessagesPortalContent vm={vm} />
    </div>
  );
}
