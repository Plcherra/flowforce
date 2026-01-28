import React from "react";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Sparkles } from "lucide-react";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesWorkspaceHeaderProps {
  vm: MessagesViewModel;
  helpDeskActive: boolean;
  onHelpDeskToggle: () => void;
}

export function MessagesWorkspaceHeader({
  vm,
  helpDeskActive,
  onHelpDeskToggle,
}: MessagesWorkspaceHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl border bg-background/95 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Flow
        </div>
        <h1 className="mt-2 text-2xl font-semibold">Communication Workbench</h1>
        <p className="text-sm text-muted-foreground">
          Minimal board for channels, direct messages, announcements, and
          support.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size={vm.isMobile ? "sm" : "default"}
          onClick={() => vm.setShowDirectMessageDialog(true)}
        >
          Start DM
        </Button>
        <Button
          size={vm.isMobile ? "sm" : "default"}
          onClick={() => vm.setShowCreateDialog(true)}
        >
          New Channel
        </Button>
        <Button
          size={vm.isMobile ? "sm" : "default"}
          variant={helpDeskActive ? "default" : "outline"}
          className="gap-2"
          onClick={onHelpDeskToggle}
        >
          <LifeBuoy className="h-4 w-4" />
          Help Desk
        </Button>
      </div>
    </div>
  );
}
