/* @vitest-environment jsdom */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useAIChat } from '@/features/ai/hooks/useAIChat';

const invokeMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

describe('useAIChat', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('sends chat message with the provided context and returns insights', async () => {
    invokeMock.mockResolvedValue({
      data: { insights: 'Hello there' },
      error: null,
    });

    const { result } = renderHook(() => useAIChat({ context: 'dashboard' }));

    await act(async () => {
      const response = await result.current.sendChatMessage('status?');
      expect(response).toBe('Hello there');
    });

    expect(invokeMock).toHaveBeenCalledWith('ai-insights', {
      body: {
        type: 'chat',
        context: 'dashboard',
        query: 'status?',
      },
    });
  });

  it('throws when the Supabase function returns an error', async () => {
    const failure = new Error('network down');
    invokeMock.mockResolvedValueOnce({
      data: null,
      error: failure,
    });

    const { result } = renderHook(() => useAIChat());

    await expect(result.current.sendChatMessage('hello')).rejects.toThrow('network down');
  });
});
