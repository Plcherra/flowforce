import React from 'react';

import { MessagesShell } from '@/features/messages/components/layout';
import { useMessagesViewModel } from '@/features/messages/hooks/useMessagesViewModel';

export default function Messages() {
  const viewModel = useMessagesViewModel();
  return <MessagesShell viewModel={viewModel} />;
}
