import { useTranslation } from "react-i18next";
import React from "react";
import { MessagesHeader } from "./MessagesHeader";
import { MessageInput } from "@/features/messages/components/conversations/MessageInput";
import { MessagesList } from "@/features/messages/components/conversations/MessagesList";
import type {
  MessageChannel,
  Message,
  ThreadMessage,
  MessageAttachment,
} from "@/types/messages";

interface MessagesMainAreaProps {
  channel: MessageChannel | null;
  messages: Message[];
  messagesLoading: boolean;
  isChannelAdmin: boolean;
  onShowChannelMembers: () => void;
  onShowChannelSettings: () => void;
  onSendMessage: (
    content: string,
    attachments: MessageAttachment[],
  ) => Promise<void>;
  onThreadMessage: (message: ThreadMessage) => void;
  isMobile?: boolean;
  onBack?: () => void;
  currentUserId: string | null;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onUpdateMessage?: (messageId: string, content: string) => Promise<void>;
}

export function MessagesMainArea({
  channel,
  messages,
  messagesLoading,
  isChannelAdmin,
  onShowChannelMembers,
  onShowChannelSettings,
  onSendMessage,
  onThreadMessage,
  isMobile = false,
  onBack,
  currentUserId,
  onDeleteMessage,
  onUpdateMessage,
}: MessagesMainAreaProps) {
  const { t } = useTranslation();
  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <div>
          <h3 className="mb-2 text-lg font-semibold">{t("messages.noConversationOpen")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("messages.useNewChatAndChooseSomeone")} </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MessagesHeader
        channel={channel}
        isChannelAdmin={isChannelAdmin}
        onShowChannelMembers={onShowChannelMembers}
        onShowChannelSettings={onShowChannelSettings}
        isMobile={isMobile}
        onBack={onBack}
      />

      <MessagesList
        messages={messages}
        loading={messagesLoading}
        onThreadMessage={onThreadMessage}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        onUpdateMessage={onUpdateMessage}
        channelMembers={channel?.channel_members ?? []}
      />

      <MessageInput
        channelId={channel.id}
        channelName={channel.name}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}
