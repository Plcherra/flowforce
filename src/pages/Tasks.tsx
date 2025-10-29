import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, User, Flag, MessageSquare, Search, Target } from 'lucide-react';
import { useTasks, type TaskWithRelations } from '@/hooks/useTasks';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskDetailsDialog } from '@/components/tasks/TaskDetailsDialog';
import { TaskNotifications } from '@/components/tasks/TaskNotifications';
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed';
import { RemindersPanel } from '@/components/reminders/RemindersPanel';
import { format, differenceInDays } from 'date-fns';
import { getTaskStatusBadgeClass, getTaskStatusLabel } from '@/constants/taskStatus';

const KNOWN_STATUSES = ['todo', 'in_progress', 'review', 'completed', 'cancelled'] as const;
type KnownTaskStatus = typeof KNOWN_STATUSES[number];
type TaskStatusFilter = KnownTaskStatus | 'all' | 'other';

const STATUS_LABELS: Record<KnownTaskStatus, string> = {
  todo: getTaskStatusLabel('todo'),
  in_progress: getTaskStatusLabel('in_progress'),
  review: getTaskStatusLabel('review'),
  completed: getTaskStatusLabel('completed'),
  cancelled: getTaskStatusLabel('cancelled'),
};

const KNOWN_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const;
type KnownTaskPriority = typeof KNOWN_PRIORITIES[number];
type TaskPriorityFilter = KnownTaskPriority | 'all' | 'other';

const PRIORITY_LABELS: Record<KnownTaskPriority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const normalizeStatus = (status: string | null | undefined): KnownTaskStatus | 'other' => {
  if (KNOWN_STATUSES.includes((status ?? '') as KnownTaskStatus)) {
    return status as KnownTaskStatus;
  }
  return 'other';
};

const normalizePriority = (priority: string | null | undefined): KnownTaskPriority | 'other' => {
  if (KNOWN_PRIORITIES.includes((priority ?? '') as KnownTaskPriority)) {
    return priority as KnownTaskPriority;
  }
  return 'other';
};

