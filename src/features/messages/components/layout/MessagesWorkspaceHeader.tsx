import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesWorkspaceHeaderProps {
  vm: MessagesViewModel;
}

export function MessagesWorkspaceHeader({ vm }: MessagesWorkspaceHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 rounded-3xl border bg-background/95 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.4em] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          {t("messages.flow")} </div>
        <h1 className="mt-2 text-2xl font-semibold">{t("messages.communicationWorkbench")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("messages.minimalBoardForChannelsDirectMessagesAndAnnouncements")} </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size={vm.isMobile ? "sm" : "default"}
          onClick={() => vm.setShowDirectMessageDialog(true)}
        >
          {t("messages.startDm")} </Button>
        <Button
          size={vm.isMobile ? "sm" : "default"}
          onClick={() => vm.setShowCreateDialog(true)}
        >
          {t("messages.newChannel")} </Button>
      </div>
    </div>
  );
}
