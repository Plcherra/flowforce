import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
  onStartVideoCall: (type: "video" | "audio") => void;
  onScheduleMessage: (content: string, scheduledFor: Date) => void;
  onSendMessage: (
    content: string,
    attachments: MessageAttachment[],
  ) => Promise<void>;
  onThreadMessage: (message: ThreadMessage) => void;
  onShowCreateDialog: () => void;
  isMobile?: boolean;
  showMobileSidebar?: boolean;
  onToggleMobileSidebar?: () => void;
  canShowAvailability?: boolean;
  available?: boolean;
  onToggleAvailable?: (v: boolean) => Promise<void> | void;
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
  onStartVideoCall,
  onScheduleMessage,
  onSendMessage,
  onThreadMessage,
  onShowCreateDialog,
  isMobile = false,
  showMobileSidebar = false,
  onToggleMobileSidebar,
  canShowAvailability,
  available,
  onToggleAvailable,
  currentUserId,
  onDeleteMessage,
  onUpdateMessage,
}: MessagesMainAreaProps) {
  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Welcome to Messages</h3>
          <p className="text-muted-foreground mb-4">
            Select a channel to start messaging or create a new one.
          </p>
          <Button onClick={onShowCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Channel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <MessagesHeader
        channel={channel}
        isChannelAdmin={isChannelAdmin}
        onShowChannelMembers={onShowChannelMembers}
        onShowChannelSettings={onShowChannelSettings}
        onStartVideoCall={onStartVideoCall}
        onScheduleMessage={onScheduleMessage}
        isMobile={isMobile}
        showMobileSidebar={showMobileSidebar}
        onToggleMobileSidebar={onToggleMobileSidebar}
        canShowAvailability={canShowAvailability}
        available={available}
        onToggleAvailable={onToggleAvailable}
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
