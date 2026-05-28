import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpDeskPanel } from "@/features/messages/components/helpdesk/HelpDeskPanel";
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
  hideContent?: boolean; // When true, only render dialogs/modals, not main content
}

export function MessagesShell({
  viewModel: vm,
  organizationId,
  organizationName,
  hideContent = false,
}: MessagesShellProps) {
  const [helpDeskOpen, setHelpDeskOpen] = useState(
    vm.activeFilter === "helpdesk",
  );

  // Always call hooks unconditionally (before any early returns)
  useEffect(() => {
    if (vm.activeFilter === "helpdesk") {
      setHelpDeskOpen(true);
    }
  }, [vm.activeFilter]);

  // If hideContent is true, only render dialogs/modals
  if (hideContent) {
    return <MessagesPortalContent vm={vm} />;
  }

  const handleHelpDeskToggle = () => {
    setHelpDeskOpen((prev) => {
      const next = !prev;
      if (next) {
        vm.setActiveFilter("helpdesk");
      } else if (vm.activeFilter === "helpdesk") {
        vm.setActiveFilter("all");
      }
      return next;
    });
  };

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
          <MessagesWorkspaceHeader
            vm={vm}
            helpDeskActive={helpDeskOpen}
            onHelpDeskToggle={handleHelpDeskToggle}
          />
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
          <AnimatePresence>
            {helpDeskOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.25 }}
                className="rounded-3xl border bg-background/95 p-4 shadow-sm"
              >
                <HelpDeskPanel
                  companyId={organizationId}
                  organizationName={organizationName}
                  onClose={() => setHelpDeskOpen(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <MessagesPortalContent vm={vm} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/40 py-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 lg:px-0">
        <MessagesWorkspaceHeader
          vm={vm}
          helpDeskActive={helpDeskOpen}
          onHelpDeskToggle={handleHelpDeskToggle}
        />
        <CommunicationReadinessPanel
          channels={vm.channels}
          messages={vm.messages}
          userId={vm.profile?.id ?? null}
          onCreateChannel={() => vm.setShowCreateDialog(true)}
          onCreateAnnouncement={() => vm.setShowCreateAnnouncement(true)}
        />

        <MessagesDesktopLayout
          vm={vm}
          helpDeskOpen={helpDeskOpen}
          onToggleHelpDesk={handleHelpDeskToggle}
          organizationId={organizationId}
          organizationName={organizationName}
        />
      </div>

      <MessagesPortalContent vm={vm} />
    </div>
  );
}
