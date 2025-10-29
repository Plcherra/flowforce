import React from 'react';

import { MessagesShell } from '@/features/messages/components/MessagesShell';
import { useMessagesViewModel } from '@/features/messages/hooks/useMessagesViewModel';

export default function Messages() {
  const viewModel = useMessagesViewModel();
  return <MessagesShell viewModel={viewModel} />;
}
