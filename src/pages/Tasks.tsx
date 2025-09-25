import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, User, Flag, MessageSquare, Bell } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useProfile } from '@/hooks/useProfile';
import { useIsMobile } from '@/hooks/use-mobile';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { TaskDetailsDialog } from '@/components/tasks/TaskDetailsDialog';
import { TaskNotifications } from '@/components/tasks/TaskNotifications';
import { TaskActivityFeed } from '@/components/tasks/TaskActivityFeed';
import { RemindersPanel } from '@/components/reminders/RemindersPanel';
import { format } from 'date-fns';

export default function Tasks() {
  const isMobile = useIsMobile();
  const { tasks, loading } = useTasks();
  const { profile } = useProfile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'space-y-4' : 'space-y-6'}`}>
      <div className={`${isMobile ? 'flex flex-col space-y-3 px-4 py-3' : 'flex justify-between items-center'}`}>
        <div>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your tasks and projects
          </p>
        </div>
        <div className={`${isMobile ? 'flex items-center justify-between' : 'flex items-center space-x-3'}`}>
          <TaskNotifications />
          <Button onClick={() => setShowCreateDialog(true)} size={isMobile ? "sm" : "default"}>
            <Plus className="mr-2 h-4 w-4" />
            {isMobile ? 'New' : 'Create Task'}
          </Button>
        </div>
      </div>

      <div className={`${isMobile ? 'px-4 space-y-4' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}`}>
        <div className={`${isMobile ? 'space-y-3' : 'lg:col-span-2 space-y-4'}`}>
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
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
          ) : (
            tasks.map((task) => (
              <Card 
                key={task.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTask(task)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      {task.description && (
                        <CardDescription className="line-clamp-2">
                          {task.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      {task.assigned_profile && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>
                            {task.assigned_profile.first_name} {task.assigned_profile.last_name}
                          </span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{format(new Date(task.due_date), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Flag className="h-4 w-4" />
                        <span className="capitalize">{task.priority}</span>
                      </div>
                    </div>
                    <div className="text-xs">
                      Created {format(new Date(task.created_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        {!isMobile && (
          <div className="space-y-6">
            <RemindersPanel />
            <TaskActivityFeed />
          </div>
        )}
      </div>
      
      {/* Mobile-only panels at bottom */}
      {isMobile && (
        <div className="px-4 space-y-4">
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
        />
      )}
    </div>
  );
}