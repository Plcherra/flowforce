import { useTranslation } from "react-i18next";
import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreVertical, Settings, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MessageChannel } from "@/types/messages";

interface MessagesHeaderProps {
  channel: MessageChannel;
  isChannelAdmin: boolean;
  onShowChannelMembers: () => void;
  onShowChannelSettings: () => void;
  isMobile?: boolean;
  onBack?: () => void;
}

export function MessagesHeader({
  channel,
  isChannelAdmin,
  onShowChannelMembers,
  onShowChannelSettings,
  isMobile = false,
  onBack,
}: MessagesHeaderProps) {
  const { t } = useTranslation();
  const isDirect = (channel.type ?? "").toLowerCase() === "direct";
  const memberCount = channel.channel_members?.length ?? 0;

  return (
    <div className="border-b px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isMobile && onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label={t("messages.backToChats")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {isDirect ? (
              (channel.name || "?").trim().charAt(0).toUpperCase()
            ) : (
              <Users className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{channel.name}</h3>
            <p className="truncate text-xs text-muted-foreground">
              {isDirect
                ? "Chat"
                : memberCount > 0
                  ? `${memberCount} people`
                  : "Group"}
            </p>
          </div>
        </div>

        {!isDirect && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onShowChannelMembers}
              aria-label={t("messages.groupMembers")}
            >
              <Users className="h-4 w-4" />
            </Button>
            {isChannelAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" aria-label={t("messages.groupOptions")}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onShowChannelSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t("messages.groupSettings")} </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