export default function Tasks() {
  const isMobile = useIsMobile();
  const { tasks, loading } = useTasks();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriorityFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!selectedTask) return;

    const updated = tasks.find((item) => item.id === selectedTask.id);

    if (!updated) {
      setSelectedTask(null);
      return;
    }

    if (updated !== selectedTask) {
      setSelectedTask(updated);
    }
  }, [tasks, selectedTask]);

  const now = new Date();

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  };

  const dueBadgeFor = (task: TaskWithRelations) => {
    if (!task?.due_date) return null;

    const dueDate = new Date(task.due_date);
    const normalizedStatus = normalizeStatus(task.status);

    if (normalizedStatus === 'completed') {
      return {
        label: 'Completed',
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      };
    }

    if (dueDate < now) {
      return {
        label: 'Overdue',
        className: 'bg-red-100 text-red-700 dark:bg-red-900/25 dark:text-red-300',
      };
    }

    const daysRemaining = differenceInDays(dueDate, now);

    if (daysRemaining <= 2) {
      return {
        label: 'Due Soon',
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/25 dark:text-orange-300',
      };
    }

    return {
      label: `Due ${format(dueDate, 'MMM dd')}`,
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    };
  };

  const tasksByStatus = useMemo(() => {
    return tasks.reduce<Record<string, number>>((acc, task) => {
      const key = task.status ?? 'other';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [tasks]);

  const otherStatusCount = useMemo(
    () => tasks.reduce((count, task) => (normalizeStatus(task.status) === 'other' ? count + 1 : count), 0),
    [tasks]
  );

  const activeCount = tasks.reduce((count, task) => {
    const status = normalizeStatus(task.status);
    return status === 'completed' || status === 'cancelled' ? count : count + 1;
  }, 0);

  const overdueCount = tasks.reduce((count, task) => {
    if (!task.due_date) return count;
    const dueDate = new Date(task.due_date);
    return dueDate < now && normalizeStatus(task.status) !== 'completed' ? count + 1 : count;
  }, 0);

  const dueSoonCount = tasks.reduce((count, task) => {
    if (!task.due_date) return count;
    const dueDate = new Date(task.due_date);
    if (dueDate < now) return count;
    return differenceInDays(dueDate, now) <= 7 ? count + 1 : count;
  }, 0);

  const otherPriorityCount = useMemo(
    () => tasks.reduce((count, task) => (normalizePriority(task.priority) === 'other' ? count + 1 : count), 0),
    [tasks]
  );

  const totalTasks = tasks.length;
  const filtersActive = statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm.trim().length > 0;

  const statusTabs = useMemo(() => {
    const tabs: Array<{ value: TaskStatusFilter; label: string; count: number }> = [
      { value: 'all', label: 'All', count: totalTasks },
    ];

    KNOWN_STATUSES.forEach((status) => {
      tabs.push({
        value: status,
        label: STATUS_LABELS[status],
        count: tasksByStatus[status] ?? 0,
      });
    });

    if (otherStatusCount > 0) {
      tabs.push({
        value: 'other',
        label: 'Other',
        count: otherStatusCount,
      });
    }

    return tabs;
  }, [totalTasks, tasksByStatus, otherStatusCount]);

  const priorityOptions = useMemo(() => {
    const opts: Array<{ value: TaskPriorityFilter; label: string }> = [
      { value: 'all', label: 'All priorities' },
    ];

    KNOWN_PRIORITIES.forEach((priority) => {
      opts.push({
        value: priority,
        label: PRIORITY_LABELS[priority],
      });
    });

    if (otherPriorityCount > 0) {
      opts.push({ value: 'other', label: 'Other' });
    }

    return opts;
  }, [otherPriorityCount]);

  const filteredTasks = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const normalizedStatus = normalizeStatus(task.status);
      const normalizedPriority = normalizePriority(task.priority);

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'other'
            ? normalizedStatus === 'other'
            : normalizedStatus === statusFilter;

      const matchesPriority =
        priorityFilter === 'all'
          ? true
          : priorityFilter === 'other'
            ? normalizedPriority === 'other'
            : normalizedPriority === priorityFilter;

      const matchesSearch = search
        ? `${task.title ?? ''} ${task.description ?? ''} ${task.goal?.title ?? ''} ${task.assigned_profile ? `${task.assigned_profile.first_name} ${task.assigned_profile.last_name}` : ''}`
            .toLowerCase()
            .includes(search)
        : true;

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tasks, statusFilter, priorityFilter, searchTerm]);

  const metrics = [
    {
      label: 'Total Tasks',
      value: totalTasks,
      helper: 'Everything you have access to',
      tone: 'neutral' as const,
    },
    {
      label: 'Active',
      value: activeCount,
      helper: 'Todo · In progress · Review',
      tone: 'neutral' as const,
    },
    {
      label: 'Due Soon',
      value: dueSoonCount,
      helper: 'Next 7 days',
      tone: 'neutral' as const,
    },
    {
      label: 'Overdue',
      value: overdueCount,
      helper: overdueCount ? 'Needs attention' : 'On track',
      tone: overdueCount ? 'alert' : 'neutral',
    },
  ];

  const handleResetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={isMobile ? 'space-y-4 px-4 pb-6' : 'space-y-6 max-w-7xl mx-auto px-6 pb-10'}>
      <div className={isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between gap-6'}>
        <div className="space-y-1">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track work across your projects with filters built for quick focus.
          </p>
        </div>
        <div className={isMobile ? 'flex items-center justify-between' : 'flex items-center gap-3'}>
          <TaskNotifications />
          <Button onClick={() => setShowCreateDialog(true)} size={isMobile ? "sm" : "default"}>
            <Plus className="mr-2 h-4 w-4" />
            {isMobile ? 'New' : 'Create Task'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className={
              metric.tone === 'alert'
                ? 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10'
                : 'border-border'
            }
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className={isMobile ? 'space-y-4 p-4' : 'space-y-4 p-5'}>
          <div className={isMobile ? 'space-y-3' : 'flex flex-wrap items-center justify-between gap-4'}>
            <div className={isMobile ? 'space-y-3' : 'flex items-center gap-3'}>
              <div className={isMobile ? 'w-full' : 'w-64'}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as TaskPriorityFilter)}>
                <SelectTrigger className={isMobile ? 'w-full' : 'w-48'}>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Clear filters
              </Button>
            )}
          </div>

          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as TaskStatusFilter)} className="w-full">
            <div className="-mx-1 overflow-x-auto px-1">
              <TabsList className="flex w-full min-w-max gap-2">
                {statusTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>{tab.label}</span>
                    <Badge variant="outline" className="border-transparent bg-muted px-2 py-0 text-xs font-medium">
                      {tab.count}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      <div className={isMobile ? 'space-y-4' : 'grid grid-cols-1 gap-6 lg:grid-cols-3'}>
        <div className={isMobile ? 'space-y-3' : 'space-y-4 lg:col-span-2'}>
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first task to get started with project management.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </Button>
              </CardContent>
            </Card>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No tasks match your filters</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Try adjusting the status, priority, or search term to see more tasks.
                </p>
                <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                  Reset filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredTasks.map((task) => {
              const dueBadge = dueBadgeFor(task);

              return (
                <Card
                  key={task.id}
                  className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
                  onClick={() => setSelectedTask(task)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        {task.description && (
                          <CardDescription className="line-clamp-2">
                            {task.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2.5 w-2.5 rounded-full ${getPriorityColor(task.priority)}`} />
                          <Badge className={getTaskStatusBadgeClass(task.status)}>
                            {getTaskStatusLabel(task.status)}
                          </Badge>
                        </div>
                        {dueBadge && (
                          <Badge variant="outline" className={`text-xs ${dueBadge.className}`}>
                            {dueBadge.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                      <div className="flex flex-wrap items-center gap-4">
                        {task.assigned_profile && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>
                              {task.assigned_profile.first_name} {task.assigned_profile.last_name}
                            </span>
                          </div>
                        )}
                        {task.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Flag className="h-4 w-4" />
                          <span className="capitalize">{task.priority ?? 'not set'}</span>
                        </div>
                        {task.goal && (
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            <span className="max-w-[160px] truncate">{task.goal.title}</span>
                            <Badge variant="outline" className="ml-1 px-1.5 text-[10px]">
                              {task.goal.progress ?? 0}%
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-xs">
                        Created {format(new Date(task.created_at), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        
        {!isMobile && (
          <div className="space-y-6 lg:sticky lg:top-24">
            <RemindersPanel />
            <TaskActivityFeed />
          </div>
        )}
      </div>
      
      {/* Mobile-only panels */}
      {isMobile && (
        <div className="space-y-4">
          <RemindersPanel />
          <TaskActivityFeed />
        </div>
      )}

      <CreateTaskDialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)} 
      />
      
      {selectedTask && (
        <TaskDetailsDialog 
          task={selectedTask}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdate={(updatedTask) => setSelectedTask(updatedTask)}
        />
      )}
    </div>
  );
}
