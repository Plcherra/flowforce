import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface TaskLike {
  id: string;
}

export interface SelectionHandlers {
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

export function useTaskSelection<T extends TaskLike>(tasks: T[]) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedTaskId && !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, tasks]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  const clearHighlightTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const openTask = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      setHighlightedTaskId(taskId);
      clearHighlightTimeout();
      timeoutRef.current = setTimeout(() => {
        setHighlightedTaskId((current) => (current === taskId ? null : current));
      }, 2500);
    },
    [clearHighlightTimeout]
  );

  const closeTask = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const getSelectionHandlers = useCallback(
    (taskId: string): SelectionHandlers => ({
      onClick: () => openTask(taskId),
      onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openTask(taskId);
        }
      },
    }),
    [openTask]
  );

  const handleNotificationNavigate = useCallback(
    (taskId: string) => {
      const targetTask = tasks.find((task) => task.id === taskId);
      if (!targetTask) return;
      openTask(taskId);
      requestAnimationFrame(() => {
        const element = document.getElementById(`task-card-${taskId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    [openTask, tasks]
  );

  return {
    selectedTaskId,
    setSelectedTaskId,
    selectedTask,
    highlightedTaskId,
    openTask,
    closeTask,
    handleNotificationNavigate,
    getSelectionHandlers,
  };
}
