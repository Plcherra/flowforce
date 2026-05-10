import React, { useMemo } from "react";
import { AnimatedChannelWizard } from "../modals/AnimatedChannelWizard";
import { ChannelMembers } from "../modals/ChannelMembers";
import { ChannelSettings } from "../modals/ChannelSettings";
import { DirectMessageDialog } from "../modals/DirectMessageDialog";
import { MessageSearch } from "../modals/MessageSearch";
import { ThreadedMessageView } from "@/features/messages/components/ThreadedMessageView";
import { VideoCallDialog } from "@/features/messages/components/VideoCallDialog";
import { CreateAnnouncement } from "@/features/messages/components/announcements/CreateAnnouncement";
import type { MessagesViewModel } from "../../hooks/useMessagesViewModel";

interface MessagesPortalContentProps {
  vm: MessagesViewModel;
}

export function MessagesPortalContent({ vm }: MessagesPortalContentProps) {
  const videoCallParticipants = useMemo(
    () => [
      { id: "1", name: "John Doe" },
      { id: "2", name: "Jane Smith" },
      { id: "3", name: "Mike Johnson" },
    ],
    [],
  );

  return (
    <>
      {vm.showCreateDialog && (
        <AnimatedChannelWizard
          open={vm.showCreateDialog}
          onClose={() => vm.setShowCreateDialog(false)}
          onChannelCreated={(channelId) => {
            // Auto-select the newly created channel
            if (channelId) {
              vm.setCurrentChannelId(channelId);
            }
            vm.setShowCreateDialog(false);
          }}
        />
      )}

      {vm.showDirectMessageDialog && (
        <DirectMessageDialog
          open={vm.showDirectMessageDialog}
          onClose={() => vm.setShowDirectMessageDialog(false)}
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

      {vm.showCreateAnnouncement && (
        <CreateAnnouncement
          open={vm.showCreateAnnouncement}
          onClose={() => vm.setShowCreateAnnouncement(false)}
        />
      )}

      {vm.isVideoCallOpen && vm.currentChannel && vm.callType && (
        <VideoCallDialog
          isOpen={vm.isVideoCallOpen}
          onClose={vm.handleCloseVideoCall}
          channelName={vm.currentChannel.name}
          participants={videoCallParticipants}
          callType={vm.callType}
        />
      )}

      {vm.isThreadOpen && vm.threadMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="h-[600px] w-full max-w-2xl rounded-2xl bg-background shadow-xl">
            <ThreadedMessageView
              message={vm.threadMessage}
              allReplies={[]}
              onClose={vm.closeThread}
              onSendReply={() => {
                // placeholder - wired up later.
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
