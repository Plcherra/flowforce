import { useCallback, useState } from 'react';
import { useMessageChannels } from './useMessageChannels';
import { useChannelMessages } from './useChannelMessages';
import { useMessageOperations } from './useMessageOperations';

export function useMessages() {
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  
  const {
    channels,
    loading: channelsLoading,
    createChannel,
    joinChannel,
    updateLastRead,
    refetchChannels,
    deleteChannel,
    error: channelsError,
    clearError: clearChannelsError,
  } = useMessageChannels();

  const {
    messages,
    loading: messagesLoading,
    refetchMessages,
    error: messagesError,
    clearError: clearMessagesError,
  } = useChannelMessages(currentChannelId);

  const {
    sendMessage,
    searchMessages,
    deleteMessage,
  } = useMessageOperations();

  const clearError = useCallback(() => {
    clearChannelsError();
    clearMessagesError();
  }, [clearChannelsError, clearMessagesError]);

  return {
    // Channel state
    channels,
    currentChannelId,
    setCurrentChannelId,
    
    // Messages state
    messages,
    loading: channelsLoading || messagesLoading,
    
    // Channel operations
    createChannel,
    joinChannel,
    updateLastRead,
    refetchChannels,
    deleteChannel,
    
    // Message operations
    sendMessage,
    searchMessages,
    refetchMessages,
    deleteMessage,

    // Error state
    error: channelsError ?? messagesError ?? null,
    clearError,
  };
}
