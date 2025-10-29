
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateReminderDialog } from '@/components/reminders/CreateReminderDialog';
import { useTaskFormOptions } from '@/hooks/useTaskFormOptions';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateTaskDialog({ open, onClose }: CreateTaskDialogProps) {
  const { createTask } = useTasks();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    assignees,
    goals,
    loading: optionsLoading,
    error: optionsError
  } = useTaskFormOptions(open);
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [createReminder, setCreateReminder] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimated_hours: '',
    assigned_to: '',
    goal_id: ''
  });

  useEffect(() => {
    if (!optionsError) return;
    toast({
      title: 'Unable to load options',
      description: 'Some fields may be unavailable right now. Please try again later.',
      variant: 'destructive',
    });
  }, [optionsError, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        status: 'todo' as const,
        priority: formData.priority as any,
        created_by: user.id,
        due_date: dueDate?.toISOString() || null,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
        assigned_to: formData.assigned_to ? formData.assigned_to : null,
        department_id: null,
        tags: null,
        attachments: [],
        parent_task_id: null,
        workflow_id: null,
        actual_hours: null,
        goal_id: formData.goal_id ? formData.goal_id : null
      };

      const { data: newTask, error } = await createTask(taskData);
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create task. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Task created successfully.',
        });
        
        // If user wants to create reminder, show reminder dialog
        if (createReminder && newTask) {
          setCreatedTaskId(newTask.id);
          setShowReminderDialog(true);
        }
        
        onClose();
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          estimated_hours: '',
          assigned_to: '',
          goal_id: ''
        });
        setDueDate(undefined);
        setCreateReminder(false);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Create a new task to track your work and collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter task description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                placeholder="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Assign To</Label>
              <Select
                value={formData.assigned_to || 'none'}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, assigned_to: value === 'none' ? '' : value }))
                }
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={optionsLoading ? 'Loading team members…' : 'Select team member'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.first_name} {assignee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal_id">Linked Goal</Label>
              <Select
                value={formData.goal_id || 'none'}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, goal_id: value === 'none' ? '' : value }))
                }
                disabled={optionsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      optionsLoading
                        ? 'Loading goals…'
                        : goals.length === 0
                          ? 'No goals available'
                          : 'Select goal (optional)'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No goal</SelectItem>
                  {goals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reminder Option */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="create-reminder"
              checked={createReminder}
              onCheckedChange={(checked) => setCreateReminder(checked === true)}
            />
            <Label htmlFor="create-reminder" className="text-sm">
              Create reminder for this task
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* Reminder Dialog */}
      {showReminderDialog && createdTaskId && (
        <CreateReminderDialog 
          open={showReminderDialog}
          onOpenChange={setShowReminderDialog}
          taskId={createdTaskId}
        />
      )}
    </Dialog>
  );
}
