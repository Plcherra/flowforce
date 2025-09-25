import { useState } from 'react';
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
    refetchChannels
  } = useMessageChannels();

  const {
    messages,
    loading: messagesLoading,
    refetchMessages
  } = useChannelMessages(currentChannelId);

  const {
    sendMessage,
    searchMessages
  } = useMessageOperations();

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
    
    // Message operations
    sendMessage,
    searchMessages,
    refetchMessages
  };
}