import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Award, Plus, CheckCircle, Circle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGoals, type Goal } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GoalDetailsDialogProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (goal: Goal) => void;
}

export function GoalDetailsDialog({ goal, open, onOpenChange, onEdit }: GoalDetailsDialogProps) {
  const { updateGoal, linkTaskToGoal, calculateGoalProgress } = useGoals();
  const { createTask } = useTasks();
  const { user } = useAuth();
  const { toast } = useToast();
  type GoalTask = NonNullable<Goal['goal_tasks']>[number];
  type GoalParticipant = NonNullable<Goal['participants']>[number];

  const [linkedTasks, setLinkedTasks] = useState<GoalTask[]>([]);
  const [taskDescription, setTaskDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!goal) {
      setLinkedTasks([]);
      return;
    }
    setLinkedTasks(goal.goal_tasks ?? []);
  }, [goal]);

  const createTasksFromDescription = async () => {
    if (!goal || !taskDescription.trim()) return;

    setLoading(true);
    try {
      const ownerParticipant: GoalParticipant | undefined = goal.participants?.find(
        participant => participant.role === 'owner'
      );
      const ownerId = ownerParticipant?.user_id ?? user?.id ?? null;

      const lines = taskDescription.split('\n').filter(line => line.trim());
      const taskLines = lines.filter(line => /^\d+\.\s/.test(line.trim()));
      let updatedTasks = [...linkedTasks];
      
      if (taskLines.length === 0) {
        const { data: taskData } = await createTask({
          title: taskDescription.trim(),
          description: `Created from goal: ${goal.title}`,
          status: 'todo',
          priority: 'medium',
          created_by: user!.id,
          assigned_to: ownerId,
          due_date: goal.target_completion_date,
          estimated_hours: null,
          department_id: null,
          attachments: [],
          workflow_id: null,
          actual_hours: null,
          parent_task_id: null,
          tags: [],
          goal_id: goal.id
        });

        if (taskData) {
          const { data: linkedTask } = await linkTaskToGoal(goal.id, taskData.id);
          if (linkedTask) {
            updatedTasks = [
              ...updatedTasks.filter((item) => item.task_id !== linkedTask.task_id),
              linkedTask as GoalTask,
            ];
          }
        }
      } else {
        for (const line of taskLines) {
          const taskTitle = line.replace(/^\d+\.\s*/, '').trim();
          if (taskTitle) {
            const { data: taskData } = await createTask({
              title: taskTitle,
              description: `Created from goal: ${goal.title}`,
              status: 'todo',
              priority: 'medium',
              created_by: user!.id,
              assigned_to: ownerId,
              due_date: goal.target_completion_date,
              estimated_hours: null,
              department_id: null,
              attachments: [],
              workflow_id: null,
              actual_hours: null,
              parent_task_id: null,
              tags: [],
              goal_id: goal.id
            });

            if (taskData) {
              const { data: linkedTask } = await linkTaskToGoal(goal.id, taskData.id);
              if (linkedTask) {
                updatedTasks = [
                  ...updatedTasks.filter((item) => item.task_id !== linkedTask.task_id),
                  linkedTask as GoalTask,
                ];
              }
            }
          }
        }
      }

      setTaskDescription('');
      setLinkedTasks(updatedTasks);
      await updateGoalProgress(updatedTasks);
      
      toast({
        title: "Success",
        description: `Created ${taskLines.length || 1} tasks and linked to goal`
      });
    } catch (error) {
      console.error('Error creating tasks:', error);
      toast({
        title: "Error",
        description: "Failed to create tasks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGoalProgress = async (tasks: GoalTask[] = linkedTasks) => {
    if (!goal) return;

    try {
      const progress = calculateGoalProgress({
        ...goal,
        goal_tasks: tasks
      });

      const updates: Partial<Goal> = { progress };
      
      if (progress === 100 && goal.status !== 'completed') {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
      }

      await updateGoal(goal.id, updates);
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning-foreground border-warning/20';
      case 'low': return 'bg-success/10 text-success-foreground border-success/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success-foreground border-success/20';
      case 'active': return 'bg-primary/10 text-primary-foreground border-primary/20';
      case 'draft': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (!goal) return null;

  const ownerParticipant = goal.participants?.find(participant => participant.role === 'owner');
  const ownerProfile = ownerParticipant?.profile;
  const ownerName = ownerProfile
    ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
    : ownerParticipant
      ? 'Owner assigned'
      : 'Owner not assigned';
  const ownerInitials = ownerProfile
    ? `${ownerProfile.first_name.charAt(0)}${ownerProfile.last_name.charAt(0)}`
    : 'NA';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{goal.title}</DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(goal)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
          <DialogDescription>
            View goal details, track progress, and manage linked tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Goal Overview */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge className={getPriorityColor(goal.priority)}>
                {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
              </Badge>
              <Badge className={getStatusColor(goal.status)}>
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </Badge>
            </div>

            {goal.description && (
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              {goal.target_completion_date && (
                <div className="flex items-center text-sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  <span>Due: {format(new Date(goal.target_completion_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              
              {goal.reward_type && (
                <div className="flex items-center text-sm">
                  <Award className="h-4 w-4 mr-2" />
                  <span>Reward: {goal.reward_type.replace('_', ' ')}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-center space-x-3">
              <Avatar className="h-10 w-10 border border-background">
                {ownerProfile?.avatar_url ? (
                  <AvatarImage src={ownerProfile.avatar_url} alt={ownerName} />
                ) : (
                  <AvatarFallback>{ownerInitials}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Goal Owner</div>
                <div className="text-sm font-semibold text-foreground">{ownerName}</div>
                {ownerParticipant && (
                  <div className="text-xs text-muted-foreground">Role: {ownerParticipant.role}</div>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
          </div>

          <Separator />

          {/* Linked Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Linked Tasks ({linkedTasks.length})</h3>
              <div className="text-sm text-muted-foreground">
                {linkedTasks.filter(lt => lt.task?.status === 'completed').length} completed
              </div>
            </div>

            {linkedTasks.length > 0 ? (
              <div className="space-y-2">
                {linkedTasks.map((linkedTask) => (
                  <Card key={linkedTask.id} className="p-3">
                    <div className="flex items-center space-x-3">
                     {linkedTask.task?.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{linkedTask.task?.title}</div>
                        <div className="text-sm text-muted-foreground">
                          Status: {linkedTask.task?.status} • Priority: {linkedTask.task?.priority}
                        </div>
                      </div>
                      <Badge variant="secondary">Weight: {linkedTask.weight}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No tasks linked to this goal yet
              </div>
            )}
          </div>

          <Separator />

          {/* Create Tasks */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Create Tasks</h3>
            <div className="space-y-2">
              <Label htmlFor="tasks">Task Description</Label>
              <Textarea
                id="tasks"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Enter task description or numbered list:&#10;1. Complete user interface&#10;2. Implement backend API&#10;3. Test functionality"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Enter a single task description or a numbered list (1. Task one, 2. Task two, etc.)
              </p>
            </div>
            
            <Button 
              onClick={createTasksFromDescription}
              disabled={!taskDescription.trim() || loading}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {loading ? 'Creating Tasks...' : 'Create & Link Tasks'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
