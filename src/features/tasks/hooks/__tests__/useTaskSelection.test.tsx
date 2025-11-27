/* @vitest-environment jsdom */
// @ts-nocheck
import { renderHook, act } from '@testing-library/react';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import type React from 'react';

import { useTaskSelection } from '@/features/tasks/hooks';

const tasks = [
  { id: 'task-1', title: 'First Task' },
  { id: 'task-2', title: 'Second Task' },
];

describe('useTaskSelection', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterAll(() => {
    rafSpy.mockRestore();
  });

  it('opens and closes tasks', () => {
    const { result } = renderHook(({ items }) => useTaskSelection(items), {
      initialProps: { items: tasks },
    });

    act(() => {
      result.current.openTask('task-1');
    });
    expect(result.current.selectedTask?.id).toBe('task-1');

    act(() => {
      result.current.closeTask();
    });
    expect(result.current.selectedTask).toBeNull();
  });

  it('provides keyboard handlers that open tasks', () => {
    const { result } = renderHook(({ items }) => useTaskSelection(items), {
      initialProps: { items: tasks },
    });

    const handlers = result.current.getSelectionHandlers('task-2');

    act(() => {
      handlers.onKeyDown({ key: 'Enter', preventDefault: () => undefined } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.selectedTask?.id).toBe('task-2');
  });

  it('handles notification navigation', () => {
    const scrollIntoView = vi.fn();
    vi.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as unknown as HTMLElement);

    const { result } = renderHook(({ items }) => useTaskSelection(items), {
      initialProps: { items: tasks },
    });

    act(() => {
      result.current.handleNotificationNavigate('task-1');
    });

    expect(result.current.selectedTask?.id).toBe('task-1');
    expect(scrollIntoView).toHaveBeenCalled();

    (document.getElementById as unknown as vi.SpyInstance).mockRestore();
  });
});
