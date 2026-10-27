import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AnimatedChannelWizard } from "../modals/AnimatedChannelWizard";
import { ChannelMembers } from "../modals/ChannelMembers";
import { ChannelSettings } from "../modals/ChannelSettings";
import { MessageSearch } from "../modals/MessageSearch";
import { ThreadedMessageView } from "@/features/messages/components/ThreadedMessageView";
import {
  collectThreadReplies,
  messageToThreadMessage,
  replyParentId,
} from "@/features/messages/threadReplies";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesPortalContentProps {
  vm: MessagesViewModel;
}

export function MessagesPortalContent({ vm }: MessagesPortalContentProps) {
  const { t } = useTranslation();
  const closeThread = vm.closeThread;
  const fallbackName = t("messages.teamMember");
  const threadRoot = vm.threadMessage;
  const threadMessages = useMemo(() => {
    if (!threadRoot) return [];
    return vm.messages.map((message) =>
      messageToThreadMessage(message, fallbackName),
    );
  }, [fallbackName, threadRoot, vm.messages]);
  const threadReplies = useMemo(() => {
    if (!threadRoot) return [];
    const sources = vm.messages.map((message) => ({
      id: message.id,
      replyToId: replyParentId(message),
      createdAt: new Date(message.created_at ?? 0).getTime(),
    }));
    const replyIds = new Set(
      collectThreadReplies(sources, threadRoot.id).map((reply) => reply.id),
    );
    return threadMessages.filter((message) => replyIds.has(message.id));
  }, [threadMessages, threadRoot, vm.messages]);
  const liveRoot = useMemo(() => {
    if (!threadRoot) return null;
    return (
      threadMessages.find((message) => message.id === threadRoot.id) ?? threadRoot
    );
  }, [threadMessages, threadRoot]);

  useEffect(() => {
    if (!liveRoot) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeThread();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeThread, liveRoot]);

  return (
    <>
      {vm.showCreateDialog && (
        <AnimatedChannelWizard
          open={vm.showCreateDialog}
          onClose={() => vm.setShowCreateDialog(false)}
          onChannelCreated={(channelId) => {
            if (channelId) {
              vm.setCurrentChannelId(channelId);
            }
            vm.setShowCreateDialog(false);
          }}
        />
      )}

      {vm.showChannelMembers && vm.currentChannel && (
        <ChannelMembers
          open={vm.showChannelMembers}
          onClose={() => vm.setShowChannelMembers(false)}
          channelId={vm.currentChannel.id}
          channelName={vm.currentChannel.name}
        />
      )}

      {vm.showChannelSettings && vm.currentChannel && (
        <ChannelSettings
          open={vm.showChannelSettings}
          onClose={() => vm.setShowChannelSettings(false)}
          channel={vm.currentChannel}
          onChannelUpdated={vm.handleChannelUpdated}
          onDeleteChannel={vm.handleDeleteChannel}
        />
      )}

      {vm.showMessageSearch && (
        <MessageSearch
          open={vm.showMessageSearch}
          onClose={() => vm.setShowMessageSearch(false)}
        />
      )}

      {vm.isThreadOpen && liveRoot && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-0 sm:items-center sm:p-4 dark:bg-background/50"
          onClick={closeThread}
        >
          <div
            className="h-[100dvh] w-full bg-background sm:h-[min(40rem,calc(100dvh-2rem))] sm:max-w-2xl sm:rounded-2xl sm:shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <ThreadedMessageView
              message={liveRoot}
              allReplies={threadReplies}
              onClose={vm.closeThread}
              onSendReply={vm.handleSendThreadReply}
            />
          </div>
        </div>
      )}
    </>
  );
}
