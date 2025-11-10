import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getTaskStatusLabel } from '@/constants/taskStatus';
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Flag,
  MessageSquare,
  Plus,
  User,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useTaskTimeline, type TaskActivity } from '@/features/tasks/hooks';
import { TimelineSkeleton } from '@/components/loading/TaskSkeletons';

interface TaskTimelineProps {
  taskId: string | null;
  open: boolean;
}

const activityIconMap: Record<string, JSX.Element> = {
  task_created: <Plus className="h-4 w-4 text-blue-500" />,
  task_assigned: <User className="h-4 w-4 text-green-500" />,
  task_status_changed: <Flag className="h-4 w-4 text-purple-500" />,
  task_completed: <CheckCircle className="h-4 w-4 text-emerald-600" />,
  task_commented: <MessageSquare className="h-4 w-4 text-indigo-500" />,
  task_updated: <Edit className="h-4 w-4 text-orange-500" />,
  task_due_changed: <Calendar className="h-4 w-4 text-red-500" />,
};

const getActivityIcon = (activityType: string) => {
  return activityIconMap[activityType] ?? <Clock className="h-4 w-4 text-gray-500" />;
};

const formatMetadata = (activity: TaskActivity) => {
  const metadata = (activity.metadata ?? {}) as Record<string, unknown>;

  if (activity.action_type === 'task_status_changed') {
    return `Status changed from "${getTaskStatusLabel(metadata.old_status as string)}" to "${getTaskStatusLabel(
      metadata.new_status as string
    )}"`;
  }

  if (activity.action_type === 'task_due_changed') {
    const oldDue = metadata.old_due_date ? format(new Date(metadata.old_due_date as string), 'PPP') : 'none';
    const newDue = metadata.new_due_date ? format(new Date(metadata.new_due_date as string), 'PPP') : 'none';
    return `Due date updated from ${oldDue} to ${newDue}`;
  }

  if (activity.action_type === 'task_assigned') {
    if (metadata.new_assignee && !metadata.old_assignee) {
      return 'Task assigned';
    }
    if (!metadata.new_assignee && metadata.old_assignee) {
      return 'Task unassigned';
    }
    return 'Task reassigned';
  }

  if (activity.action_type === 'task_completed') {
    return metadata.completed_at
      ? `Completed ${formatDistanceToNow(new Date(metadata.completed_at as string), { addSuffix: true })}`
      : 'Task marked as done';
  }

  if (activity.action_type === 'task_created') {
    return `Priority set to ${(metadata.priority as string) ?? 'medium'}`;
  }

  return null;
};

export function TaskTimeline({ taskId, open }: TaskTimelineProps) {
  const { activities, loading } = useTaskTimeline(taskId, open);
  const hasTimeline = activities.length > 0;

  const timelineItems = useMemo(() => {
    return activities.map((activity) => ({
      id: activity.id,
      icon: getActivityIcon(activity.action_type),
      description: activity.description,
      createdAt: activity.created_at,
      metadata: formatMetadata(activity),
    }));
  }, [activities]);

  if (!taskId) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Timeline</h3>
        {hasTimeline && <Badge variant="secondary">{activities.length} events</Badge>}
      </div>
      <div className="border rounded-md bg-muted/40">
        <ScrollArea className="max-h-72">
          {loading ? (
            <TimelineSkeleton />
          ) : !hasTimeline ? (
            <div className="py-6 px-4 text-sm text-muted-foreground">
              Activity will appear here as you work on this task.
            </div>
          ) : (
            <ol className="relative border-l border-border/70 px-4 py-4 space-y-6">
              {timelineItems.map((item) => (
                <li key={item.id} className="ml-4">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-border">
                    {item.icon}
                  </span>
                  <div className="mb-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </div>
                  <p className="text-sm font-medium leading-snug">{item.description}</p>
                  {item.metadata && (
                    <p className="mt-1 text-xs text-muted-foreground/90">{item.metadata}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
