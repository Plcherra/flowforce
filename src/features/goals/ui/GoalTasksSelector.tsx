import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTasks, type TaskWithRelations, labelFor } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { linkTaskToGoal, unlinkTask } from '@/features/goals/services/goalTaskLinks';

const WEIGHT_OPTIONS = [1, 2, 3, 4, 5];

export type TaskWeightMap = Record<string, number>;

interface GoalTasksSelectorProps {
  goalId?: string | null;
  selectedWeights: TaskWeightMap;
  onSelectionChange: (taskId: string, weight: number | null) => void;
}

export function GoalTasksSelector({ goalId, selectedWeights, onSelectionChange }: GoalTasksSelectorProps) {
  const { tasks, loading } = useTasks();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) {
      return tasks;
    }

    const normalized = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const haystack = `${task.title ?? ''} ${task.description ?? ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [search, tasks]);

  const toggleTask = async (task: TaskWithRelations, nextChecked: boolean) => {
    const taskId = task.id;
    const previousWeight = selectedWeights[taskId] ?? 1;

    onSelectionChange(taskId, nextChecked ? previousWeight : null);

    if (!goalId) {
      return;
    }

    setPendingTaskId(taskId);

    try {
      if (nextChecked) {
        await linkTaskToGoal(goalId, taskId, previousWeight);
      } else {
        await unlinkTask(goalId, taskId);
      }
    } catch (error) {
      onSelectionChange(taskId, nextChecked ? null : previousWeight);
      toast({
        title: 'Unable to update goal tasks',
        description: error instanceof Error ? error.message : 'Try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setPendingTaskId((current) => (current === taskId ? null : current));
    }
  };

  const changeWeight = async (taskId: string, nextWeight: number) => {
    const currentWeight = selectedWeights[taskId] ?? 1;
    if (nextWeight === currentWeight) {
      return;
    }

    onSelectionChange(taskId, nextWeight);

    if (!goalId) {
      return;
    }

    setPendingTaskId(taskId);

    try {
      await linkTaskToGoal(goalId, taskId, nextWeight);
    } catch (error) {
      onSelectionChange(taskId, currentWeight);
      toast({
        title: 'Unable to update task weight',
        description: error instanceof Error ? error.message : 'Try again shortly.',
        variant: 'destructive',
      });
    } finally {
      setPendingTaskId((current) => (current === taskId ? null : current));
    }
  };

  const selectedCount = Object.keys(selectedWeights).length;

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-semibold text-foreground">Linked tasks</Label>
          <p className="text-xs text-muted-foreground">
            Select tasks that contribute to this goal and assign their weight.
          </p>
        </div>
        <Badge variant="outline">{selectedCount} selected</Badge>
      </div>

      <Input
        placeholder="Search tasks"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <ScrollArea className="h-64 rounded-md border border-border/60 bg-background shadow-inner">
        {loading ? (
          <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            {search.trim() ? 'No tasks match your search.' : 'No tasks available yet.'}
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filteredTasks.map((task) => {
              const isSelected = task.id in selectedWeights;
              const weight = selectedWeights[task.id] ?? 1;
              const disabled = pendingTaskId === task.id;

              return (
                <li
                  key={task.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 transition',
                    isSelected ? 'bg-muted/40' : 'bg-background',
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    disabled={disabled}
                    onCheckedChange={(checked) => {
                      const nextChecked = Boolean(checked);
                      void toggleTask(task, nextChecked);
                    }}
                  />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 truncate font-medium text-foreground">
                        {task.title ?? 'Untitled task'}
                      </p>
                    <Badge variant="secondary" className="text-xs">
                        {labelFor(task.status)}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="truncate text-xs text-muted-foreground">{task.description}</p>
                    )}
                  </div>
                  <Select
                    value={String(weight)}
                    onValueChange={(value) => {
                      const parsed = Number(value);
                      if (!Number.isNaN(parsed)) {
                        void changeWeight(task.id, parsed);
                      }
                    }}
                    disabled={!isSelected || disabled}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue placeholder="Weight" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          Weight {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {disabled && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {!goalId && (
        <p className="text-xs text-muted-foreground">
          Task links are saved automatically once the goal has been created.
        </p>
      )}
    </div>
  );
}
